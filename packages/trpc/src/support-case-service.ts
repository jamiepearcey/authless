import { Prisma, PrismaClient } from "@db/base";
import crypto from "crypto";

export class SupportCaseService {
  constructor(private db: PrismaClient) {}

  /**
   * Automatically create a support case from a contact message
   */
  async createCaseFromContactMessage(contactMessageId: string): Promise<string> {
    try {
      // Get the contact message with all related data
      const contactMessage = await this.db.contactMessage.findUnique({
        where: { id: contactMessageId },
        include: {
          reasons: {
            include: {
              contactReason: true,
            }
          },
          replies: true,
          supportCase: true, // Check if already has a case
        }
      });

      if (!contactMessage) {
        throw new Error("Contact message not found");
      }

      if (contactMessage.supportCase) {
        return contactMessage.supportCase.id; // Already has a case
      }

      // Determine the best support option based on contact reasons
      const supportOption = await this.determineSupportOption(
        contactMessage.tenantId,
        contactMessage.reasons.map(r => r.contactReason.key)
      );

      // Generate threading key for message continuity
      const threadingKey = this.generateThreadingKey({
        source: "contact_form",
        identifier: contactMessage.email + contactMessage.subject,
        fallback: contactMessage.id,
      });

      // Create the support case
      const supportCase = await this.db.supportCase.create({
        data: {
          contactMessageId: contactMessage.id,
          caseNumber: crypto.randomUUID(),
          title: contactMessage.subject,
          description: contactMessage.message,
          status: "OPEN",
          priority: this.mapContactPriorityToCasePriority(contactMessage.priority),
          tenantId: contactMessage.tenantId,
          supportOptionId: supportOption?.id,
          threadingKey,
          source: "CONTACT_FORM",
          sourceMetadata: {
            contactReasons: contactMessage.reasons.map(r => ({
              key: r.contactReason.key,
              label: r.contactReason.label,
            })),
            originalContactMessage: {
              name: contactMessage.name,
              email: contactMessage.email,
            }
          },
        },
      });

      // Convert existing replies to case messages
      for (const reply of contactMessage.replies) {
        await this.db.caseMessage.create({
          data: {
            caseId: supportCase.id,
            contactReplyId: reply.id,
            direction: reply.isFromUser ? "INBOUND" : "OUTBOUND",
            channel: "UI",
            fromAddress: reply.isFromUser ? contactMessage.email : "support",
            toAddress: reply.isFromUser ? "support" : contactMessage.email,
            content: reply.message,
            isInternal: reply.isInternal,
            createdAt: reply.createdAt,
          }
        });
      }

      // Perform initial routing
      if (supportOption) {
        await this.routeNewCase(supportCase.id);
      }

      // Log case creation
      await this.db.auditLog.create({
        data: {
          tenantId: contactMessage.tenantId,
          userId: contactMessage.userId || "system",
          action: "support_case_auto_created",
          resourceType: "support_case",
          resourceId: supportCase.id,
          details: JSON.stringify({
            contactMessageId: contactMessage.id,
            supportOptionId: supportOption?.id,
            supportOptionKey: supportOption?.key,
            caseNumber: supportCase.caseNumber,
          }),
          severity: "info",
        },
      });

      return supportCase.id;
    } catch (error) {
      console.error("Failed to create case from contact message:", error);
      throw error;
    }
  }

  /**
   * Route a new case based on its support option configuration
   */
  async routeNewCase(caseId: string): Promise<void> {
    let supportCase: Prisma.SupportCaseGetPayload<{
      include: {
        supportOption: true;
        tenant: true;
        contactMessage: true;
      };
    }> | null = null;

    try {
      supportCase = await this.db.supportCase.findUnique({
        where: { id: caseId },
        include: {
          supportOption: true,
          tenant: true,
          contactMessage: true,
        }
      });

      if (!supportCase || !supportCase.supportOption) {
        return; // No routing configuration available
      }

      // Type guard to ensure supportOption exists
      const supportOption = supportCase.supportOption;
      if (!supportOption) {
        return;
      }

      const routingConfig = supportOption.routingConfig as any;

      switch (routingConfig.type) {
        case "email":
          await this.routeToEmail(supportCase, routingConfig.addresses);
          break;

        case "webhook":
          await this.routeToWebhook(supportCase, routingConfig);
          break;

        case "tenant_default":
          await this.routeToTenantDefault(supportCase, routingConfig);
          break;

        default:
          console.warn(`Unknown routing type: ${routingConfig.type} for case ${caseId}`);
      }

      // Log routing action
      await this.db.auditLog.create({
        data: {
          tenantId: supportCase.tenantId,
          userId: "system",
          action: "support_case_routed",
          resourceType: "support_case",
          resourceId: caseId,
          details: JSON.stringify({
            routingType: routingConfig.type,
            supportOptionKey: supportOption.key,
          }),
          severity: "info",
        },
      });
    } catch (error) {
      console.error(`Failed to route case ${caseId}:`, error);
      
      // Log routing failure
      await this.db.auditLog.create({
        data: {
          tenantId: supportCase?.tenantId || null,
          userId: "system",
          action: "support_case_routing_failed",
          resourceType: "support_case",
          resourceId: caseId,
          details: JSON.stringify({
            error: String(error),
          }),
          severity: "error",
        },
      });
    }
  }

  /**
   * Determine the best support option based on contact reasons and tenant context
   */
  private async determineSupportOption(
    tenantId: string | null,
    contactReasonKeys: string[]
  ): Promise<any | null> {
    try {
      // First, try to find a tenant-specific option that matches the contact reasons
      if (tenantId) {
        for (const reasonKey of contactReasonKeys) {
          const tenantOption = await this.db.supportOption.findFirst({
            where: {
              tenantId,
              key: reasonKey,
              isActive: true,
            }
          });
          
          if (tenantOption) {
            return tenantOption;
          }
        }

        // Try to find a tenant default option
        const tenantDefault = await this.db.supportOption.findFirst({
          where: {
            tenantId,
            key: "general",
            isActive: true,
          }
        });

        if (tenantDefault) {
          return tenantDefault;
        }
      }

      // Fall back to global options
      for (const reasonKey of contactReasonKeys) {
        const globalOption = await this.db.supportOption.findFirst({
          where: {
            tenantId: null,
            key: reasonKey,
            isActive: true,
          }
        });
        
        if (globalOption) {
          return globalOption;
        }
      }

      // Final fallback to global general option
      const globalDefault = await this.db.supportOption.findFirst({
        where: {
          tenantId: null,
          key: "general",
          isActive: true,
        }
      });

      return globalDefault;
    } catch (error) {
      console.error("Failed to determine support option:", error);
      return null;
    }
  }

  /**
   * Route case to email addresses
   */
  private async routeToEmail(supportCase: any, emailAddresses: string[]): Promise<void> {
    // In production, this would integrate with the email service
    console.log(`Routing case ${supportCase.caseNumber} to emails:`, emailAddresses);
    
    // Create an outbound case message for tracking
    await this.db.caseMessage.create({
      data: {
        caseId: supportCase.id,
        direction: "OUTBOUND",
        channel: "EMAIL",
        fromAddress: "support@example.com",
        toAddress: emailAddresses.join(", "),
        subject: `New Support Case: ${supportCase.caseNumber} - ${supportCase.title}`,
        content: this.generateCaseNotificationEmail(supportCase),
        deliveryStatus: "PENDING",
      }
    });
  }

  /**
   * Route case to external webhook
   */
  private async routeToWebhook(supportCase: any, webhookConfig: any): Promise<void> {
    console.log(`Routing case ${supportCase.caseNumber} to webhook:`, webhookConfig.url);
    
    const payload = {
      caseId: supportCase.id,
      caseNumber: supportCase.caseNumber,
      title: supportCase.title,
      description: supportCase.description,
      priority: supportCase.priority,
      customer: supportCase.contactMessage ? {
        name: supportCase.contactMessage.name,
        email: supportCase.contactMessage.email,
      } : null,
      tenant: supportCase.tenant ? {
        id: supportCase.tenant.id,
        name: supportCase.tenant.name,
        slug: supportCase.tenant.slug,
      } : null,
      timestamp: new Date().toISOString(),
    };

    // Create a case message for tracking
    await this.db.caseMessage.create({
      data: {
        caseId: supportCase.id,
        direction: "OUTBOUND",
        channel: "WEBHOOK",
        fromAddress: "system",
        toAddress: webhookConfig.url,
        content: "Case routed to external webhook",
        deliveryStatus: "PENDING",
        deliveryMetadata: {
          webhookPayload: payload,
          method: webhookConfig.method || "POST",
        }
      }
    });

    // In production, make actual HTTP request to webhook
    // await fetch(webhookConfig.url, {
    //   method: webhookConfig.method || "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     ...webhookConfig.headers,
    //   },
    //   body: JSON.stringify(payload),
    // });
  }

  /**
   * Route case to tenant default email/system
   */
  private async routeToTenantDefault(supportCase: any, routingConfig: any): Promise<void> {
    const fallbackEmail = routingConfig.fallbackEmail || supportCase.tenant?.contactEmail || "";
    
    if (!fallbackEmail) {
      throw new Error("No tenant default email configured");
    }

    console.log(`Routing case ${supportCase.caseNumber} to tenant default:`, fallbackEmail);
    
    await this.db.caseMessage.create({
      data: {
        caseId: supportCase.id,
        direction: "OUTBOUND",
        channel: "EMAIL",
        fromAddress: "support@example.com",
        toAddress: fallbackEmail,
        subject: `New Support Case: ${supportCase.caseNumber} - ${supportCase.title}`,
        content: this.generateCaseNotificationEmail(supportCase),
        deliveryStatus: "PENDING",
      }
    });
  }

  /**
   * Map contact message priority to case priority
   */
  private mapContactPriorityToCasePriority(contactPriority: string): string {
    const mapping: Record<string, string> = {
      "low": "LOW",
      "normal": "NORMAL", 
      "high": "HIGH",
      "urgent": "URGENT",
    };
    
    return mapping[contactPriority] || "NORMAL";
  }

  /**
   * Generate threading key for message continuity
   */
  private generateThreadingKey(data: {
    source: string;
    identifier: string;
    fallback?: string;
  }): string {
    const { source, identifier, fallback } = data;
    const base = identifier || fallback || crypto.randomUUID();
    return `${source}:${crypto.createHash("md5").update(base).digest("hex")}`;
  }

  /**
   * Generate email content for case notification
   */
  private generateCaseNotificationEmail(supportCase: any): string {
    return `
A new support case has been created:

Case Number: ${supportCase.caseNumber}
Title: ${supportCase.title}
Priority: ${supportCase.priority}
Created: ${supportCase.createdAt}

Description:
${supportCase.description}

${supportCase.contactMessage ? `
Customer Details:
Name: ${supportCase.contactMessage.name}
Email: ${supportCase.contactMessage.email}
` : ''}

Please review and respond to this case through the support portal.
    `.trim();
  }

  /**
   * Auto-assign cases based on tenant rules
   */
  async autoAssignCase(caseId: string): Promise<void> {
    try {
      const supportCase: Prisma.SupportCaseGetPayload<{
        include: {
          supportOption: true;
        };
      }> | null = await this.db.supportCase.findUnique({
        where: { id: caseId },
        include: {
          supportOption: true,
        }
      });

      if (!supportCase || !supportCase.tenantId) {
        return; // Can't auto-assign without tenant context
      }

      // Get tenant assignment rules (this would be expanded based on requirements)
      const assignmentRule = await this.db.supportConfiguration.findFirst({
        where: {
          tenantId: supportCase.tenantId,
          key: "autoAssignmentRule"
        }
      });

      if (!assignmentRule) {
        return; // No assignment rule configured
      }

      const rule = assignmentRule.value as any;
      let assigneeId: string | null = null;

      switch (rule.type) {
        case "round_robin":
          assigneeId = await this.getNextRoundRobinAssignee(supportCase.tenantId);
          break;

        case "least_busy":
          assigneeId = await this.getLeastBusyAssignee(supportCase.tenantId);
          break;

        case "support_option":
          if (supportCase.supportOption && rule.mappings?.[supportCase.supportOption.key]) {
            assigneeId = rule.mappings[supportCase.supportOption.key];
          }
          break;

        case "fixed":
          assigneeId = rule.assigneeId;
          break;
      }

      if (assigneeId) {
        await this.db.supportCase.update({
          where: { id: caseId },
          data: { assigneeId }
        });

        // Log auto-assignment
        await this.db.auditLog.create({
          data: {
            tenantId: supportCase.tenantId,
            userId: "system",
            action: "support_case_auto_assigned",
            resourceType: "support_case",
            resourceId: caseId,
            details: JSON.stringify({
              assigneeId,
              ruleType: rule.type,
            }),
            severity: "info",
          },
        });
      }
    } catch (error) {
      console.error(`Failed to auto-assign case ${caseId}:`, error);
    }
  }

  /**
   * Get next assignee in round-robin fashion
   */
  private async getNextRoundRobinAssignee(tenantId: string): Promise<string | null> {
    // Get active support staff for the tenant
    const supportStaff = await this.db.membership.findMany({
      where: {
        tenantId,
        role: { in: ["admin", "support"] },
        status: "active",
      },
      include: {
        user: true,
      }
    });

    if (supportStaff.length === 0) {
      return null;
    }

    // Get the last assigned case to determine next in rotation
    const lastAssigned = await this.db.supportCase.findFirst({
      where: {
        tenantId,
        assigneeId: { not: null },
      },
      orderBy: { createdAt: "desc" }
    });

    if (!lastAssigned || !lastAssigned.assigneeId) {
      // First assignment, start with first person
      return supportStaff[0].userId;
    }

    // Find current assignee index and get next
    const currentIndex = supportStaff.findIndex(s => s.userId === lastAssigned.assigneeId);
    const nextIndex = (currentIndex + 1) % supportStaff.length;
    
    return supportStaff[nextIndex].userId;
  }

  /**
   * Get assignee with least open cases
   */
  private async getLeastBusyAssignee(tenantId: string): Promise<string | null> {
    const supportStaff = await this.db.membership.findMany({
      where: {
        tenantId,
        role: { in: ["admin", "support"] },
        status: "active",
      },
      include: {
        user: {
          include: {
            assignedCases: {
              where: {
                status: { in: ["OPEN", "PENDING"] },
                tenantId,
              }
            }
          }
        }
      }
    });

    if (supportStaff.length === 0) {
      return null;
    }

    // Find person with least open cases
    const sortedByWorkload = supportStaff.sort((a, b) => 
      a.user.assignedCases.length - b.user.assignedCases.length
    );

    return sortedByWorkload[0].userId;
  }
}
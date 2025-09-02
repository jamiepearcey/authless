import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, tenantAdminProcedure } from "../middleware";
import crypto from "crypto";

// Webhook signature verification
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace("sha256=", ""), "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}

// Threading key generation for message matching
function generateThreadingKey(data: {
  source: string;
  identifier: string; // email message-id, sms thread, etc.
  fallback?: string;
}): string {
  const { source, identifier, fallback } = data;
  const base = identifier || fallback || crypto.randomUUID();
  return `${source}:${crypto.createHash("md5").update(base).digest("hex")}`;
}

// Inbound message schemas
const InboundEmailMessageSchema = z.object({
  messageId: z.string(), // Email Message-ID header
  inReplyTo: z.string().optional(), // In-Reply-To header
  references: z.array(z.string()).optional(), // References header
  threadId: z.string().optional(), // Provider thread ID
  from: z.string().email(),
  to: z.array(z.string().email()),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string(),
  content: z.string(),
  htmlContent: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    contentType: z.string(),
    size: z.number(),
    content: z.string().optional(), // Base64 encoded
    url: z.string().optional(), // URL to download
  })).optional(),
  headers: z.record(z.string()).optional(),
  timestamp: z.string().datetime(),
});

const InboundSMSMessageSchema = z.object({
  messageId: z.string(),
  threadId: z.string().optional(),
  from: z.string(), // Phone number
  to: z.string(), // Phone number
  content: z.string(),
  timestamp: z.string().datetime(),
  provider: z.string().optional(),
});

const InboundWhatsAppMessageSchema = z.object({
  messageId: z.string(),
  threadId: z.string().optional(),
  from: z.string(), // WhatsApp ID
  to: z.string(), // WhatsApp ID
  content: z.string(),
  messageType: z.enum(["text", "image", "document", "audio", "video"]).default("text"),
  attachments: z.array(z.object({
    filename: z.string(),
    contentType: z.string(),
    size: z.number(),
    url: z.string(),
  })).optional(),
  timestamp: z.string().datetime(),
});

const InboundMessageSchema = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("EMAIL") }).merge(InboundEmailMessageSchema),
  z.object({ channel: z.literal("SMS") }).merge(InboundSMSMessageSchema),
  z.object({ channel: z.literal("WHATSAPP") }).merge(InboundWhatsAppMessageSchema),
]);

// Outbound message schemas
const OutboundMessageSchema = z.object({
  caseId: z.string(),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  to: z.string(),
  subject: z.string().optional(),
  content: z.string(),
  attachments: z.array(z.object({
    filename: z.string(),
    contentType: z.string(),
    content: z.string(), // Base64 encoded
  })).optional(),
  metadata: z.record(z.any()).optional(),
});

export const n8nWebhookRouter = router({
  // ==========================================
  // INBOUND WEBHOOK ENDPOINTS
  // ==========================================

  // Receive inbound messages from n8n
  receiveInboundMessage: publicProcedure
    .input(z.object({
      signature: z.string(),
      timestamp: z.string(),
      message: InboundMessageSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get webhook secret from configuration
        const webhookConfig = await ctx.db.supportConfiguration.findFirst({
          where: {
            tenantId: null, // Global config
            key: "n8nWebhookSecret"
          }
        });

        if (!webhookConfig) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Webhook secret not configured",
          });
        }

        // Verify signature
        const secret = webhookConfig.value as string;
        const payload = JSON.stringify(input.message);
        
        if (!verifyWebhookSignature(payload, input.signature, secret)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid webhook signature",
          });
        }

        // Check timestamp (prevent replay attacks)
        const messageTime = new Date(input.timestamp);
        const now = new Date();
        const timeDiff = now.getTime() - messageTime.getTime();
        
        if (timeDiff > 5 * 60 * 1000) { // 5 minutes
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Message timestamp too old",
          });
        }

        const { message } = input;

        // Check for duplicate messages
        const existingMessage = await ctx.db.caseMessage.findFirst({
          where: {
            messageId: message.messageId,
            channel: message.channel,
          }
        });

        if (existingMessage) {
          // Return success but don't process duplicate
          return {
            success: true,
            duplicate: true,
            caseId: existingMessage.caseId,
            messageId: existingMessage.id,
          };
        }

        // Generate threading key for message matching
        const threadingKey = generateThreadingKey({
          source: message.channel.toLowerCase(),
          identifier: message.channel === "EMAIL" 
            ? (message.inReplyTo || message.messageId)
            : message.threadId || message.messageId,
          fallback: `${message.channel.toLowerCase()}-${message.from}`,
        });

        // Try to find existing case by threading key
        let existingCase = await ctx.db.supportCase.findFirst({
          where: { threadingKey },
          include: {
            supportOption: true,
            tenant: true,
          }
        });

        // If no case found by threading, try to match by email/phone
        if (!existingCase && message.channel === "EMAIL") {
          const emailMessage = message as any;
          
          // Look for cases with matching contact message email
          existingCase = await ctx.db.supportCase.findFirst({
            where: {
              contactMessage: {
                email: emailMessage.from,
              },
              status: {
                in: ["OPEN", "PENDING", "RESOLVED"], // Not closed cases
              }
            },
            include: {
              supportOption: true,
              tenant: true,
            },
            orderBy: { createdAt: "desc" },
          });
        }

        let supportCase: any;
        let isNewCase = false;

        if (existingCase) {
          supportCase = existingCase;
        } else {
          // Create new case from inbound message
          isNewCase = true;
          
          // Determine tenant from routing (simplified - could be more complex)
          let tenantId: string | null = null;
          let supportOptionId: string | null = null;
          
          // Try to determine tenant from email domain or configuration
          if (message.channel === "EMAIL") {
            const emailMessage = message as any;
            const domain = emailMessage.to[0]?.split("@")[1];
            
            // Look for tenant with matching domain
            if (domain) {
              const tenant = await ctx.db.tenant.findFirst({
                where: {
                  OR: [
                    { customDomain: domain },
                    { subdomain: domain.split(".")[0] },
                  ]
                }
              });
              
              if (tenant) {
                tenantId = tenant.id;
              }
            }
          }

          // Get default support option
          const defaultOption = await ctx.db.supportOption.findFirst({
            where: {
              tenantId: tenantId,
              key: "general",
              isActive: true,
            }
          });

          if (!defaultOption) {
            // Fall back to global default
            const globalDefault = await ctx.db.supportOption.findFirst({
              where: {
                tenantId: null,
                key: "general",
                isActive: true,
              }
            });
            
            if (globalDefault) {
              supportOptionId = globalDefault.id;
            }
          } else {
            supportOptionId = defaultOption.id;
          }

          // Create the case
          supportCase = await ctx.db.supportCase.create({
            data: {
              title: message.channel === "EMAIL" 
                ? (message as any).subject 
                : `${message.channel} message from ${message.from}`,
              description: message.content.substring(0, 500), // First 500 chars
              status: "OPEN",
              priority: "NORMAL",
              tenantId,
              supportOptionId,
              threadingKey,
              source: message.channel === "EMAIL" ? "EMAIL" : 
                     message.channel === "SMS" ? "SMS" : "WHATSAPP",
              sourceMetadata: {
                originalMessage: message,
              },
            },
            include: {
              supportOption: true,
              tenant: true,
            }
          });
        }

        // Create the case message
        const caseMessage = await ctx.db.caseMessage.create({
          data: {
            caseId: supportCase.id,
            direction: "INBOUND",
            channel: message.channel,
            fromAddress: message.from,
            toAddress: message.channel === "EMAIL" 
              ? (message as any).to.join(", ") 
              : message.to,
            subject: message.channel === "EMAIL" ? (message as any).subject : undefined,
            content: message.content,
            messageId: message.messageId,
            threadingData: {
              inReplyTo: message.channel === "EMAIL" ? (message as any).inReplyTo : undefined,
              references: message.channel === "EMAIL" ? (message as any).references : undefined,
              threadId: message.threadId,
              headers: message.channel === "EMAIL" ? (message as any).headers : undefined,
            },
            attachments: message.attachments,
            deliveryStatus: "DELIVERED",
          }
        });

        // Log the action
        await ctx.db.auditLog.create({
          data: {
            tenantId: supportCase.tenantId,
            userId: "system",
            action: isNewCase ? "support_case_created_from_inbound" : "inbound_message_received",
            resourceType: "case_message",
            resourceId: caseMessage.id,
            traceId: ctx.trace.traceId,
            details: JSON.stringify({
              caseId: supportCase.id,
              channel: message.channel,
              from: message.from,
              isNewCase,
            }),
            severity: "info",
          },
        });

        return {
          success: true,
          duplicate: false,
          caseId: supportCase.id,
          messageId: caseMessage.id,
          isNewCase,
          caseNumber: supportCase.caseNumber,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to process inbound message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process inbound message",
        });
      }
    }),

  // ==========================================
  // OUTBOUND MESSAGE ENDPOINTS
  // ==========================================

  // Send outbound message via n8n
  sendOutboundMessage: protectedProcedure
    .input(OutboundMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify case exists
        const supportCase = await ctx.db.supportCase.findUnique({
          where: { id: input.caseId },
          include: {
            supportOption: true,
            tenant: true,
            contactMessage: true,
          }
        });

        if (!supportCase) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Support case not found",
          });
        }

        // Create the outbound case message first
        const caseMessage = await ctx.db.caseMessage.create({
          data: {
            caseId: input.caseId,
            direction: "OUTBOUND",
            channel: input.channel,
            fromAddress: input.channel === "EMAIL" 
              ? supportCase.supportOption?.routingConfig?.addresses?.[0] || "support@example.com"
              : "system",
            toAddress: input.to,
            subject: input.subject,
            content: input.content,
            attachments: input.attachments,
            deliveryStatus: "PENDING",
          }
        });

        // Get n8n webhook URL from configuration
        const n8nConfig = await ctx.db.supportConfiguration.findFirst({
          where: {
            tenantId: null,
            key: "n8nOutboundWebhookUrl"
          }
        });

        if (!n8nConfig) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "n8n webhook URL not configured",
          });
        }

        // Prepare outbound message payload for n8n
        const outboundPayload = {
          messageId: caseMessage.id,
          caseId: input.caseId,
          caseNumber: supportCase.caseNumber,
          channel: input.channel,
          to: input.to,
          subject: input.subject,
          content: input.content,
          attachments: input.attachments,
          threadingKey: supportCase.threadingKey,
          threadingData: {
            inReplyTo: supportCase.sourceMetadata?.originalMessage?.messageId,
            references: supportCase.sourceMetadata?.originalMessage?.references,
          },
          tenant: supportCase.tenant ? {
            id: supportCase.tenant.id,
            name: supportCase.tenant.name,
            slug: supportCase.tenant.slug,
          } : null,
          metadata: {
            ...input.metadata,
            userId: ctx.session.user.id,
            timestamp: new Date().toISOString(),
          }
        };

        // Send to n8n webhook (in production, this would be an actual HTTP request)
        // For now, we'll simulate success
        let deliveryResult: any = {
          success: true,
          messageId: `n8n-${Date.now()}`,
        };

        try {
          // In production, make actual HTTP request to n8n
          // const response = await fetch(n8nConfig.value as string, {
          //   method: "POST",
          //   headers: {
          //     "Content-Type": "application/json",
          //     "X-Webhook-Source": "support-resolution-center",
          //   },
          //   body: JSON.stringify(outboundPayload),
          // });
          // deliveryResult = await response.json();
          
          console.log("Would send to n8n:", outboundPayload);
        } catch (webhookError) {
          console.error("Failed to send to n8n webhook:", webhookError);
          deliveryResult = {
            success: false,
            error: String(webhookError),
          };
        }

        // Update delivery status
        await ctx.db.caseMessage.update({
          where: { id: caseMessage.id },
          data: {
            deliveryStatus: deliveryResult.success ? "SENT" : "FAILED",
            deliveryMetadata: deliveryResult,
          }
        });

        // Update case first response time if applicable
        if (!supportCase.firstResponseAt) {
          await ctx.db.supportCase.update({
            where: { id: input.caseId },
            data: { firstResponseAt: new Date() }
          });
        }

        // Log the action
        await ctx.db.auditLog.create({
          data: {
            tenantId: supportCase.tenantId,
            userId: ctx.session.user.id || "system",
            action: "outbound_message_sent",
            resourceType: "case_message",
            resourceId: caseMessage.id,
            traceId: ctx.trace.traceId,
            details: JSON.stringify({
              caseId: input.caseId,
              channel: input.channel,
              to: input.to,
              deliverySuccess: deliveryResult.success,
            }),
            severity: deliveryResult.success ? "info" : "warning",
          },
        });

        return {
          success: deliveryResult.success,
          messageId: caseMessage.id,
          deliveryId: deliveryResult.messageId,
          error: deliveryResult.error,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to send outbound message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send outbound message",
        });
      }
    }),

  // ==========================================
  // DELIVERY STATUS WEBHOOKS
  // ==========================================

  // Receive delivery status updates from n8n
  updateDeliveryStatus: publicProcedure
    .input(z.object({
      signature: z.string(),
      messageId: z.string(), // Our case message ID
      deliveryId: z.string(), // n8n/provider message ID
      status: z.enum(["SENT", "DELIVERED", "FAILED", "BOUNCED"]),
      timestamp: z.string().datetime(),
      error: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify webhook signature (similar to inbound messages)
        const webhookConfig = await ctx.db.supportConfiguration.findFirst({
          where: {
            tenantId: null,
            key: "n8nWebhookSecret"
          }
        });

        if (!webhookConfig) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Webhook secret not configured",
          });
        }

        const secret = webhookConfig.value as string;
        const payload = JSON.stringify({
          messageId: input.messageId,
          deliveryId: input.deliveryId,
          status: input.status,
          timestamp: input.timestamp,
        });

        if (!verifyWebhookSignature(payload, input.signature, secret)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid webhook signature",
          });
        }

        // Update message delivery status
        const updatedMessage = await ctx.db.caseMessage.update({
          where: { id: input.messageId },
          data: {
            deliveryStatus: input.status,
            deliveryMetadata: {
              deliveryId: input.deliveryId,
              timestamp: input.timestamp,
              error: input.error,
              ...input.metadata,
            }
          },
          include: {
            case: true,
          }
        });

        // Log delivery status update
        await ctx.db.auditLog.create({
          data: {
            tenantId: updatedMessage.case.tenantId,
            userId: "system",
            action: "message_delivery_status_updated",
            resourceType: "case_message",
            traceId: ctx.trace.traceId,
            resourceId: input.messageId,
            details: JSON.stringify({
              deliveryId: input.deliveryId,
              status: input.status,
              error: input.error,
            }),
            severity: input.status === "FAILED" || input.status === "BOUNCED" ? "error" : "info",
          },
        });

        return {
          success: true,
          messageId: input.messageId,
          status: input.status,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to update delivery status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update delivery status",
        });
      }
    }),

  // ==========================================
  // CONFIGURATION ENDPOINTS
  // ==========================================

  // Configure n8n webhook settings
  configureN8nWebhooks: tenantAdminProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      webhookSecret: z.string().min(32, "Webhook secret must be at least 32 characters"),
      inboundWebhookUrl: z.string().url(),
      outboundWebhookUrl: z.string().url(),
      deliveryWebhookUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const configurations = [
          {
            key: "n8nWebhookSecret",
            value: input.webhookSecret,
            description: "Secret key for verifying n8n webhook signatures",
          },
          {
            key: "n8nInboundWebhookUrl",
            value: input.inboundWebhookUrl,
            description: "URL for n8n to send inbound messages",
          },
          {
            key: "n8nOutboundWebhookUrl",
            value: input.outboundWebhookUrl,
            description: "URL for sending outbound messages to n8n",
          },
          {
            key: "n8nDeliveryWebhookUrl",
            value: input.deliveryWebhookUrl,
            description: "URL for n8n to send delivery status updates",
          },
        ];

        for (const config of configurations) {
          await ctx.db.supportConfiguration.upsert({
            where: {
              tenantId_key: {
                tenantId: input.tenantId || null,
                key: config.key,
              }
            },
            create: {
              tenantId: input.tenantId || null,
              key: config.key,
              value: config.value,
              description: config.description,
            },
            update: {
              value: config.value,
              description: config.description,
            }
          });
        }

        // Log configuration change
        await ctx.db.auditLog.create({
          data: {
            tenantId: input.tenantId,
            userId: ctx.session.user.id || "system",
            action: "n8n_webhooks_configured",
            traceId: ctx.trace.traceId,
            resourceType: "support_configuration",
            resourceId: "n8n_config",
            details: JSON.stringify({
              tenantId: input.tenantId,
              configuredUrls: {
                inbound: input.inboundWebhookUrl,
                outbound: input.outboundWebhookUrl,
                delivery: input.deliveryWebhookUrl,
              }
            }),
            severity: "info",
          },
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to configure n8n webhooks:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to configure n8n webhooks",
        });
      }
    }),

  // Get n8n webhook configuration
  getN8nConfiguration: tenantAdminProcedure
    .input(z.object({
      tenantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const configurations = await ctx.db.supportConfiguration.findMany({
          where: {
            tenantId: input.tenantId || null,
            key: {
              startsWith: "n8n"
            }
          }
        });

        const configMap = configurations.reduce((acc, config) => {
          acc[config.key] = {
            value: config.value,
            description: config.description,
            updatedAt: config.updatedAt,
          };
          return acc;
        }, {} as Record<string, any>);

        return configMap;
      } catch (error) {
        console.error("Failed to get n8n configuration:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get n8n configuration",
        });
      }
    }),
});
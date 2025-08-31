import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  tenantAdminProcedure,
} from "../middleware";

const HelpTypeEnum = z.enum(["technical", "billing", "account", "general"]);

export const tenantSupportRoutingRouter = router({
  // Get tenant's support routing configuration
  getTenantSupportRouting: tenantAdminProcedure
    .input(
      z.object({
        tenantId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        let routing = [];
        try {
          routing = await ctx.db.tenantSupportRouting.findMany({
            where: {
              tenantId: input.tenantId,
              isActive: true,
            },
            orderBy: { helpType: "asc" },
          });
        } catch (dbError) {
          console.warn("TenantSupportRouting table not available:", dbError);
          // Return empty routing if table doesn't exist
        }

        // Ensure we have all help types represented
        const helpTypes = ["technical", "billing", "account", "general"];
        const routingMap = routing.reduce(
          (acc, route) => {
            acc[route.helpType] = route;
            return acc;
          },
          {} as Record<string, any>
        );

        const result = helpTypes.map((helpType) => ({
          helpType,
          email: routingMap[helpType]?.email || "",
          isActive: routingMap[helpType]?.isActive || false,
          id: routingMap[helpType]?.id || null,
        }));

        return result;
      } catch (error) {
        console.error("Failed to fetch tenant support routing:", error);
        // Return default structure instead of throwing
        return ["technical", "billing", "account", "general"].map((helpType) => ({
          helpType,
          email: "",
          isActive: false,
          id: null,
        }));
      }
    }),

  // Update or create tenant support routing
  upsertTenantSupportRouting: tenantAdminProcedure
    .input(
      z.object({
        tenantId: z.string(),
        helpType: HelpTypeEnum,
        email: z.string().email("Invalid email address"),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {

        let existing = null;
        try {
          existing = await ctx.db.tenantSupportRouting.findUnique({
            where: {
              tenantId_helpType: {
                tenantId: input.tenantId,
                helpType: input.helpType,
              },
            },
          });
        } catch (findError) {
          console.warn("TenantSupportRouting table not available for read:", findError);
        }

        let result;
        if (existing) {
          try {
            result = await ctx.db.tenantSupportRouting.update({
              where: { id: existing.id },
              data: {
                email: input.email,
                isActive: input.isActive,
              },
            });
          } catch (updateError) {
            console.warn("TenantSupportRouting table not available for update:", updateError);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Support routing configuration is not available yet",
            });
          }
        } else {
          try {
            result = await ctx.db.tenantSupportRouting.create({
              data: {
                tenantId: input.tenantId,
                helpType: input.helpType,
                email: input.email,
                isActive: input.isActive,
              },
            });
          } catch (createError) {
            console.warn("TenantSupportRouting table not available for create:", createError);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Support routing configuration is not available yet",
            });
          }
        }

        // Log the action if we have a valid user
        if (ctx.session.user?.id && ctx.session.user.id !== "system") {
          try {
            await ctx.db.auditLog.create({
              data: {
                tenantId: input.tenantId,
                userId: ctx.session.user.id,
                action: existing
                  ? "tenant_support_routing_updated"
                  : "tenant_support_routing_created",
                resourceType: "tenant_support_routing",
                resourceId: result.id,
                details: JSON.stringify({
                  helpType: input.helpType,
                  email: input.email,
                  isActive: input.isActive,
                }),
                severity: "info",
              },
            });
          } catch (auditError) {
            console.warn("Failed to create audit log:", auditError);
            // Continue without audit log
          }
        }

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to upsert tenant support routing:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update tenant support routing",
        });
      }
    }),

  // Bulk update tenant support routing
  bulkUpdateTenantSupportRouting: tenantAdminProcedure
    .input(
      z.object({
        tenantId: z.string(),
        routingConfigs: z.array(
          z.object({
            helpType: HelpTypeEnum,
            email: z.string().email("Invalid email address").optional(),
            isActive: z.boolean().default(true),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const results = [];

        for (const config of input.routingConfigs) {
          if (!config.email) continue; // Skip empty emails

          const existing = await ctx.db.tenantSupportRouting.findUnique({
            where: {
              tenantId_helpType: {
                tenantId: input.tenantId,
                helpType: config.helpType,
              },
            },
          });

          let result;
          if (existing) {
            result = await ctx.db.tenantSupportRouting.update({
              where: { id: existing.id },
              data: {
                email: config.email,
                isActive: config.isActive,
              },
            });
          } else {
            result = await ctx.db.tenantSupportRouting.create({
              data: {
                tenantId: input.tenantId,
                helpType: config.helpType,
                email: config.email,
                isActive: config.isActive,
              },
            });
          }

          results.push(result);
        }

        // Log the bulk action
        await ctx.db.auditLog.create({
          data: {
            tenantId: input.tenantId,
            userId: ctx.session.user.id || "system",
            action: "tenant_support_routing_bulk_updated",
            resourceType: "tenant_support_routing",
            resourceId: input.tenantId,
            details: JSON.stringify({
              updatedConfigs: input.routingConfigs.length,
              helpTypes: input.routingConfigs.map((c) => c.helpType),
            }),
            severity: "info",
          },
        });

        return {
          success: true,
          updated: results.length,
          results,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to bulk update tenant support routing:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to bulk update tenant support routing",
        });
      }
    }),

  // Get available emails for a tenant (for predictive text input)
  getTenantAvailableEmails: tenantAdminProcedure
    .input(
      z.object({
        tenantId: z.string(),
        query: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const emails = new Set<string>();

        // Get tenant contact email
        const tenant = await ctx.db.tenant.findUnique({
          where: { id: input.tenantId },
          select: { contactEmail: true },
        });
        if (tenant?.contactEmail) {
          emails.add(tenant.contactEmail);
        }

        // Get emails from tenant members
        const members = await ctx.db.membership.findMany({
          where: {
            tenantId: input.tenantId,
            status: "active",
            role: { in: ["admin", "support"] },
          },
          include: {
            user: {
              select: { email: true },
            },
          },
        });

        members.forEach((member) => {
          if (member.user.email) {
            emails.add(member.user.email);
          }
        });

        // Get existing routing emails
        const existingRouting = await ctx.db.tenantSupportRouting.findMany({
          where: {
            tenantId: input.tenantId,
            isActive: true,
          },
          select: { email: true },
        });

        existingRouting.forEach((route) => emails.add(route.email));

        // Filter by query if provided
        let emailList = Array.from(emails);
        if (input.query) {
          const query = input.query.toLowerCase();
          emailList = emailList.filter((email) =>
            email.toLowerCase().includes(query)
          );
        }

        return emailList.sort();
      } catch (error) {
        console.error("Failed to fetch tenant available emails:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch available emails",
        });
      }
    }),

  // Delete tenant support routing
  deleteTenantSupportRouting: tenantAdminProcedure
    .input(
      z.object({
        tenantId: z.string(),
        helpType: HelpTypeEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const deleted = await ctx.db.tenantSupportRouting.delete({
          where: {
            tenantId_helpType: {
              tenantId: input.tenantId,
              helpType: input.helpType,
            },
          },
        });

        // Log the action
        await ctx.db.auditLog.create({
          data: {
            tenantId: input.tenantId,
            userId: ctx.session.user.id || "system",
            action: "tenant_support_routing_deleted",
            resourceType: "tenant_support_routing",
            resourceId: deleted.id,
            details: JSON.stringify({
              helpType: input.helpType,
              email: deleted.email,
            }),
            severity: "info",
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to delete tenant support routing:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete tenant support routing",
        });
      }
    }),
});

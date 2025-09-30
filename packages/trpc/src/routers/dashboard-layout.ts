import { z } from "zod";
import { publicProcedure, router } from "../middleware";
import { db } from "@db/base";

export const dashboardLayoutRouter = router({
  // Get dashboard layout for a user
  getLayout: publicProcedure
    .input( 
      z.object({
        dashboard: z.enum(["system-health", "billing"]),
        tenantId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }: { input: any, ctx: any }) => {
      if (!ctx.session?.user?.id) {
        throw new Error("Unauthorized");
      }

      const layout = await db.dashboardLayout.findFirst({
        where: {
          userId: ctx.session.user.id,
          tenantId: input.tenantId ?? null,
          dashboard: input.dashboard,
        },
      });

      return layout?.layout || null;
    }),

  // Save dashboard layout for a user
  saveLayout: publicProcedure
    .input(
      z.object({
        dashboard: z.enum(["system-health", "billing"]),
        layout: z.array(z.any()), // GridStack layout configuration (array of widgets)
        tenantId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }: { input: any, ctx: any }) => {
      if (!ctx.session?.user?.id) {
        throw new Error("Unauthorized");
      }

      // First, try to find existing layout
      const existingLayout = await db.dashboardLayout.findFirst({
        where: {
          userId: ctx.session.user.id,
          tenantId: input.tenantId ?? null,
          dashboard: input.dashboard,
        },
      });

      let layout;
      if (existingLayout) {
        // Update existing layout
        layout = await db.dashboardLayout.update({
          where: { id: existingLayout.id },
          data: {
            layout: input.layout,
            tenantId: input.tenantId ?? null,
          },
        });
      } else {
        // Create new layout
        layout = await db.dashboardLayout.create({
          data: {
            userId: ctx.session.user.id,
            tenantId: input.tenantId ?? null,
            dashboard: input.dashboard,
            layout: input.layout,
          },
        });
      }

      return layout;
    }),

  // Reset dashboard layout to default
  resetLayout: publicProcedure
    .input(
      z.object({
        dashboard: z.enum(["system-health", "billing"]),
        tenantId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }: { input: any, ctx: any }) => {
      if (!ctx.session?.user?.id) {
        throw new Error("Unauthorized");
      }

      await db.dashboardLayout.deleteMany({
        where: {
          userId: ctx.session.user.id,
          tenantId: input.tenantId ?? null,
          dashboard: input.dashboard,
        },
      });

      return { success: true };
    }),
});

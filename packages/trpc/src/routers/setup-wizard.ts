import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../middleware";
import { db } from "@db/base";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

// Setup wizard step schema
const setupStepSchema = z.enum([
  "welcome",
  "database",
  "admin",
  "features",
  "review",
  "complete"
]);

// Database configuration schema (placeholder)
const databaseConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().min(1).max(65535),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().default(false)
});

// Admin user creation schema
const createAdminSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100)
});

// Feature selection schema
const featureSelectionSchema = z.object({
  features: z.record(z.string(), z.boolean())
});

export const setupWizardRouter = router({
  // Get current setup state - publicly accessible until setup is complete
  getSetupState: publicProcedure
    .query(async () => {
      const setupState = await db.setupState.findUnique({
        where: { id: "singleton" }
      });

      // If no setup state exists, create default one
      if (!setupState) {
        const newSetupState = await db.setupState.create({
          data: {
            id: "singleton",
            isCompleted: false,
            currentStep: "welcome"
          }
        });
        return newSetupState;
      }

      return setupState;
    }),

  // Update wizard step and context
  updateWizardStep: publicProcedure
    .input(z.object({
      step: setupStepSchema,
      context: z.record(z.any()).optional()
    }))
    .mutation(async ({ input }) => {
      // Check if setup is already completed
      const setupState = await db.setupState.findUnique({
        where: { id: "singleton" }
      });

      if (setupState?.isCompleted) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Setup is already completed"
        });
      }

      const contextSnapshot = input.context ? JSON.stringify(input.context) : undefined;

      const updatedState = await db.setupState.upsert({
        where: { id: "singleton" },
        create: {
          id: "singleton",
          isCompleted: false,
          currentStep: input.step,
          contextSnapshot
        },
        update: {
          currentStep: input.step,
          contextSnapshot
        }
      });

      return updatedState;
    }),

  // Submit database configuration (placeholder - writes local config)
  submitDatabaseConfig: publicProcedure
    .input(databaseConfigSchema)
    .mutation(async ({ input }) => {
      // Check if setup is already completed
      const setupState = await db.setupState.findUnique({
        where: { id: "singleton" }
      });

      if (setupState?.isCompleted) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Setup is already completed"
        });
      }

      // In a real implementation, this would write to a config file
      // For now, we'll just validate and store in the wizard context
      const contextSnapshot = JSON.stringify({
        database: input,
        timestamp: new Date().toISOString()
      });

      await db.setupState.upsert({
        where: { id: "singleton" },
        create: {
          id: "singleton",
          isCompleted: false,
          currentStep: "admin",
          contextSnapshot
        },
        update: {
          currentStep: "admin",
          contextSnapshot
        }
      });

      return {
        success: true,
        message: "Database configuration saved. A restart may be required to apply changes."
      };
    }),

  // Create the first platform admin user
  createFirstAdmin: publicProcedure
    .input(createAdminSchema)
    .mutation(async ({ input }) => {
      // Check if setup is already completed
      const setupState = await db.setupState.findUnique({
        where: { id: "singleton" }
      });

      if (setupState?.isCompleted) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Setup is already completed"
        });
      }

      // Check if any platform admin already exists
      const existingAdmin = await db.user.findFirst({
        where: { platformRole: "admin" }
      });

      if (existingAdmin) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Platform admin already exists"
        });
      }

      // Check if email is already taken
      const existingUser = await db.user.findUnique({
        where: { email: input.email }
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email address is already in use"
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 12);

      // Create the admin user
      const adminUser = await db.user.create({
        data: {
          name: input.name,
          email: input.email,
          hashedPassword,
          isEmailVerified: true,
          platformRole: "admin",
          status: "active"
        }
      });

      // Update wizard state
      const currentContext = setupState?.contextSnapshot ? 
        JSON.parse(setupState.contextSnapshot) : {};
      
      const updatedContext = {
        ...currentContext,
        admin: {
          userId: adminUser.id,
          email: adminUser.email,
          name: adminUser.name
        }
      };

      await db.setupState.update({
        where: { id: "singleton" },
        data: {
          currentStep: "features",
          contextSnapshot: JSON.stringify(updatedContext)
        }
      });

      return {
        success: true,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email
        }
      };
    }),

  // Submit initial feature selections
  submitFeatureSelections: publicProcedure
    .input(featureSelectionSchema)
    .mutation(async ({ input }) => {
      // Check if setup is already completed
      const setupState = await db.setupState.findUnique({
        where: { id: "singleton" }
      });

      if (setupState?.isCompleted) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Setup is already completed"
        });
      }

      // Get the admin user from context
      const context = setupState?.contextSnapshot ? 
        JSON.parse(setupState.contextSnapshot) : {};
      
      const adminUserId = context.admin?.userId;
      if (!adminUserId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Admin user must be created before setting features"
        });
      }

      // Set global rules for selected features
      const enabledFeatures = Object.entries(input.features)
        .filter(([_, enabled]) => enabled)
        .map(([key, _]) => key);

      // Create global rules for enabled core features
      for (const featureKey of enabledFeatures) {
        // Verify feature exists and is Core tier
        const feature = await db.featureDefinition.findUnique({
          where: { key: featureKey }
        });

        if (feature && feature.tier === "Core") {
          await db.globalFeatureRule.upsert({
            where: { featureKey },
            create: {
              featureKey,
              enabled: true,
              createdBy: adminUserId
            },
            update: {
              enabled: true,
              createdBy: adminUserId
            }
          });
        }
      }

      // Update wizard context
      const updatedContext = {
        ...context,
        features: input.features
      };

      await db.setupState.update({
        where: { id: "singleton" },
        data: {
          currentStep: "review",
          contextSnapshot: JSON.stringify(updatedContext)
        }
      });

      return {
        success: true,
        enabledFeatures
      };
    }),

  // Complete the setup wizard
  completeSetup: publicProcedure
    .mutation(async () => {
      const setupState = await db.setupState.findUnique({
        where: { id: "singleton" }
      });

      if (setupState?.isCompleted) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Setup is already completed"
        });
      }

      // Verify that admin user exists
      const adminExists = await db.user.findFirst({
        where: { platformRole: "admin" }
      });

      if (!adminExists) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Platform admin must be created before completing setup"
        });
      }

      // Mark setup as completed
      await db.setupState.update({
        where: { id: "singleton" },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          completedBy: adminExists.id,
          currentStep: "complete"
        }
      });

      return {
        success: true,
        message: "Setup completed successfully!"
      };
    }),

  // Check if setup is required (for routing logic)
  isSetupRequired: publicProcedure
    .query(async () => {
      const setupState = await db.setupState.findUnique({
        where: { id: "singleton" }
      });

      return !setupState?.isCompleted;
    }),

  // Get available core features for selection
  getCoreFeatures: publicProcedure
    .query(async () => {
      const coreFeatures = await db.featureDefinition.findMany({
        where: { tier: "Core" },
        select: {
          key: true,
          name: true,
          description: true,
          defaultEnabled: true
        },
        orderBy: { name: 'asc' }
      });

      return coreFeatures;
    }),

  // Reset setup (admin only, for testing/recovery)
  resetSetup: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Platform admin access required"
        });
      }

      await db.setupState.update({
        where: { id: "singleton" },
        data: {
          isCompleted: false,
          currentStep: "welcome",
          contextSnapshot: null,
          completedAt: null,
          completedBy: null
        }
      });

      return { success: true };
    })
});

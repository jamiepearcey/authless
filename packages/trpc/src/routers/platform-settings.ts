import { z } from "zod";
import { router, protectedProcedure } from "../middleware";
import { featureToggleService } from "../feature-toggle-service";
import { TRPCError } from "@trpc/server";

// Schema for platform settings
const platformSettingsSchema = z.object({
  // Feature Toggles - Authentication & Security
  enableMFA: z.boolean().optional(),
  enablePasskeys: z.boolean().optional(),
  enableSocialLogin: z.boolean().optional(),
  enableSessionManagement: z.boolean().optional(),
  
  // Feature Toggles - Tenant Management
  enableMultiTenant: z.boolean().optional(),
  allowNewTenantRegistration: z.boolean().optional(),
  enableTenantInvitations: z.boolean().optional(),
  enableCustomDomains: z.boolean().optional(),
  
  // Feature Toggles - API & Integrations
  enableRestAPI: z.boolean().optional(),
  enableWebhooks: z.boolean().optional(),
  enableGraphQL: z.boolean().optional(),
  enableRateLimiting: z.boolean().optional(),
  
  // Feature Toggles - Monitoring & Analytics
  enableAuditLogging: z.boolean().optional(),
  enableAnalytics: z.boolean().optional(),
  enableRealTimeMonitoring: z.boolean().optional(),
  enablePerformanceMetrics: z.boolean().optional(),
  
  // System Controls
  maintenanceMode: z.boolean().optional(),
  enableSystemNotifications: z.boolean().optional(),
  maxTenantsPerUser: z.number().min(1).max(100).optional(),
  defaultTenantPlan: z.enum(["free", "pro", "enterprise"]).optional(),
  sessionTimeoutMinutes: z.number().min(15).max(1440).optional(),
  
  // Email Settings
  emailProvider: z.enum(["smtp", "sendgrid", "mailgun", "ses", "jetstream"]).optional(),
  emailFromName: z.string().optional(),
  emailFromAddress: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpTls: z.boolean().optional(),
  sendgridApiKey: z.string().optional(),
  mailgunApiKey: z.string().optional(),
  mailgunDomain: z.string().optional(),
  sesAccessKeyId: z.string().optional(),
  sesSecretAccessKey: z.string().optional(),
  sesRegion: z.string().optional(),
  jetstreamApiKey: z.string().optional(),
  jetstreamDomain: z.string().optional(),
  
  // Notification Settings
  retentionDays: z.number().min(1).max(365).optional(),
});

// Map UI settings to feature keys
const FEATURE_MAPPINGS = {
  enableMultiTenant: "multi_tenant",
  allowNewTenantRegistration: "tenant_registration",
  enableAuditLogging: "audit_logging",
  enableSystemNotifications: "notifications",
  enablePasskeys: "passkey_auth",
  enableMFA: "two_factor_auth",
  enableWebhooks: "webhooks",
  // Support system is always enabled for core functionality
  supportSystem: "support_system",
} as const;

export const platformSettingsRouter = router({
  getPlatformSettings: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Platform admin access required"
        });
      }

      // Get effective features to determine current state
      const effectiveFeatures = await featureToggleService.getEffectiveFeatures();
      
      // Map feature toggles back to settings structure
      const settings = {
        // Feature Toggles - Authentication & Security
        enableMFA: effectiveFeatures[FEATURE_MAPPINGS.enableMFA] || false,
        enablePasskeys: effectiveFeatures[FEATURE_MAPPINGS.enablePasskeys] || false,
        enableSocialLogin: false, // Not implemented yet
        enableSessionManagement: false, // Not implemented yet
        
        // Feature Toggles - Tenant Management
        enableMultiTenant: effectiveFeatures[FEATURE_MAPPINGS.enableMultiTenant] || false,
        allowNewTenantRegistration: effectiveFeatures[FEATURE_MAPPINGS.allowNewTenantRegistration] || false,
        enableTenantInvitations: false, // Not implemented yet
        enableCustomDomains: false, // Not implemented yet
        
        // Feature Toggles - API & Integrations
        enableRestAPI: false, // Not implemented yet
        enableWebhooks: effectiveFeatures[FEATURE_MAPPINGS.enableWebhooks] || false,
        enableGraphQL: false, // Not implemented yet
        enableRateLimiting: false, // Not implemented yet
        
        // Feature Toggles - Monitoring & Analytics
        enableAuditLogging: effectiveFeatures[FEATURE_MAPPINGS.enableAuditLogging] || false,
        enableAnalytics: false, // Not implemented yet
        enableRealTimeMonitoring: false, // Not implemented yet
        enablePerformanceMetrics: false, // Not implemented yet
        
        // System Controls - These would come from a separate settings table in production
        maintenanceMode: false,
        enableSystemNotifications: effectiveFeatures[FEATURE_MAPPINGS.enableSystemNotifications] || false,
        maxTenantsPerUser: 5,
        defaultTenantPlan: "free" as const,
        sessionTimeoutMinutes: 60,
        
        // Email Settings - These would come from a separate settings table in production
        emailProvider: "smtp" as const,
        emailFromName: "",
        emailFromAddress: "",
        smtpHost: "",
        smtpPort: 587,
        smtpUsername: "",
        smtpPassword: "",
        smtpTls: true,
        sendgridApiKey: "",
        mailgunApiKey: "",
        mailgunDomain: "",
        sesAccessKeyId: "",
        sesSecretAccessKey: "",
        sesRegion: "us-east-1",
        jetstreamApiKey: "",
        jetstreamDomain: "",
        
        // Notification Settings - These would come from a separate settings table in production
        retentionDays: 90,
      };

      return settings;
    }),

  updatePlatformSettings: protectedProcedure
    .input(platformSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN", 
          message: "Platform admin access required"
        });
      }

      // Update feature toggles
      const promises: Promise<any>[] = [];

      if (input.enableMultiTenant !== undefined) {
        promises.push(
          featureToggleService.setGlobalRule(
            FEATURE_MAPPINGS.enableMultiTenant,
            input.enableMultiTenant,
            ctx.session.user.id
          )
        );
      }

      if (input.allowNewTenantRegistration !== undefined) {
        promises.push(
          featureToggleService.setGlobalRule(
            FEATURE_MAPPINGS.allowNewTenantRegistration,
            input.allowNewTenantRegistration,
            ctx.session.user.id
          )
        );
      }

      if (input.enableAuditLogging !== undefined) {
        promises.push(
          featureToggleService.setGlobalRule(
            FEATURE_MAPPINGS.enableAuditLogging,
            input.enableAuditLogging,
            ctx.session.user.id
          )
        );
      }

      if (input.enableSystemNotifications !== undefined) {
        promises.push(
          featureToggleService.setGlobalRule(
            FEATURE_MAPPINGS.enableSystemNotifications,
            input.enableSystemNotifications,
            ctx.session.user.id
          )
        );
      }

      if (input.enablePasskeys !== undefined) {
        promises.push(
          featureToggleService.setGlobalRule(
            FEATURE_MAPPINGS.enablePasskeys,
            input.enablePasskeys,
            ctx.session.user.id
          )
        );
      }

      if (input.enableMFA !== undefined) {
        promises.push(
          featureToggleService.setGlobalRule(
            FEATURE_MAPPINGS.enableMFA,
            input.enableMFA,
            ctx.session.user.id
          )
        );
      }

      if (input.enableWebhooks !== undefined) {
        promises.push(
          featureToggleService.setGlobalRule(
            FEATURE_MAPPINGS.enableWebhooks,
            input.enableWebhooks,
            ctx.session.user.id
          )
        );
      }

      // Wait for all feature toggle updates
      await Promise.all(promises);

      // TODO: In production, also save other settings (system controls, email, etc.) 
      // to a separate platform_settings table

      return { success: true };
    }),
});
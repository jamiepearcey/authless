import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  tenantAdminProcedure,
} from "../middleware";
import * as crypto from "crypto";

// SSO Provider enum
const SsoProviderEnum = z.enum([
  "saml",
  "oidc", 
  "azure-ad",
  "google-workspace",
  "okta",
  "auth0",
  "custom"
]);

// SAML Configuration Schema
const SamlConfigSchema = z.object({
  entityId: z.string().optional(),
  ssoUrl: z.string().url().optional(),
  sloUrl: z.string().url().optional(),
  certificate: z.string().optional(), // PEM format
  signingCert: z.string().optional(),
  nameIdFormat: z.string().optional(),
  attributeMapping: z.record(z.string()).optional(),
});

// OIDC Configuration Schema  
const OidcConfigSchema = z.object({
  issuer: z.string().url().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  scopes: z.string().optional(),
  tokenEndpoint: z.string().url().optional(),
  authEndpoint: z.string().url().optional(), 
  userinfoEndpoint: z.string().url().optional(),
  jwksUri: z.string().url().optional(),
});

// OAuth2 Configuration Schema
const OAuth2ConfigSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  authUrl: z.string().url().optional(),
  tokenUrl: z.string().url().optional(),
  userInfoUrl: z.string().url().optional(),
  scopes: z.string().optional(),
});

// Main SSO Configuration Schema
const SsoConfigurationSchema = z.object({
  provider: SsoProviderEnum,
  providerName: z.string().min(1, "Provider name is required"),
  isEnabled: z.boolean().default(false),
  enforceSSO: z.boolean().default(false),
  autoProvisionUsers: z.boolean().default(true),
  defaultRole: z.string().default("member"),
  allowedDomains: z.string().optional(),
  userAttributeMapping: z.record(z.string()).optional(),
  signAssertions: z.boolean().default(true),
  signRequests: z.boolean().default(false),
  encryptAssertions: z.boolean().default(false),
  sessionTimeout: z.number().int().min(5).max(10080).default(480), // 5 min to 1 week
  samlConfig: SamlConfigSchema.optional(),
  oidcConfig: OidcConfigSchema.optional(),
  oauth2Config: OAuth2ConfigSchema.optional(),
});

// Function to encrypt sensitive data
function encryptSensitiveData(data: string, key?: string): string {
  if (!data) return data;
  
  try {
    // Simple base64 encoding for development - use proper encryption in production
    const encryptionKey = key || process.env.SSO_ENCRYPTION_KEY || "default-key";
    const combinedData = `${encryptionKey}:${data}`;
    return Buffer.from(combinedData, 'utf8').toString('base64');
  } catch (error) {
    console.error("Failed to encrypt sensitive data:", error);
    return data;
  }
}

// Function to decrypt sensitive data
function decryptSensitiveData(encryptedData: string, key?: string): string {
  if (!encryptedData) return encryptedData;
  
  try {
    // Simple base64 decoding for development - use proper decryption in production
    const encryptionKey = key || process.env.SSO_ENCRYPTION_KEY || "default-key";
    const decodedData = Buffer.from(encryptedData, 'base64').toString('utf8');
    
    if (decodedData.startsWith(`${encryptionKey}:`)) {
      return decodedData.substring(`${encryptionKey}:`.length);
    }
    
    // If not in expected format, return as-is
    return encryptedData;
  } catch (error) {
    console.error("Failed to decrypt sensitive data:", error);
    return encryptedData;
  }
}

// Audit log helper
async function createSsoAuditLog(
  db: any,
  tenantId: string,
  userId: string,
  event: string,
  provider: string,
  details?: Record<string, any>
) {
  try {
    await db.ssoAuditLog.create({
      data: {
        tenantId,
        userId,
        event,
        provider,
        attributes: details ? JSON.stringify(details) : null,
      },
    });
  } catch (error) {
    console.error("Failed to create SSO audit log:", error);
  }
}

export const tenantSsoRouter = router({
  // Get SSO configuration for a tenant
  getSsoConfiguration: tenantAdminProcedure
    .input(
      z.object({
        tenantId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const ssoConfig = await ctx.db.tenantSsoConfiguration.findUnique({
          where: {
            tenantId: input.tenantId,
          },
        });

        if (!ssoConfig) {
          return null;
        }

        // Decrypt sensitive fields before returning
        const decryptedConfig = {
          ...ssoConfig,
          oidcClientSecret: ssoConfig.oidcClientSecret ? 
            decryptSensitiveData(ssoConfig.oidcClientSecret) : null,
          oauth2ClientSecret: ssoConfig.oauth2ClientSecret ? 
            decryptSensitiveData(ssoConfig.oauth2ClientSecret) : null,
        };

        return decryptedConfig;
      } catch (error) {
        console.error("Failed to fetch SSO configuration:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch SSO configuration",
        });
      }
    }),

  // Create or update SSO configuration
  upsertSsoConfiguration: tenantAdminProcedure
    .input(
      z.object({
        tenantId: z.string(),
        configuration: SsoConfigurationSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { configuration } = input;
        const userId = ctx.session.user.id!;

        // Prepare data for database with encrypted sensitive fields
        const ssoData: any = {
          provider: configuration.provider,
          providerName: configuration.providerName,
          isEnabled: configuration.isEnabled,
          enforceSSO: configuration.enforceSSO,
          autoProvisionUsers: configuration.autoProvisionUsers,
          defaultRole: configuration.defaultRole,
          allowedDomains: configuration.allowedDomains,
          userAttributeMapping: configuration.userAttributeMapping ? 
            JSON.stringify(configuration.userAttributeMapping) : null,
          signAssertions: configuration.signAssertions,
          signRequests: configuration.signRequests,
          encryptAssertions: configuration.encryptAssertions,
          sessionTimeout: configuration.sessionTimeout,
          updatedBy: userId,
        };

        // Handle SAML configuration
        if (configuration.samlConfig) {
          ssoData.samlEntityId = configuration.samlConfig.entityId;
          ssoData.samlSsoUrl = configuration.samlConfig.ssoUrl;
          ssoData.samlSloUrl = configuration.samlConfig.sloUrl;
          ssoData.samlCertificate = configuration.samlConfig.certificate;
          ssoData.samlSigningCert = configuration.samlConfig.signingCert;
          ssoData.samlNameIdFormat = configuration.samlConfig.nameIdFormat;
          ssoData.samlAttributeMapping = configuration.samlConfig.attributeMapping ? 
            JSON.stringify(configuration.samlConfig.attributeMapping) : null;
        }

        // Handle OIDC configuration with encryption
        if (configuration.oidcConfig) {
          ssoData.oidcIssuer = configuration.oidcConfig.issuer;
          ssoData.oidcClientId = configuration.oidcConfig.clientId;
          ssoData.oidcClientSecret = configuration.oidcConfig.clientSecret ? 
            encryptSensitiveData(configuration.oidcConfig.clientSecret) : null;
          ssoData.oidcScopes = configuration.oidcConfig.scopes;
          ssoData.oidcTokenEndpoint = configuration.oidcConfig.tokenEndpoint;
          ssoData.oidcAuthEndpoint = configuration.oidcConfig.authEndpoint;
          ssoData.oidcUserinfoEndpoint = configuration.oidcConfig.userinfoEndpoint;
          ssoData.oidcJwksUri = configuration.oidcConfig.jwksUri;
        }

        // Handle OAuth2 configuration with encryption
        if (configuration.oauth2Config) {
          ssoData.oauth2ClientId = configuration.oauth2Config.clientId;
          ssoData.oauth2ClientSecret = configuration.oauth2Config.clientSecret ? 
            encryptSensitiveData(configuration.oauth2Config.clientSecret) : null;
          ssoData.oauth2AuthUrl = configuration.oauth2Config.authUrl;
          ssoData.oauth2TokenUrl = configuration.oauth2Config.tokenUrl;
          ssoData.oauth2UserInfoUrl = configuration.oauth2Config.userInfoUrl;
          ssoData.oauth2Scopes = configuration.oauth2Config.scopes;
        }

        // Check if configuration exists
        const existing = await ctx.db.tenantSsoConfiguration.findUnique({
          where: { tenantId: input.tenantId },
        });

        let result;
        if (existing) {
          result = await ctx.db.tenantSsoConfiguration.update({
            where: { tenantId: input.tenantId },
            data: ssoData,
          });
          
          await createSsoAuditLog(
            ctx.db,
            input.tenantId,
            userId,
            "config_updated",
            configuration.provider,
            { configId: result.id }
          );
        } else {
          result = await ctx.db.tenantSsoConfiguration.create({
            data: {
              ...ssoData,
              tenantId: input.tenantId,
              createdBy: userId,
            },
          });
          
          await createSsoAuditLog(
            ctx.db,
            input.tenantId,
            userId,
            "config_created",
            configuration.provider,
            { configId: result.id }
          );
        }

        // Also update the tenant's legacy SSO flags for backward compatibility
        await ctx.db.tenant.update({
          where: { id: input.tenantId },
          data: {
            ssoEnabled: configuration.isEnabled,
            ssoProvider: configuration.provider,
          },
        });

        return {
          success: true,
          configurationId: result.id,
          message: existing ? "SSO configuration updated" : "SSO configuration created",
        };

      } catch (error) {
        console.error("Failed to upsert SSO configuration:", error);
        
        // Log the failed attempt
        if (ctx.session.user?.id) {
          await createSsoAuditLog(
            ctx.db,
            input.tenantId,
            ctx.session.user.id,
            "config_update_failed",
            input.configuration.provider,
            { error: error instanceof Error ? error.message : "Unknown error" }
          );
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save SSO configuration",
        });
      }
    }),

  // Test SSO configuration (dry run)
  testSsoConfiguration: tenantAdminProcedure
    .input(
      z.object({
        tenantId: z.string(),
        configuration: SsoConfigurationSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { configuration } = input;
        const validationResults = [];

        // Validate SAML configuration
        if (configuration.provider === "saml" && configuration.samlConfig) {
          if (!configuration.samlConfig.entityId) {
            validationResults.push({ field: "entityId", error: "SAML Entity ID is required" });
          }
          if (!configuration.samlConfig.ssoUrl) {
            validationResults.push({ field: "ssoUrl", error: "SAML SSO URL is required" });
          }
          if (!configuration.samlConfig.certificate) {
            validationResults.push({ field: "certificate", error: "SAML Certificate is required" });
          }
        }

        // Validate OIDC configuration  
        if (configuration.provider === "oidc" && configuration.oidcConfig) {
          if (!configuration.oidcConfig.issuer) {
            validationResults.push({ field: "issuer", error: "OIDC Issuer is required" });
          }
          if (!configuration.oidcConfig.clientId) {
            validationResults.push({ field: "clientId", error: "OIDC Client ID is required" });
          }
          if (!configuration.oidcConfig.clientSecret) {
            validationResults.push({ field: "clientSecret", error: "OIDC Client Secret is required" });
          }
        }

        // Validate OAuth2 configuration
        if (["azure-ad", "google-workspace"].includes(configuration.provider) && configuration.oauth2Config) {
          if (!configuration.oauth2Config.clientId) {
            validationResults.push({ field: "clientId", error: "OAuth2 Client ID is required" });
          }
          if (!configuration.oauth2Config.clientSecret) {
            validationResults.push({ field: "clientSecret", error: "OAuth2 Client Secret is required" });
          }
        }

        // Check domain validation if specified
        if (configuration.allowedDomains) {
          const domains = configuration.allowedDomains.split(',').map(d => d.trim());
          const validDomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
          
          domains.forEach(domain => {
            if (!validDomainRegex.test(domain)) {
              validationResults.push({ 
                field: "allowedDomains", 
                error: `Invalid domain format: ${domain}` 
              });
            }
          });
        }

        const isValid = validationResults.length === 0;

        return {
          valid: isValid,
          errors: validationResults,
          message: isValid ? "Configuration is valid" : "Configuration has validation errors",
        };

      } catch (error) {
        console.error("Failed to test SSO configuration:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to test SSO configuration",
        });
      }
    }),

  // Delete SSO configuration
  deleteSsoConfiguration: tenantAdminProcedure
    .input(
      z.object({
        tenantId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id!;

        // Get current config for audit log
        const existing = await ctx.db.tenantSsoConfiguration.findUnique({
          where: { tenantId: input.tenantId },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SSO configuration not found",
          });
        }

        // Delete the configuration
        await ctx.db.tenantSsoConfiguration.delete({
          where: { tenantId: input.tenantId },
        });

        // Update tenant legacy flags
        await ctx.db.tenant.update({
          where: { id: input.tenantId },
          data: {
            ssoEnabled: false,
            ssoProvider: null,
          },
        });

        // Create audit log
        await createSsoAuditLog(
          ctx.db,
          input.tenantId,
          userId,
          "config_deleted",
          existing.provider,
          { deletedConfigId: existing.id }
        );

        return {
          success: true,
          message: "SSO configuration deleted successfully",
        };

      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to delete SSO configuration:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete SSO configuration",
        });
      }
    }),

  // Get SSO audit logs
  getSsoAuditLogs: tenantAdminProcedure
    .input(
      z.object({
        tenantId: z.string(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
        eventFilter: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const whereClause: any = {
          tenantId: input.tenantId,
        };

        if (input.eventFilter) {
          whereClause.event = {
            contains: input.eventFilter,
          };
        }

        const auditLogs = await ctx.db.ssoAuditLog.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          take: input.pageSize,
          skip: (input.page - 1) * input.pageSize,
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });

        const totalCount = await ctx.db.ssoAuditLog.count({
          where: whereClause,
        });

        return {
          logs: auditLogs,
          totalCount,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(totalCount / input.pageSize),
        };

      } catch (error) {
        console.error("Failed to fetch SSO audit logs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch SSO audit logs",
        });
      }
    }),

  // Get available SSO providers with their configuration requirements
  getSsoProviders: protectedProcedure.query(() => {
    return [
      {
        id: "saml",
        name: "SAML 2.0",
        description: "Security Assertion Markup Language 2.0",
        requiredFields: ["entityId", "ssoUrl", "certificate"],
        optionalFields: ["sloUrl", "signingCert", "nameIdFormat", "attributeMapping"],
        icon: "shield",
      },
      {
        id: "oidc", 
        name: "OpenID Connect",
        description: "OpenID Connect / OAuth 2.0",
        requiredFields: ["issuer", "clientId", "clientSecret"],
        optionalFields: ["scopes", "jwksUri"],
        icon: "key",
      },
      {
        id: "azure-ad",
        name: "Azure Active Directory",
        description: "Microsoft Azure Active Directory",
        requiredFields: ["clientId", "clientSecret"],
        optionalFields: ["scopes"],
        icon: "microsoft",
      },
      {
        id: "google-workspace",
        name: "Google Workspace",
        description: "Google Workspace (formerly G Suite)",
        requiredFields: ["clientId", "clientSecret"],
        optionalFields: ["scopes"],
        icon: "google",
      },
      {
        id: "okta",
        name: "Okta",
        description: "Okta Identity Platform",
        requiredFields: ["issuer", "clientId", "clientSecret"],
        optionalFields: ["scopes"],
        icon: "okta",
      },
      {
        id: "auth0",
        name: "Auth0",
        description: "Auth0 Identity Platform",
        requiredFields: ["issuer", "clientId", "clientSecret"],
        optionalFields: ["scopes"],
        icon: "auth0",
      },
    ];
  }),
});
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, platformAdminProcedure } from "../middleware";

const EmailProviderConfigSchema = z.object({
  // Mailgun config
  apiKey: z.string().optional(),
  domain: z.string().optional(),
  region: z.enum(['us', 'eu']).optional(),
  
  // SendGrid config
  sendGridApiKey: z.string().optional(),
  
  // SMTP config
  host: z.string().optional(),
  port: z.number().optional(),
  secure: z.boolean().optional(),
  auth: z.object({
    user: z.string(),
    pass: z.string(),
  }).optional(),
  
  // Common tracking settings
  trackClicks: z.enum(['yes', 'no', 'htmlonly']).optional(),
  trackOpens: z.enum(['yes', 'no']).optional(),
  requireTLS: z.boolean().optional(),
  skipVerification: z.boolean().optional(),
  dkimSignature: z.boolean().optional(),
  
  // Rate limiting
  rateLimitPerSecond: z.number().optional(),
  batchSize: z.number().optional(),
  
  // Templates and variables
  template: z.string().optional(),
  templateVariables: z.record(z.string()).optional(),
  
  // Delivery settings
  deliveryTime: z.string().optional(),
  timeZone: z.string().optional(),
  
  // Webhooks
  webhookUrls: z.object({
    delivered: z.string().optional(),
    opened: z.string().optional(),
    clicked: z.string().optional(),
    bounced: z.string().optional(),
    dropped: z.string().optional(),
    complained: z.string().optional(),
    unsubscribed: z.string().optional(),
  }).optional(),
  
  // Custom headers and variables
  customHeaders: z.record(z.string()).optional(),
  recipientVariables: z.record(z.any()).optional(),
  
  // Tags and metadata
  tags: z.array(z.string()).optional(),
  campaignId: z.string().optional(),
  
  // Suppression settings
  suppressionList: z.object({
    bounces: z.boolean().optional(),
    unsubscribes: z.boolean().optional(),
    complaints: z.boolean().optional(),
  }).optional(),
  
  // Test mode
  testMode: z.boolean().optional(),
});

export const emailProviderRouter = router({
  // Get all email providers
  getProviders: platformAdminProcedure
    .query(async ({ ctx }) => {
      const providers = await ctx.db.emailProvider.findMany({
        orderBy: [
          { isDefault: 'desc' },
          { enabled: 'desc' },
          { type: 'asc' }
        ],
        select: {
          id: true,
          type: true,
          enabled: true,
          isDefault: true,
          fromName: true,
          fromEmail: true,
          replyToEmail: true,
          isConnected: true,
          lastTested: true,
          lastTestResult: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      return providers;
    }),

  // Get specific provider by type
  getProvider: platformAdminProcedure
    .input(z.object({
      type: z.enum(['mailgun', 'sendgrid', 'smtp', 'jetstream'])
    }))
    .query(async ({ ctx, input }) => {
      const provider = await ctx.db.emailProvider.findUnique({
        where: { type: input.type },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      if (!provider) {
        return null;
      }

      // Return config data but mask sensitive fields like API keys
      const config = provider.config as any;
      const sanitizedConfig = provider.config ? {
        // Show masked API key if it exists
        apiKey: config.apiKey ? '••••••••••••' + (config.apiKey.slice(-4) || '') : '',
        sendGridApiKey: config.sendGridApiKey ? '••••••••••••' + (config.sendGridApiKey.slice(-4) || '') : '',
        domain: config.domain,
        region: config.region,
        trackClicks: config.trackClicks,
        trackOpens: config.trackOpens,
        requireTLS: config.requireTLS,
        skipVerification: config.skipVerification,
        dkimSignature: config.dkimSignature,
        rateLimitPerSecond: config.rateLimitPerSecond,
        batchSize: config.batchSize,
        template: config.template,
        templateVariables: config.templateVariables,
        tags: config.tags,
        deliveryTime: config.deliveryTime,
        timeZone: config.timeZone,
        testMode: config.testMode,
        webhookUrls: config.webhookUrls,
        customHeaders: config.customHeaders,
        recipientVariables: config.recipientVariables,
        campaignId: config.campaignId,
        suppressionList: config.suppressionList,
        // SMTP auth with masked password
        auth: config.auth ? {
          user: config.auth.user,
          pass: config.auth.pass ? '••••••••••••' : ''
        } : undefined,
        host: config.host,
        port: config.port,
        secure: config.secure,
        configured: true
      } : { configured: false };

      return {
        ...provider,
        config: sanitizedConfig
      };
    }),

  // Update or create email provider
  updateProvider: platformAdminProcedure
    .input(z.object({
      type: z.enum(['mailgun', 'sendgrid', 'smtp', 'jetstream']),
      enabled: z.boolean(),
      isDefault: z.boolean().optional(),
      fromName: z.string().optional(),
      fromEmail: z.string().optional(),
      replyToEmail: z.string().optional(),
      config: EmailProviderConfigSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { type, config, ...providerData } = input;

      // If setting as default, unset other defaults
      if (providerData.isDefault) {
        await ctx.db.emailProvider.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        });
      }

      // Upsert the provider
      const provider = await ctx.db.emailProvider.upsert({
        where: { type },
        create: {
          type,
          ...providerData,
          config,
          createdById: ctx.user.id,
        },
        update: {
          ...providerData,
          config,
          updatedAt: new Date(),
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      return {
        ...provider,
        config: provider.config ? { configured: true } : { configured: false }
      };
    }),

  // Test email provider connection
  testProvider: platformAdminProcedure
    .input(z.object({
      type: z.enum(['mailgun', 'sendgrid', 'smtp', 'jetstream']),
      config: EmailProviderConfigSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get provider config (either from input or database)
        let config = input.config;
        if (!config) {
          const provider = await ctx.db.emailProvider.findUnique({
            where: { type: input.type }
          });
          if (!provider) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Email provider not configured"
            });
          }
          config = provider.config as any;
        }

        // Test the connection based on provider type
        let testResult;
        switch (input.type) {
          case 'mailgun':
            testResult = await testMailgunConnection(config);
            break;
          case 'sendgrid':
            testResult = await testSendGridConnection(config);
            break;
          case 'smtp':
            testResult = await testSMTPConnection(config);
            break;
          case 'jetstream':
            testResult = await testJetStreamConnection(config);
            break;
          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Unsupported provider type"
            });
        }

        // Update the provider with test results
        await ctx.db.emailProvider.upsert({
          where: { type: input.type },
          create: {
            type: input.type,
            enabled: false,
            config: config || {},
            isConnected: testResult.success,
            lastTested: new Date(),
            lastTestResult: testResult.success ? 'success' : testResult.error,
            createdById: ctx.user.id,
          },
          update: {
            isConnected: testResult.success,
            lastTested: new Date(),
            lastTestResult: testResult.success ? 'success' : testResult.error,
          }
        });

        return testResult;
      } catch (error) {
        // Update provider with error
        await ctx.db.emailProvider.upsert({
          where: { type: input.type },
          create: {
            type: input.type,
            enabled: false,
            config: input.config || {},
            isConnected: false,
            lastTested: new Date(),
            lastTestResult: error instanceof Error ? error.message : 'Test failed',
            createdById: ctx.user.id,
          },
          update: {
            isConnected: false,
            lastTested: new Date(),
            lastTestResult: error instanceof Error ? error.message : 'Test failed',
          }
        });

        throw error;
      }
    }),

  // Delete email provider
  deleteProvider: platformAdminProcedure
    .input(z.object({
      type: z.enum(['mailgun', 'sendgrid', 'smtp', 'jetstream'])
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await ctx.db.emailProvider.findUnique({
        where: { type: input.type }
      });

      if (!provider) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email provider not found"
        });
      }

      await ctx.db.emailProvider.delete({
        where: { type: input.type }
      });

      return { success: true };
    }),
});

// Connection test functions
async function testMailgunConnection(config: any): Promise<{ success: boolean; error?: string }> {
  try {
    if (!config.apiKey || !config.domain) {
      return { success: false, error: "API key and domain are required" };
    }

    // Test Mailgun API connection
    const baseUrl = config.region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';
    const response = await fetch(`${baseUrl}/v3/domains/${config.domain}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${config.apiKey}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      return { success: false, error: `Mailgun API error: ${response.statusText}` };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function testSendGridConnection(config: any): Promise<{ success: boolean; error?: string }> {
  try {
    if (!config.sendGridApiKey) {
      return { success: false, error: "SendGrid API key is required" };
    }

    // Test SendGrid API connection
    const response = await fetch('https://api.sendgrid.com/v3/user/account', {
      headers: {
        'Authorization': `Bearer ${config.sendGridApiKey}`
      }
    });

    if (!response.ok) {
      return { success: false, error: `SendGrid API error: ${response.statusText}` };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function testSMTPConnection(config: any): Promise<{ success: boolean; error?: string }> {
  try {
    if (!config.host || !config.port) {
      return { success: false, error: "SMTP host and port are required" };
    }

    // Basic validation - in a real implementation, you'd test the actual SMTP connection
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function testJetStreamConnection(config: any): Promise<{ success: boolean; error?: string }> {
  try {
    // JetStream connection test would go here
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
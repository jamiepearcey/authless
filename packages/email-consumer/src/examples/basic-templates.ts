import type { EmailRoutingRule, ReactEmailTemplate } from '../types.js';

// Example React Email templates
// In a real implementation, these would be actual React components
export const exampleTemplates = new Map<string, ReactEmailTemplate>([
  [
    'welcome-email',
    {
      name: 'welcome-email',
      component: (props: any) => null, // Placeholder - would be actual React component
      subject: 'Welcome to Authless London!',
      variables: ['userName', 'userEmail', 'tenantName'],
      metadata: {
        category: 'onboarding',
        description: 'Welcome email sent to new users',
        previewText: 'Welcome to our platform! Get started with your account.',
      },
    }
  ],
  [
    'notification-alert',
    {
      name: 'notification-alert',
      component: (props: any) => null, // Placeholder - would be actual React component
      subject: (variables: Record<string, any>) => 
        `Alert: ${variables.alertType} - ${variables.alertTitle}`,
      variables: ['alertType', 'alertTitle', 'alertMessage', 'tenantName', 'priority'],
      metadata: {
        category: 'alerts',
        description: 'System alert notifications',
        previewText: 'Important system alert requiring your attention.',
      },
    }
  ],
  [
    'case-update',
    {
      name: 'case-update',
      component: (props: any) => null, // Placeholder - would be actual React component
      subject: (variables: Record<string, any>) => 
        `Case Update: ${variables.caseNumber} - ${variables.updateType}`,
      variables: ['caseNumber', 'caseTitle', 'updateType', 'updateMessage', 'tenantName'],
      metadata: {
        category: 'support',
        description: 'Support case updates and notifications',
        previewText: 'Your support case has been updated.',
      },
    }
  ],
]);

// Example routing rules
export const exampleRoutingRules: EmailRoutingRule[] = [
  {
    eventPattern: 'user.registered',
    templateName: 'welcome-email',
    priority: 'high',
    extractVariables: (event) => ({
      userName: event.payload.userName || 'User',
      userEmail: event.payload.userEmail || '',
      tenantName: event.payload.tenantName || event.tenantId || 'System',
    }),
    condition: (event) => event.payload.userEmail && event.payload.userName,
  },
  {
    eventPattern: 'alert.*',
    templateName: 'notification-alert',
    priority: 'urgent',
    extractVariables: (event) => ({
      alertType: event.eventName.split('.')[1] || 'unknown',
      alertTitle: event.payload.title || 'System Alert',
      alertMessage: event.payload.message || 'An alert has been triggered',
      tenantName: event.tenantId || 'System',
      priority: event.payload.priority || 'normal',
    }),
  },
  {
    eventPattern: 'support.case.*',
    templateName: 'case-update',
    priority: 'normal',
    extractVariables: (event) => ({
      caseNumber: event.payload.caseNumber || event.payload.caseId || 'Unknown',
      caseTitle: event.payload.caseTitle || event.payload.title || 'Support Case',
      updateType: event.eventName.split('.')[2] || 'updated',
      updateMessage: event.payload.updateMessage || event.payload.message || 'Case has been updated',
      tenantName: event.tenantId || 'System',
    }),
  },
  {
    eventPattern: 'tenant.*',
    templateName: 'notification-alert',
    priority: 'normal',
    extractVariables: (event) => ({
      alertType: 'tenant',
      alertTitle: `Tenant ${event.eventName.split('.')[1] || 'Event'}`,
      alertMessage: event.payload.message || 'Tenant-related event occurred',
      tenantName: event.tenantId || 'System',
      priority: 'normal',
    }),
    condition: (event) => event.tenantId && event.payload.message,
  },
];

// Helper function to create a complete email consumer configuration
export function createExampleEmailConfig() {
  return {
    natsUrl: process.env.NATS_URL || 'nats://localhost:4223',
    streamName: 'events',
    consumerName: 'email-consumer',
    filterSubjects: ['events.*'],
    batchSize: 5,
    concurrency: 3,
    provider: {
      type: 'smtp' as const,
      host: 'localhost',
      port: 1025,
      secure: false,
      auth: {
        user: 'test',
        pass: 'test',
      },
    },
    defaultFrom: {
      email: 'noreply@beatthefinelondon.com',
      name: 'Authless London',
    },
    routingRules: exampleRoutingRules,
    templates: exampleTemplates,
    database: {
      getRecipients: async (eventName: string, tenantId?: string) => [
        {
          email: 'test@example.com',
          name: 'Test User',
          userId: 'test-user',
        }
      ],
      logEmailDelivery: async (result: any) => {
        console.log('Email delivery logged:', result);
      },
    },
  };
}

// Example configuration with Mailgun provider
export function createMailgunEmailConfig() {
  return {
    natsUrl: process.env.NATS_URL || 'nats://localhost:4223',
    streamName: 'events',
    consumerName: 'email-consumer',
    filterSubjects: ['events.*'],
    batchSize: 5,
    concurrency: 3,
    provider: {
      type: 'mailgun' as const,
      apiKey: process.env.MAILGUN_API_KEY || 'your-mailgun-api-key',
      domain: process.env.MAILGUN_DOMAIN || 'your-domain.com',
    },
    defaultFrom: {
      email: 'noreply@your-domain.com',
      name: 'Your System',
    },
    routingRules: exampleRoutingRules,
    templates: exampleTemplates,
    database: {
      getRecipients: async (eventName: string, tenantId?: string) => [
        {
          email: 'test@example.com',
          name: 'Test User',
          userId: 'test-user',
        }
      ],
      logEmailDelivery: async (result: any) => {
        console.log('Email delivery logged:', result);
      },
    },
  };
}

// Example configuration with SendGrid provider
export function createSendGridEmailConfig() {
  return {
    natsUrl: process.env.NATS_URL || 'nats://localhost:4223',
    streamName: 'events',
    consumerName: 'email-consumer',
    filterSubjects: ['events.*'],
    batchSize: 5,
    concurrency: 3,
    provider: {
      type: 'sendgrid' as const,
      apiKey: process.env.SENDGRID_API_KEY || 'your-sendgrid-api-key',
    },
    defaultFrom: {
      email: 'noreply@your-domain.com',
      name: 'Your System',
    },
    routingRules: exampleRoutingRules,
    templates: exampleTemplates,
    database: {
      getEmailTemplates: async () => [], // Legacy support
      getRecipients: async (eventName: string, tenantId?: string) => [
        {
          email: 'test@example.com',
          name: 'Test User',
          userId: 'test-user',
        }
      ],
      logEmailDelivery: async (result: any) => {
        console.log('Email delivery logged:', result);
      },
    },
  };
}

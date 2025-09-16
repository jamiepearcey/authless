import type { EmailRoutingRule, ReactEmailTemplate } from '../types.js';

// Example React Email templates
// In a real implementation, these would be actual React components
export const exampleTemplates = new Map<string, ReactEmailTemplate>([
  [
    'welcome-email',
    {
      name: 'welcome-email',
      component: (props: any) => null, // Placeholder - would be actual React component
      subject: 'Welcome to Authless uk!',
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
  [
    'invitation_created_template',
    {
      name: 'invitation_created_template',
      component: (props: any) => null, // Placeholder - would be actual React component
      subject: (variables: Record<string, any>) => 
        `You're invited to join ${variables.tenantSlug}`,
      variables: ['email', 'role', 'tenantSlug', 'invitedByEmail', 'inviteUrl', 'message', 'expiresAt'],
      metadata: {
        category: 'invitations',
        description: 'Invitation email sent to new team members',
        previewText: 'You have been invited to join our team!',
      },
    }
  ],
]);

// Email routing rules for notification delivery events
// The email service should ONLY handle notification.delivery.created events
export const exampleRoutingRules: EmailRoutingRule[] = [
  // Invitation email delivery
  {
    eventPattern: 'notification.delivery.created',
    templateName: 'invitation_created_template',
    priority: 'high',
    extractVariables: (event) => {
      // Type guard to ensure this is an EmailDeliveryEvent
      if ('notification' in event && event.notification) {
        const templateVariables = event.notification.templateVariables || {};
        return {
          email: templateVariables.email || '',
          role: templateVariables.role || 'member',
          tenantSlug: templateVariables.tenantSlug || event.tenantId || '',
          invitedByEmail: templateVariables.invitedByEmail || '',
          inviteUrl: templateVariables.inviteUrl || '',
          message: templateVariables.message || 'You have been invited to join our team!',
          expiresAt: templateVariables.expiresAt || '',
        };
      }
      // Fallback for malformed events
      return {
        email: '',
        role: 'member',
        tenantSlug: '',
        invitedByEmail: '',
        inviteUrl: '',
        message: 'You have been invited to join our team!',
        expiresAt: '',
      };
    },
    condition: (event) => {
      // Type guard to check if this is an EmailDeliveryEvent with notification
      if ('notification' in event && event.notification) {
        const templateId = event.notification.templateId;
        return templateId === 'invitation_created_template';
      }
      return false;
    },
  },
  
  // Welcome email delivery
  {
    eventPattern: 'notification.delivery.created',
    templateName: 'welcome-email',
    priority: 'high',
    extractVariables: (event) => {
      if ('notification' in event && event.notification) {
        const templateVariables = event.notification.templateVariables || {};
        return {
          userName: templateVariables.userName || 'User',
          userEmail: templateVariables.userEmail || '',
          tenantName: templateVariables.tenantName || 'System',
        };
      }
      return {
        userName: 'User',
        userEmail: '',
        tenantName: 'System',
      };
    },
    condition: (event) => {
      if ('notification' in event && event.notification) {
        const templateId = event.notification.templateId;
        return templateId === 'welcome-email';
      }
      return false;
    },
  },
  
  // Alert email delivery
  {
    eventPattern: 'notification.delivery.created',
    templateName: 'notification-alert',
    priority: 'urgent',
    extractVariables: (event) => {
      if ('notification' in event && event.notification) {
        const templateVariables = event.notification.templateVariables || {};
        return {
          alertType: templateVariables.alertType || 'unknown',
          alertTitle: templateVariables.alertTitle || 'System Alert',
          alertMessage: templateVariables.alertMessage || 'An alert has been triggered',
          tenantName: templateVariables.tenantName || 'System',
          priority: templateVariables.priority || 'normal',
        };
      }
      return {
        alertType: 'unknown',
        alertTitle: 'System Alert',
        alertMessage: 'An alert has been triggered',
        tenantName: 'System',
        priority: 'normal',
      };
    },
    condition: (event) => {
      if ('notification' in event && event.notification) {
        const templateId = event.notification.templateId;
        return templateId === 'notification-alert';
      }
      return false;
    },
  },
  
  // Case update email delivery
  {
    eventPattern: 'notification.delivery.created',
    templateName: 'case-update',
    priority: 'normal',
    extractVariables: (event) => {
      if ('notification' in event && event.notification) {
        const templateVariables = event.notification.templateVariables || {};
        return {
          caseNumber: templateVariables.caseNumber || 'Unknown',
          caseTitle: templateVariables.caseTitle || 'Support Case',
          updateType: templateVariables.updateType || 'updated',
          updateMessage: templateVariables.updateMessage || 'Case has been updated',
          tenantName: templateVariables.tenantName || 'System',
        };
      }
      return {
        caseNumber: 'Unknown',
        caseTitle: 'Support Case',
        updateType: 'updated',
        updateMessage: 'Case has been updated',
        tenantName: 'System',
      };
    },
    condition: (event) => {
      if ('notification' in event && event.notification) {
        const templateId = event.notification.templateId;
        return templateId === 'case-update';
      }
      return false;
    },
  },
];

// Helper function to create a complete email consumer configuration
export function createExampleEmailConfig() {
  return {
    natsUrl: process.env.NATS_URL || 'nats://127.0.0.1:4223',
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
      email: 'noreply@authlessuk.com',
      name: 'Authless uk',
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
    natsUrl: process.env.NATS_URL || 'nats://127.0.0.1:4223',
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
    natsUrl: process.env.NATS_URL || 'nats://127.0.0.1:4223',
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

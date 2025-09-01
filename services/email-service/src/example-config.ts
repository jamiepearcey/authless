import { EmailServiceConfig } from './index.js';

/**
 * Example configuration for development
 */
export const exampleConfig: EmailServiceConfig = {
  serviceName: 'email-service',
  version: '1.0.0',
  natsUrl: 'nats://localhost:4222',
  streamName: 'EVENTS',
  consumerName: 'email_service',
  databaseUrl: 'postgresql://user:password@localhost:5432/db',
  provider: {
    type: 'mailgun',
    apiKey: process.env.MAILGUN_API_KEY || '',
    domain: process.env.MAILGUN_DOMAIN || '',
  },
  routingRules: [
    {
      eventPattern: 'user.registered',
      templateName: 'welcome-email',
      priority: 'high',
      extractVariables: (event) => ({
        userName: event.payload.userName,
        userEmail: event.payload.userEmail,
      }),
    },
    {
      eventPattern: 'payment.completed',
      templateName: 'payment-receipt',
      priority: 'normal',
      extractVariables: (event) => ({
        userName: event.payload.userName,
        amount: event.payload.amount,
        currency: event.payload.currency,
        transactionId: event.payload.transactionId,
      }),
    },
  ],
  templates: new Map([
    ['welcome-email', {
      name: 'welcome-email',
      component: null, // Will be imported from templates
      subject: 'Welcome {{userName}}!',
      variables: ['userName', 'userEmail'],
    }],
    ['payment-receipt', {
      name: 'payment-receipt',
      component: null, // Will be imported from templates
      subject: 'Payment Receipt - {{transactionId}}',
      variables: ['userName', 'amount', 'currency', 'transactionId'],
    }],
  ]),
  filterSubjects: ['events.*.user.registered', 'events.*.payment.completed'],
  defaultFrom: {
    email: 'noreply@example.com',
    name: 'Example System',
  },
  concurrency: 5,
  batchSize: 1,
  retryLimit: 3,
  retryBackoffMs: 1000,
  port: 8080,
  metricsPort: 9090,
};

/**
 * Minimal configuration for testing
 */
export const minimalConfig: EmailServiceConfig = {
  serviceName: 'email-service-test',
  version: '1.0.0',
  natsUrl: 'nats://localhost:4222',
  streamName: 'EVENTS',
  consumerName: 'email_service_test',
  databaseUrl: 'postgresql://user:password@localhost:5432/db',
  provider: {
    type: 'smtp',
    host: 'localhost',
    port: 1025, // MailHog for testing
    secure: false,
  },
  routingRules: [
    {
      eventPattern: 'test.*',
      templateName: 'test-email',
      priority: 'normal',
      extractVariables: (event) => ({
        message: event.payload.message,
      }),
    },
  ],
  templates: new Map([
    ['test-email', {
      name: 'test-email',
      component: null,
      subject: 'Test Email: {{message}}',
      variables: ['message'],
    }],
  ]),
  filterSubjects: ['events.*.test.*'],
  defaultFrom: {
    email: 'test@example.com',
    name: 'Test System',
  },
  concurrency: 1,
  batchSize: 1,
  port: 8081,
  metricsPort: 9091,
};

/**
 * Production configuration
 */
export const productionConfig: EmailServiceConfig = {
  serviceName: 'email-service',
  version: '1.0.0',
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  streamName: 'EVENTS',
  consumerName: 'email_service',
  databaseUrl: process.env.DATABASE_URL || '',
  provider: {
    type: 'mailgun',
    apiKey: process.env.MAILGUN_API_KEY || '',
    domain: process.env.MAILGUN_DOMAIN || '',
  },
  routingRules: [
    {
      eventPattern: 'user.registered',
      templateName: 'welcome-email',
      priority: 'high',
      extractVariables: (event) => ({
        userName: event.payload.userName,
        userEmail: event.payload.userEmail,
        activationLink: event.payload.activationLink,
      }),
    },
    {
      eventPattern: 'user.password_reset',
      templateName: 'password-reset',
      priority: 'urgent',
      extractVariables: (event) => ({
        userName: event.payload.userName,
        resetLink: event.payload.resetLink,
        expiryTime: event.payload.expiryTime,
      }),
    },
    {
      eventPattern: 'payment.completed',
      templateName: 'payment-receipt',
      priority: 'normal',
      extractVariables: (event) => ({
        userName: event.payload.userName,
        amount: event.payload.amount,
        currency: event.payload.currency,
        transactionId: event.payload.transactionId,
        items: event.payload.items,
      }),
    },
    {
      eventPattern: 'support.ticket_created',
      templateName: 'support-ticket',
      priority: 'normal',
      extractVariables: (event) => ({
        userName: event.payload.userName,
        ticketId: event.payload.ticketId,
        subject: event.payload.subject,
        priority: event.payload.priority,
      }),
    },
  ],
  templates: new Map([
    ['welcome-email', {
      name: 'welcome-email',
      component: null, // Will be imported from templates
      subject: 'Welcome to {{companyName}}, {{userName}}!',
      variables: ['userName', 'userEmail', 'companyName', 'activationLink'],
    }],
    ['password-reset', {
      name: 'password-reset',
      component: null, // Will be imported from templates
      subject: 'Password Reset Request - {{userName}}',
      variables: ['userName', 'resetLink', 'expiryTime'],
    }],
    ['payment-receipt', {
      name: 'payment-receipt',
      component: null, // Will be imported from templates
      subject: 'Payment Receipt - {{transactionId}}',
      variables: ['userName', 'amount', 'currency', 'transactionId', 'items'],
    }],
    ['support-ticket', {
      name: 'support-ticket',
      component: null, // Will be imported from templates
      subject: 'Support Ticket Created - {{ticketId}}',
      variables: ['userName', 'ticketId', 'subject', 'priority'],
    }],
  ]),
  filterSubjects: [
    'events.*.user.registered',
    'events.*.user.password_reset',
    'events.*.payment.completed',
    'events.*.support.ticket_created',
  ],
  defaultFrom: {
    email: process.env.FROM_EMAIL || 'noreply@example.com',
    name: process.env.FROM_NAME || 'Example System',
  },
  concurrency: 10,
  batchSize: 5,
  retryLimit: 5,
  retryBackoffMs: 2000,
  port: parseInt(process.env.PORT || '8080'),
  metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
};

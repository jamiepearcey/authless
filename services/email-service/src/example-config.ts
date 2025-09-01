import { EmailServiceConfig } from './index.js';

/**
 * Example configuration for the Email Service
 */
export const exampleConfig: EmailServiceConfig = {
  serviceName: 'email-service',
  version: '1.0.0',
  natsUrl: 'nats://localhost:4223',
  streamName: 'EVENTS',
  consumerName: 'email_consumer',
  databaseUrl: 'postgresql://postgres:postgres@localhost:5432/authless',
  
  // Email provider configuration
  provider: {
    type: 'mailgun',
    apiKey: process.env.MAILGUN_API_KEY || 'your-mailgun-api-key',
    domain: process.env.MAILGUN_DOMAIN || 'your-domain.com',
  },
  
  // Processing configuration
  concurrency: 5,
  batchSize: 1,
  ackWaitMs: 30000,
  retryLimit: 3,
  retryBackoffMs: 1000,
  
  // Health and monitoring
  port: 8080,
  metricsPort: 9091,
  
  // Filter subjects for email events
  filterSubjects: ['email.*'],
  
  // Default sender configuration
  defaultFrom: {
    email: 'noreply@your-domain.com',
    name: 'Your App',
  },
  
  // Email routing rules
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
  
  // Email templates
  templates: new Map([
    ['welcome-email', {
      name: 'welcome-email',
      subject: 'Welcome {{userName}}!',
      variables: ['userName', 'userEmail'],
    }],
    ['payment-receipt', {
      name: 'payment-receipt', 
      subject: 'Payment Receipt - {{transactionId}}',
      variables: ['userName', 'amount', 'currency', 'transactionId'],
    }],
  ]),
};

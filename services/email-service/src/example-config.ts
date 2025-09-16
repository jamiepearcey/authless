import { EmailServiceConfig } from './index.js';
import { PaymentReceipt } from './templates/payment-receipt.js';
import { WelcomeEmail } from './templates/welcome-email.js';
import { NotificationEmail } from './templates/notification-email.js';
import { EmailVerification } from './templates/email-verification.js';
import { PasswordReset } from './templates/password-reset.js';

/**
 * Example configuration for the Email Service
 */
export const exampleConfig: EmailServiceConfig = {
  serviceName: 'email-service',
  version: '1.0.0',
  natsUrl: 'nats://127.0.0.1:4223',
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
  retryLimit: 3,
  retryBackoffMs: 1000,
  
  // Health and monitoring
  port: 8083,
  metricsPort: 9093,
  
  // Filter subjects for email delivery events from notification service
  filterSubjects: ['delivery.email.*'],
  
  // Default sender configuration
  defaultFrom: {
    email: 'noreply@your-domain.com',
    name: 'Your App',
  },
  
  // Email routing rules for notification delivery events
  routingRules: [
    {
      eventPattern: 'notification.delivery.created',
      templateName: 'notification-email',
      priority: 'normal',
      extractVariables: (event) => {
        const notification = event.notification || {};
        return {
          title: notification.title || 'Notification',
          description: notification.description || '',
          type: notification.type || 'info',
          ...notification.templateVariables || {},
          ...notification.dataJson || {}
        };
      },
      condition: (event) => event.channel === 'email'
    },
    // Authentication flow events
    {
      eventPattern: 'user.registration.email_verification_required',
      templateName: 'email-verification',
      priority: 'high',
      extractVariables: (event) => ({
        name: event.payload.name,
        email: event.payload.email,
        callbackUrl: event.payload.callbackUrl,
        token: event.payload.token,
      }),
    },
    {
      eventPattern: 'user.password_reset.requested',
      templateName: 'password-reset',
      priority: 'high',
      extractVariables: (event) => ({
        name: event.payload.name,
        email: event.payload.email,
        callbackUrl: event.payload.callbackUrl,
        token: event.payload.token,
      }),
    },
    // Legacy routing rules for backward compatibility
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
    ['notification-email', {
      name: 'notification-email',
      component: NotificationEmail,
      subject: '{{title}}',
      variables: ['title', 'description', 'type'],
    }],
    ['email-verification', {
      name: 'email-verification',
      component: EmailVerification,
      subject: 'Please verify your email address',
      variables: ['name', 'email', 'callbackUrl', 'token'],
    }],
    ['password-reset', {
      name: 'password-reset',
      component: PasswordReset,
      subject: 'Reset your password',
      variables: ['name', 'email', 'callbackUrl', 'token'],
    }],
    ['welcome-email', {
      name: 'welcome-email',
      component: WelcomeEmail,
      subject: 'Welcome {{userName}}!',
      variables: ['userName', 'userEmail'],
    }],
    ['payment-receipt', {
      name: 'payment-receipt', 
      component: PaymentReceipt,
      subject: 'Payment Receipt - {{transactionId}}',
      variables: ['userName', 'amount', 'currency', 'transactionId'],
    }],
  ]),
};

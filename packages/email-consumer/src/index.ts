export { EmailService } from './consumer.js';
export { EmailRouter } from './email-router.js';
export { ReactEmailRenderer } from './react-email-renderer.js';
export { createEmailProvider, EmailProvider, SMTPProvider, SendGridProvider, MailgunProvider } from './email-providers.js';
export type {
  IEmailConsumer,
  EmailConsumerConfig,
  EmailRoutingRule,
  ReactEmailTemplate,
  Event,
  EmailTemplate,
  EmailRecipient,
  EmailMessage,
  EmailProviderConfig,
  EmailDeliveryResult,
} from './types.js';
export {
  EventSchema,
  EmailTemplateSchema,
  EmailRecipientSchema,
  EmailMessageSchema,
} from './types.js';
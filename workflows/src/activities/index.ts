/**
 * Activities Index
 * 
 * Exports all activity functions for easy importing
 */

// Hello World activities
export { greet, getRandomFact, pushToOutbox } from './hello';

// User Onboarding activities
export { 
  sendVerificationEmail, 
  verifyEmailToken, 
  createUserProfile, 
  setupInitialData, 
  sendWelcomeEmail, 
  notifyAdmins as notifyAdminsUserOnboarding,
  pushToOutbox as pushToOutboxUserOnboarding 
} from './user-onboarding';

// Payment Processing activities
export { 
  createPaymentIntent, 
  confirmPayment, 
  setupSubscription, 
  generateInvoice, 
  sendPaymentConfirmationEmail, 
  sendInvoiceEmail, 
  rollbackPayment, 
  notifyAdmins as notifyAdminsPaymentProcessing,
  pushToOutbox as pushToOutboxPaymentProcessing 
} from './payment-processing';

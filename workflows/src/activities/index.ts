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


// Order Automation activities
export {
  createOrder,
  generateInvoice as generateInvoiceOrder,
  processPayment,
  setupSubscription as setupSubscriptionOrder,
  sendOrderConfirmationEmail,
  sendInvoiceEmail as sendInvoiceEmailOrder,
  rollbackOrder,
  notifyAdmins as notifyAdminsOrderAutomation,
  pushToOutbox as pushToOutboxOrderAutomation
} from './order-automation';

// Recurring Billing activities
export {
  findOrdersDueForBilling,
  createInvoiceForOrder,
  attemptAutomaticPayment,
  updateSubscriptionBillingDate,
  sendPaymentReminder,
  sendPaymentSuccessNotification,
  sendPaymentFailureNotification,
  pushToOutbox as pushToOutboxRecurringBilling,
  notifyAdmins as notifyAdminsRecurringBilling
} from './recurring-billing';

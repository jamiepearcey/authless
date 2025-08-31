// Main package exports

// Server-side exports
export * from './server';

// Client-side exports  
export * from './client';

// Hooks exports
export * from './hooks';

// Component exports (Note: components are in .tsx file for JSX support)
export * from './components/index';

// Types exports
export * from './types';

// Utility exports
export { formatCurrency, validateAmount, getPaymentMethodIcon } from './client';

// Main classes for easy import
export { StripeServerClient } from './server';
export { StripeClientManager } from './client';

// Re-export commonly used types
export type {
  StripeConfig,
  PaymentConfig,
  CreatePaymentIntentInput,
  CreateCustomerInput,
  CreateSubscriptionInput,
  StripeResponse,
  PaginatedStripeResponse,
  PaymentIntent,
  Customer,
  Subscription,
  Price,
} from './types';
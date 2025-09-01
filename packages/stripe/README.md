# Stripe Integration Package

A comprehensive Stripe integration package for the Authless London application, providing secure payment processing, subscription management, and customer handling.

## Features

- 🔒 **Secure Payment Processing** - Industry-standard security with Stripe
- 💳 **Multiple Payment Methods** - Cards, digital wallets, and more
- 📱 **Subscription Management** - Recurring billing and plan management
- 👤 **Customer Management** - Customer profiles and payment methods
- 🎣 **Webhooks Support** - Real-time event handling
- ⚛️ **React Components** - Pre-built UI components for payments
- 🪝 **React Hooks** - Custom hooks for easy integration
- 📘 **TypeScript First** - Full type safety and IntelliSense

## Installation

This package is already included in the workspace. Make sure you have the required environment variables set up.

## Environment Variables

Add these environment variables to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...                    # Your Stripe secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # Your Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_...                  # Your webhook endpoint secret

# Optional: Set to 'live' for production
STRIPE_ENVIRONMENT=test
```

## Quick Start

### 1. Server-Side Usage

```typescript
import { StripeServerClient } from '@stripe/integration';

// Initialize the client
const stripe = new StripeServerClient({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
});

// Create a payment intent
const result = await stripe.createPaymentIntent({
  amount: 2000, // £20.00 in pence
  currency: 'gbp',
  metadata: { orderId: 'order_123' }
});
```

### 2. Client-Side Usage

```tsx
import { StripeProvider, PaymentForm } from '@stripe/integration';

function App() {
  return (
    <StripeProvider publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
      <PaymentForm
        amount={2000}
        currency="gbp"
        onSuccess={(paymentIntent) => {
          console.log('Payment successful:', paymentIntent);
        }}
        onError={(error) => {
          console.error('Payment failed:', error);
        }}
      />
    </StripeProvider>
  );
}
```

### 3. Using Hooks

```tsx
import { usePaymentIntent, useStripeCustomer } from '@stripe/integration';

function PaymentComponent() {
  const { createPaymentIntent, confirmPayment, isProcessing } = usePaymentIntent();
  const { customer, createCustomer } = useStripeCustomer();

  const handlePayment = async () => {
    const result = await createPaymentIntent({
      amount: 2000,
      currency: 'gbp',
    });
    
    if (result.success) {
      // Handle success
    }
  };

  return (
    <div>
      <button onClick={handlePayment} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
    </div>
  );
}
```

## API Routes

The package includes ready-to-use API routes for Next.js:

- `POST /api/payments/create-intent` - Create payment intents
- `GET /api/payments/create-intent?payment_intent=pi_xxx` - Retrieve payment intent
- `POST /api/customers/create` - Create customers
- `POST /api/subscriptions/create` - Create subscriptions

## Components

### StripeProvider
Provides Stripe context to child components.

```tsx
<StripeProvider publishableKey="pk_test_...">
  {/* Your payment components */}
</StripeProvider>
```

### PaymentForm
Complete payment form with card input and processing.

```tsx
<PaymentForm
  amount={2000}
  currency="gbp"
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

### SubscriptionForm
Subscription management form.

```tsx
<SubscriptionForm
  priceId="price_xxx"
  customerId="cus_xxx"
  onSuccess={handleSuccess}
/>
```

### PaymentStatus
Display payment status and details.

```tsx
<PaymentStatus paymentIntent={paymentIntent} />
```

## Hooks

### useStripe
Get Stripe client instance and loading state.

```tsx
const { stripe, client, isLoading, error } = useStripe(publishableKey);
```

### usePaymentIntent
Manage payment intents.

```tsx
const { 
  paymentIntent, 
  createPaymentIntent, 
  confirmPayment, 
  isProcessing 
} = usePaymentIntent();
```

### useSubscription
Handle subscription operations.

```tsx
const { 
  subscription, 
  createSubscription, 
  cancelSubscription, 
  updateSubscription 
} = useSubscription();
```

### useStripeCustomer
Manage customer data.

```tsx
const { 
  customer, 
  createCustomer, 
  updateCustomer 
} = useStripeCustomer();
```

## Utilities

### formatCurrency
Format amounts as currency.

```tsx
import { formatCurrency } from '@stripe/integration';

const formatted = formatCurrency(2000, 'gbp'); // "£20.00"
```

### validateAmount
Validate payment amounts.

```tsx
import { validateAmount } from '@stripe/integration';

const isValid = validateAmount(2000); // true (minimum £0.30)
```

## Error Handling

The package includes comprehensive error handling:

```tsx
import { StripeIntegrationError } from '@stripe/integration';

try {
  await stripe.createPaymentIntent({ amount: 2000 });
} catch (error) {
  if (error instanceof StripeIntegrationError) {
    console.log('Stripe error:', error.message, error.code);
  }
}
```

## Webhooks

Handle Stripe webhooks securely:

```typescript
const result = await stripe.constructWebhookEvent(
  payload,
  signature,
  webhookSecret
);

if (result.success) {
  const event = result.data;
  // Handle the event
}
```

## Testing

Use Stripe's test mode for development. Test card numbers:

- `4242424242424242` - Visa (succeeds)
- `4000000000000002` - Visa (card declined)
- `4000000000003220` - Visa (3D Secure)

## Security

- All API keys are validated
- Webhook signatures are verified
- Input data is validated with Zod schemas
- Server-side operations require authentication
- PCI DSS compliant through Stripe

## Production Checklist

- [ ] Set production Stripe keys
- [ ] Configure webhook endpoints
- [ ] Test payment flows
- [ ] Verify error handling
- [ ] Set up monitoring
- [ ] Review security settings

## Support

For issues specific to this integration package, check:
1. Environment variables are correctly set
2. API routes are accessible
3. Authentication is working
4. Stripe dashboard for payment details

For Stripe-specific issues, refer to the [Stripe Documentation](https://stripe.com/docs).
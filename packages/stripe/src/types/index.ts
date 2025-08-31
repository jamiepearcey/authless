import { z } from 'zod';
import type Stripe from 'stripe';

// Payment Intent Schemas
export const CreatePaymentIntentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('gbp'),
  metadata: z.record(z.string()).optional(),
  description: z.string().optional(),
  automatic_payment_methods: z.object({
    enabled: z.boolean().default(true),
  }).optional(),
});

export const ConfirmPaymentSchema = z.object({
  paymentIntentId: z.string(),
  paymentMethodId: z.string().optional(),
});

// Subscription Schemas
export const CreateSubscriptionSchema = z.object({
  customerId: z.string(),
  priceId: z.string(),
  metadata: z.record(z.string()).optional(),
  trial_period_days: z.number().optional(),
  promotion_code: z.string().optional(),
});

export const UpdateSubscriptionSchema = z.object({
  subscriptionId: z.string(),
  priceId: z.string().optional(),
  quantity: z.number().optional(),
  metadata: z.record(z.string()).optional(),
});

// Customer Schemas
export const CreateCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export const UpdateCustomerSchema = z.object({
  customerId: z.string(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// Price Schemas
export const CreatePriceSchema = z.object({
  unit_amount: z.number().positive(),
  currency: z.string().default('gbp'),
  recurring: z.object({
    interval: z.enum(['day', 'week', 'month', 'year']),
    interval_count: z.number().default(1),
  }).optional(),
  product_data: z.object({
    name: z.string(),
    description: z.string().optional(),
    metadata: z.record(z.string()).optional(),
  }).optional(),
  product: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// Webhook Schemas
export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
  created: z.number(),
  api_version: z.string().optional(),
  livemode: z.boolean(),
  pending_webhooks: z.number(),
  request: z.object({
    id: z.string().nullable(),
    idempotency_key: z.string().nullable(),
  }).nullable(),
});

// Type exports
export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>;
export type ConfirmPaymentInput = z.infer<typeof ConfirmPaymentSchema>;
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
export type CreatePriceInput = z.infer<typeof CreatePriceSchema>;
export type WebhookEventInput = z.infer<typeof WebhookEventSchema>;

// Stripe type re-exports for convenience
export type {
  Stripe,
};

export type PaymentIntent = Stripe.PaymentIntent | any;
export type Customer = Stripe.Customer;
export type Subscription = Stripe.Subscription;
export type Price = Stripe.Price;
export type Product = Stripe.Product;
export type PaymentMethod = Stripe.PaymentMethod;
export type Invoice = Stripe.Invoice;
export type WebhookEndpoint = Stripe.WebhookEndpoint;

// Configuration types
export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  apiVersion?: Stripe.LatestApiVersion;
}

export interface PaymentConfig {
  currency: string;
  automaticPaymentMethods: boolean;
  captureMethod: 'automatic' | 'manual';
  confirmationMethod: 'automatic' | 'manual';
}

// Error types
export class StripeIntegrationError extends Error {
  public code?: string;
  public type?: string;
  public statusCode?: number;

  constructor(message: string, code?: string, type?: string, statusCode?: number) {
    super(message);
    this.name = 'StripeIntegrationError';
    this.code = code;
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Response wrapper types
export interface StripeResponse<T> {
  success: boolean;
  data?: T;
  error?: StripeIntegrationError;
}

export interface PaginatedStripeResponse<T> extends StripeResponse<T[]> {
  has_more?: boolean;
}
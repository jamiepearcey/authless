'use client';

import { loadStripe, type Stripe, type StripeElements, type StripeCardElement } from '@stripe/stripe-js';
import type { 
  StripeConfig, 
  PaymentIntent, 
  StripeResponse 
} from '../types';
import { StripeIntegrationError } from '../types';

export class StripeClientManager {
  private stripePromise: Promise<Stripe | null>;
  private publishableKey: string;

  constructor(publishableKey: string) {
    if (!publishableKey) {
      throw new Error('Stripe publishable key is required');
    }
    
    this.publishableKey = publishableKey;
    this.stripePromise = loadStripe(publishableKey);
  }

  async getStripe(): Promise<Stripe | null> {
    return this.stripePromise;
  }

  async createElements(options?: Parameters<Stripe['elements']>[0]): Promise<StripeElements | null> {
    const stripe = await this.getStripe();
    if (!stripe) return null;
    
    return stripe.elements(options);
  }

  async confirmPayment(params: {
    elements: StripeElements;
    confirmParams?: {
      return_url?: string;
      payment_method_data?: any;
    };
    redirect?: 'if_required' | 'always';
  }): Promise<StripeResponse<{ paymentIntent?: PaymentIntent }>> {
    try {
      const stripe = await this.getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const confirmData: any = {
        elements: params.elements,
        confirmParams: params.confirmParams || {
          return_url: window.location.href,
        },
      };
      
      if (params.redirect === 'if_required') {
        confirmData.redirect = 'if_required';
      }
      
      const { error, paymentIntent } = await stripe.confirmPayment(confirmData);

      if (error) {
        return {
          success: false,
          error: new StripeIntegrationError(error.message || 'Payment confirmation failed', error.code, error.type),
        };
      }

      return {
        success: true,
        data: { paymentIntent },
      };
    } catch (error: any) {
      return {
        success: false,
        error: new StripeIntegrationError(error.message || 'Payment confirmation failed'),
      };
    }
  }

  async confirmCardPayment(clientSecret: string, params?: {
    payment_method?: {
      card: StripeCardElement;
      billing_details?: {
        name?: string;
        email?: string;
        phone?: string;
        address?: any;
      };
    };
    setup_future_usage?: 'off_session' | 'on_session';
  }): Promise<StripeResponse<{ paymentIntent?: PaymentIntent }>> {
    try {
      const stripe = await this.getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: params?.payment_method,
        setup_future_usage: params?.setup_future_usage,
      });

      if (error) {
        return {
          success: false,
          error: new StripeIntegrationError(error.message || 'Card payment confirmation failed', error.code, error.type),
        };
      }

      return {
        success: true,
        data: { paymentIntent },
      };
    } catch (error: any) {
      return {
        success: false,
        error: new StripeIntegrationError(error.message || 'Card payment confirmation failed'),
      };
    }
  }

  async createPaymentMethod(params: {
    type: 'card';
    card: StripeCardElement;
    billing_details?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: any;
    };
    metadata?: Record<string, string>;
  }): Promise<StripeResponse<{ paymentMethod: any }>> {
    try {
      const stripe = await this.getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: params.type,
        card: params.card,
        billing_details: params.billing_details,
        metadata: params.metadata,
      });

      if (error) {
        return {
          success: false,
          error: new StripeIntegrationError(error.message || 'Payment method creation failed', error.code, error.type),
        };
      }

      return {
        success: true,
        data: { paymentMethod },
      };
    } catch (error: any) {
      return {
        success: false,
        error: new StripeIntegrationError(error.message || 'Payment method creation failed'),
      };
    }
  }

  async retrievePaymentIntent(clientSecret: string): Promise<StripeResponse<{ paymentIntent?: PaymentIntent }>> {
    try {
      const stripe = await this.getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error, paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

      if (error) {
        return {
          success: false,
          error: new StripeIntegrationError(error.message || 'Failed to retrieve payment intent', error.code, error.type),
        };
      }

      return {
        success: true,
        data: { paymentIntent },
      };
    } catch (error: any) {
      return {
        success: false,
        error: new StripeIntegrationError(error.message || 'Failed to retrieve payment intent'),
      };
    }
  }

  async processPayment(params: {
    amount: number;
    currency?: string;
    paymentMethodId?: string;
    customerId?: string;
    metadata?: Record<string, string>;
    description?: string;
  }): Promise<StripeResponse<{ clientSecret: string }>> {
    try {
      // This would typically call your backend API endpoint
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency || 'gbp',
          paymentMethodId: params.paymentMethodId,
          customerId: params.customerId,
          metadata: params.metadata,
          description: params.description,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        return {
          success: false,
          error: new StripeIntegrationError(data.error?.message || 'Failed to create payment intent'),
        };
      }

      return {
        success: true,
        data: { clientSecret: data.clientSecret },
      };
    } catch (error: any) {
      return {
        success: false,
        error: new StripeIntegrationError(error.message || 'Failed to process payment'),
      };
    }
  }

  // Utility methods
  static formatAmount(amount: number, currency = 'gbp'): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  static validateAmount(amount: number, minAmount = 30): boolean {
    return amount >= minAmount && amount <= 99999999; // Stripe limits
  }

  static getPaymentMethodIcon(type: string): string {
    const icons: Record<string, string> = {
      card: '💳',
      alipay: '🅰️',
      apple_pay: '🍎',
      google_pay: '🇬',
      klarna: 'K',
      paypal: '🅿️',
      sepa_debit: '🏦',
    };
    return icons[type] || '💳';
  }
}

// Export utility functions
export const formatCurrency = StripeClientManager.formatAmount;
export const validateAmount = StripeClientManager.validateAmount;
export const getPaymentMethodIcon = StripeClientManager.getPaymentMethodIcon;

export * from '../types';
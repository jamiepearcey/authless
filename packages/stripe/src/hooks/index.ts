'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { StripeClientManager, type StripeResponse, type PaymentIntent } from '../client';

// Hook for Stripe client instance
export function useStripe(publishableKey: string) {
  const clientRef = useRef<StripeClientManager | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publishableKey) {
      setError('Stripe publishable key is required');
      setIsLoading(false);
      return;
    }

    try {
      if (!clientRef.current) {
        clientRef.current = new StripeClientManager(publishableKey);
      }

      clientRef.current.getStripe()
        .then((stripeInstance) => {
          setStripe(stripeInstance);
          setError(null);
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }, [publishableKey]);

  return {
    stripe,
    client: clientRef.current,
    isLoading,
    error,
  };
}

// Hook for Stripe Elements
export function useStripeElements(stripe: Stripe | null, options?: Parameters<Stripe['elements']>[0]) {
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe) {
      setIsLoading(true);
      return;
    }

    try {
      const elementsInstance = stripe.elements(options);
      setElements(elementsInstance);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [stripe, options]);

  return {
    elements,
    isLoading,
    error,
  };
}

// Hook for payment processing
export function usePaymentIntent() {
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = useCallback(async (params: {
    amount: number;
    currency?: string;
    customerId?: string;
    metadata?: Record<string, string>;
    description?: string;
  }) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency || 'gbp',
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
        throw new Error(data.error?.message || 'Failed to create payment intent');
      }

      setPaymentIntent(data.paymentIntent);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const confirmPayment = useCallback(async (
    client: StripeClientManager,
    elements: StripeElements,
    confirmParams?: {
      return_url: string;
      payment_method_data?: any;
    }
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await client.confirmPayment({
        elements,
        confirmParams,
        redirect: 'if_required',
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Payment confirmation failed');
      }

      if (result.data?.paymentIntent) {
        setPaymentIntent(result.data.paymentIntent);
      }

      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const retrievePaymentIntent = useCallback(async (
    client: StripeClientManager,
    clientSecret: string
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await client.retrievePaymentIntent(clientSecret);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to retrieve payment intent');
      }

      if (result.data?.paymentIntent) {
        setPaymentIntent(result.data.paymentIntent);
      }

      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    paymentIntent,
    createPaymentIntent,
    confirmPayment,
    retrievePaymentIntent,
    isProcessing,
    error,
    clearError: () => setError(null),
  };
}

// Hook for subscription management
export function useSubscription() {
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSubscription = useCallback(async (params: {
    customerId: string;
    priceId: string;
    paymentMethodId?: string;
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: params.customerId,
          priceId: params.priceId,
          paymentMethodId: params.paymentMethodId,
          trialPeriodDays: params.trialPeriodDays,
          metadata: params.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to create subscription');
      }

      setSubscription(data.subscription);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelSubscription = useCallback(async (subscriptionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to cancel subscription');
      }

      setSubscription(data.subscription);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSubscription = useCallback(async (subscriptionId: string, params: {
    priceId?: string;
    quantity?: number;
    metadata?: Record<string, string>;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to update subscription');
      }

      setSubscription(data.subscription);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    subscription,
    createSubscription,
    cancelSubscription,
    updateSubscription,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

// Hook for customer management
export function useStripeCustomer() {
  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCustomer = useCallback(async (params: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/customers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to create customer');
      }

      setCustomer(data.customer);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateCustomer = useCallback(async (customerId: string, params: {
    email?: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to update customer');
      }

      setCustomer(data.customer);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    customer,
    createCustomer,
    updateCustomer,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}
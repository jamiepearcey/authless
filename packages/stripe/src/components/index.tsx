'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { 
  StripeCardElementOptions, 
  StripeElements, 
  StripeCardElement,
  Appearance 
} from '@stripe/stripe-js';
import { 
  useStripe, 
  useStripeElements, 
  usePaymentIntent, 
  useSubscription
} from '../hooks';
import { formatCurrency, validateAmount } from '../client';
import type { StripeResponse } from '../types';

// Provider component for Stripe context
interface StripeProviderProps {
  publishableKey: string;
  children: React.ReactNode;
  appearance?: Appearance;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ 
  publishableKey, 
  children, 
  appearance 
}) => {
  const { stripe, client, isLoading, error } = useStripe(publishableKey);
  const { elements } = useStripeElements(stripe, { 
    appearance,
    clientSecret: undefined, // Will be set when creating payment intent
  });

  if (isLoading) {
    return <div>Loading Stripe...</div>;
  }

  if (error) {
    return <div>Error loading Stripe: {error}</div>;
  }

  return (
    <div data-stripe-provider="true">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { stripe, elements, client } as any);
        }
        return child;
      })}
    </div>
  );
};

// Card Element component
interface CardElementProps {
  options?: StripeCardElementOptions;
  onReady?: (element: StripeCardElement) => void;
  onChange?: (event: any) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const CardElement: React.FC<CardElementProps> = ({
  options = {},
  onReady,
  onChange,
  onFocus,
  onBlur,
  className = '',
  style = {},
}) => {
  const cardElementRef = useRef<HTMLDivElement>(null);
  const cardElementInstanceRef = useRef<StripeCardElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This would be implemented with actual Stripe Elements
    // For now, this is a placeholder structure
    setIsReady(true);
  }, [options]);

  const defaultStyle = {
    padding: '12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    ...style,
  };

  return (
    <div className={`stripe-card-element ${className}`} style={defaultStyle}>
      <div ref={cardElementRef} />
      {error && <div className="stripe-error" style={{ color: 'red', fontSize: '14px', marginTop: '8px' }}>{error}</div>}
      {!isReady && <div className="stripe-loading">Loading card element...</div>}
    </div>
  );
};

// Payment Form component
interface PaymentFormProps {
  amount: number;
  currency?: string;
  customerId?: string;
  metadata?: Record<string, string>;
  description?: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: string) => void;
  onProcessing?: (isProcessing: boolean) => void;
  submitButtonText?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  currency = 'gbp',
  customerId,
  metadata,
  description,
  onSuccess,
  onError,
  onProcessing,
  submitButtonText = 'Pay Now',
  className = '',
  style = {},
  children,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const { 
    paymentIntent, 
    createPaymentIntent, 
    confirmPayment, 
    isProcessing, 
    error 
  } = usePaymentIntent();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateAmount(amount)) {
      const errorMsg = `Invalid amount. Minimum ${formatCurrency(30, currency)}`;
      setCardError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsSubmitting(true);
    setCardError(null);
    onProcessing?.(true);

    try {
      // Create payment intent
      const result = await createPaymentIntent({
        amount,
        currency,
        customerId,
        metadata,
        description,
      });

      // Here you would confirm the payment with Stripe Elements
      // This is a simplified version
      onSuccess?.(result.paymentIntent);
    } catch (err: any) {
      const errorMsg = err.message || 'Payment failed';
      setCardError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsSubmitting(false);
      onProcessing?.(false);
    }
  };

  const handleCardChange = (event: any) => {
    setCardError(event.error ? event.error.message : null);
  };

  return (
    <form onSubmit={handleSubmit} className={`stripe-payment-form ${className}`} style={style}>
      <div className="payment-amount" style={{ marginBottom: '16px' }}>
        <strong>Amount: {formatCurrency(amount, currency)}</strong>
      </div>
      
      <div className="card-element-container" style={{ marginBottom: '16px' }}>
        <CardElement 
          onChange={handleCardChange}
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>

      {cardError && (
        <div className="card-error" style={{ color: '#dc3545', fontSize: '14px', marginBottom: '16px' }}>
          {cardError}
        </div>
      )}

      {children}

      <button
        type="submit"
        disabled={isSubmitting || isProcessing}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isSubmitting ? '#ccc' : '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? 'Processing...' : submitButtonText}
      </button>
    </form>
  );
};

// Subscription Form component
interface SubscriptionFormProps {
  priceId: string;
  customerId?: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
  onSuccess?: (subscription: any) => void;
  onError?: (error: string) => void;
  onProcessing?: (isProcessing: boolean) => void;
  submitButtonText?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SubscriptionForm: React.FC<SubscriptionFormProps> = ({
  priceId,
  customerId,
  trialPeriodDays,
  metadata,
  onSuccess,
  onError,
  onProcessing,
  submitButtonText = 'Subscribe',
  className = '',
  style = {},
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const { 
    subscription, 
    createSubscription, 
    isLoading, 
    error 
  } = useSubscription();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!customerId) {
      const errorMsg = 'Customer ID is required for subscriptions';
      setCardError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsSubmitting(true);
    setCardError(null);
    onProcessing?.(true);

    try {
      const result = await createSubscription({
        customerId,
        priceId,
        trialPeriodDays,
        metadata,
      });

      onSuccess?.(result.subscription);
    } catch (err: any) {
      const errorMsg = err.message || 'Subscription creation failed';
      setCardError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsSubmitting(false);
      onProcessing?.(false);
    }
  };

  const handleCardChange = (event: any) => {
    setCardError(event.error ? event.error.message : null);
  };

  return (
    <form onSubmit={handleSubmit} className={`stripe-subscription-form ${className}`} style={style}>
      <div className="subscription-details" style={{ marginBottom: '16px' }}>
        <p><strong>Subscription Plan ID:</strong> {priceId}</p>
        {trialPeriodDays && (
          <p><strong>Trial Period:</strong> {trialPeriodDays} days</p>
        )}
      </div>
      
      <div className="card-element-container" style={{ marginBottom: '16px' }}>
        <CardElement 
          onChange={handleCardChange}
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>

      {cardError && (
        <div className="card-error" style={{ color: '#dc3545', fontSize: '14px', marginBottom: '16px' }}>
          {cardError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || isLoading}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isSubmitting ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? 'Processing...' : submitButtonText}
      </button>
    </form>
  );
};

// Payment Status component
interface PaymentStatusProps {
  paymentIntent?: any;
  className?: string;
  style?: React.CSSProperties;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  paymentIntent,
  className = '',
  style = {},
}) => {
  if (!paymentIntent) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return '#28a745';
      case 'processing':
        return '#ffc107';
      case 'requires_payment_method':
        return '#dc3545';
      case 'canceled':
        return '#6c757d';
      default:
        return '#17a2b8';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Payment successful!';
      case 'processing':
        return 'Payment is being processed...';
      case 'requires_payment_method':
        return 'Payment requires a payment method';
      case 'canceled':
        return 'Payment was canceled';
      default:
        return `Payment status: ${status}`;
    }
  };

  return (
    <div 
      className={`stripe-payment-status ${className}`} 
      style={{ 
        padding: '12px',
        borderRadius: '4px',
        backgroundColor: '#f8f9fa',
        border: `2px solid ${getStatusColor(paymentIntent.status)}`,
        ...style,
      }}
    >
      <div style={{ color: getStatusColor(paymentIntent.status), fontWeight: 'bold' }}>
        {getStatusText(paymentIntent.status)}
      </div>
      {paymentIntent.amount && (
        <div style={{ fontSize: '14px', marginTop: '4px' }}>
          Amount: {formatCurrency(paymentIntent.amount, paymentIntent.currency)}
        </div>
      )}
      {paymentIntent.id && (
        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
          ID: {paymentIntent.id}
        </div>
      )}
    </div>
  );
};

// Export utility components
export const StripeUtilities = {
  formatCurrency,
  validateAmount,
};

// Export all hooks
export * from '../hooks';
export * from '../client';
export * from '../types';
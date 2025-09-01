'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
// import { Button } from '@ui/base';
// import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: string) => void;
  onProcessing?: (isProcessing: boolean) => void;
}

const CheckoutForm: React.FC<PaymentFormProps> = ({
  amount,
  currency = 'gbp',
  description,
  metadata,
  onSuccess,
  onError,
  onProcessing
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/payments/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            currency,
            description,
            metadata,
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          setClientSecret(data.clientSecret);
        } else {
          setMessage(data.error?.message || 'Failed to initialize payment');
          onError?.(data.error?.message || 'Failed to initialize payment');
        }
      } catch (error: any) {
        setMessage(error.message || 'Failed to initialize payment');
        onError?.(error.message || 'Failed to initialize payment');
      }
    };

    if (amount > 0) {
      createPaymentIntent();
    }
  }, [amount, currency, description, metadata, onError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setIsLoading(true);
    setMessage(null);
    onProcessing?.(true);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            // You can collect billing details from additional form fields if needed
          },
        }
      });

      if (error) {
        setMessage(error.message || 'Payment failed');
        onError?.(error.message || 'Payment failed');
      } else {
        setMessage('Payment succeeded!');
        setIsComplete(true);
        onSuccess?.(paymentIntent);
      }
    } catch (err: any) {
      setMessage(err.message || 'An unexpected error occurred');
      onError?.(err.message || 'An unexpected error occurred');
    }

    setIsLoading(false);
    onProcessing?.(false);
  };

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full mr-2" />
        <span>Initializing payment...</span>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="text-center p-6">
        <div className="h-12 w-12 text-green-500 mx-auto mb-4">✓</div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">Payment Successful!</h3>
        <p className="text-green-700">Your payment has been processed successfully.</p>
      </div>
    );
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true, // Remove zip code requirement for international users
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="card-element" className="block text-sm font-medium text-gray-700 mb-2">
          Card information
        </label>
        <div className="p-3 border border-gray-300 rounded-md bg-white">
          <CardElement
            id="card-element"
            options={cardElementOptions}
          />
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          isComplete ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex">
            {isComplete ? (
              <div className="h-5 w-5 text-green-400">✓</div>
            ) : (
              <div className="h-5 w-5 text-red-400">⚠</div>
            )}
            <div className="ml-3">
              <p className={`text-sm ${
                isComplete ? 'text-green-800' : 'text-red-800'
              }`}>
                {message}
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
      >
        {isLoading ? (
          <>
            <div className="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full mr-2" />
            Processing payment...
          </>
        ) : (
          `Pay ${new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: currency.toUpperCase(),
          }).format(amount / 100)}`
        )}
      </button>
    </form>
  );
};

export const StripeElementsForm: React.FC<PaymentFormProps> = (props) => {
  const appearance = {
    theme: 'stripe' as const,
  };

  const options = {
    appearance,
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm {...props} />
    </Elements>
  );
};

export default StripeElementsForm;
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@ui/base';
import { Button } from '@ui/base';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setIsLoading(false);
      return;
    }

    const fetchOrderId = async () => {
      try {
        const response = await fetch(`/api/payments/checkout-session?session_id=${sessionId}`);
        const data = await response.json();
        
        if (data.success && data.session?.metadata?.orderId) {
          setOrderId(data.session.metadata.orderId);
        } else {
          setError('Could not find order details');
        }
      } catch (err: any) {
        setError('Failed to load payment details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderId();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Processing your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    // Redirect to error page instead of showing inline error
    router.push(`/error/payment_failed?returnUrl=/checkout&details=${encodeURIComponent(error)}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for your payment. Your order has been processed successfully.
          </p>

          {orderId && (
            <Button 
              onClick={() => router.push(`/orders/${orderId}`)}
              className="w-full"
            >
              View Order Details
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
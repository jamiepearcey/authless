"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { Button } from '@ui/base';
import { 
  CheckCircle, 
  Receipt, 
  ArrowLeft, 
  Download,
  Mail,
  Loader2
} from 'lucide-react';

interface CheckoutSession {
  id: string;
  status: string;
  amount_total: number;
  currency: string;
  customer_email: string;
  payment_status: string;
  created: number;
  metadata?: Record<string, string>;
}

export default function PaymentSuccessPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setIsLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/payments/checkout-session?session_id=${sessionId}`);
        const data = await response.json();
        
        if (data.success) {
          setCheckoutSession(data.session);
        } else {
          setError(data.error?.message || 'Failed to retrieve payment details');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load payment details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading payment details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-600 mb-4">⚠️</div>
            <h2 className="text-lg font-semibold mb-2">Error Loading Payment</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => router.push('/payments')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">
            Thank you for your payment. Your transaction has been completed successfully.
          </p>
        </div>

        {/* Payment Details */}
        {checkoutSession && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Receipt className="h-5 w-5 mr-2" />
                Payment Receipt
              </CardTitle>
              <CardDescription>
                Transaction completed on {formatDate(checkoutSession.created)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Payment Information</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Amount:</dt>
                      <dd className="font-semibold">
                        {formatCurrency(checkoutSession.amount_total, checkoutSession.currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Status:</dt>
                      <dd className={`font-semibold ${
                        checkoutSession.payment_status === 'paid' 
                          ? 'text-green-600' 
                          : 'text-yellow-600'
                      }`}>
                        {checkoutSession.payment_status}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Session ID:</dt>
                      <dd className="font-mono text-xs">{checkoutSession.id}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Email:</dt>
                      <dd>{checkoutSession.customer_email || session?.user?.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Date:</dt>
                      <dd>{formatDate(checkoutSession.created)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Metadata */}
              {checkoutSession.metadata && Object.keys(checkoutSession.metadata).length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Additional Details</h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {Object.entries(checkoutSession.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <dt className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => router.push('/payments')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payments
          </Button>
          
          <Button onClick={() => window.print()} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
          
          <Button 
            onClick={() => {
              const subject = `Payment Receipt - ${sessionId}`;
              const body = `Thank you for your payment of ${checkoutSession ? formatCurrency(checkoutSession.amount_total, checkoutSession.currency) : 'N/A'}.\n\nSession ID: ${sessionId}\nDate: ${checkoutSession ? formatDate(checkoutSession.created) : 'N/A'}`;
              window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            }} 
            variant="outline"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email Receipt
          </Button>
        </div>

        {/* Success Message */}
        <Card className="mt-6 bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">What happens next?</h3>
                <p className="text-green-800 text-sm">
                  You should receive a confirmation email shortly. If you have any questions about 
                  your payment, please don't hesitate to contact our support team.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
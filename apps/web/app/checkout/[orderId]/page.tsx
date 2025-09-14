"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { Button } from '@ui/base';
import { Badge } from '@ui/base';
import { 
  CreditCard, 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  Shield,
  Phone,
  Lock,
  ExternalLink,
  Receipt,
  Calendar,
  User,
  Mail,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { StripeElementsForm } from '@stripe/integration/components';
import Link from "next/link";

interface OrderData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  description: string;
  created: number;
  customerEmail?: string;
  customerName?: string;
  paymentMethod?: string;
  paymentIntentId?: string;
  receiptUrl?: string;
  metadata: {
    plan?: string;
    guestEmail?: string;
    guestName?: string;
    tenantId?: string;
    billingPeriod?: string;
  };
  canRetry: boolean;
}

export default function RetryPaymentPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.orderId as string;
  const viewMode = searchParams.get('view');
  
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useElements, setUseElements] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrderData();
    }
  }, [orderId]);

  const fetchOrderData = async () => {
    try {
      setIsLoading(true);
      // For now, we'll simulate order data since we need to implement the API endpoint
      // In a real implementation, you'd fetch from /api/orders/[orderId]
      
      // Simulate fetching order data
      setTimeout(() => {
        setOrderData({
          id: orderId,
          amount: 2500, // £25.00
          currency: 'gbp',
          status: 'open',
          paymentStatus: 'unpaid',
          description: 'Premium Plan',
          metadata: {
            plan: 'Premium Plan',
          },
          canRetry: true,
        });
        setIsLoading(false);
      }, 1000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order data');
      setIsLoading(false);
    }
  };

  const handleStripeRedirect = async () => {
    if (!orderData) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: orderData.amount,
          currency: orderData.currency,
          description: orderData.description,
          metadata: {
            ...orderData.metadata,
            retryOrderId: orderId,
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error?.message || 'Failed to create checkout session');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create checkout session');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Order Not Found</h3>
            <p className="text-gray-600 mb-4">The order you're looking for could not be found.</p>
            <Button onClick={() => router.push('/payments/history')}>
              View Payment History
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If this is details view, show order details
  if (viewMode === 'details') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto ">
          <div className="mb-8">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-4 mb-4">
              <Link 
                href="/payments/history"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to History
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <BreadcrumbNavigation
                items={[
                  { label: "Payment History", href: "/payments/history" },
                  { label: "Order Details", current: true },
                ]}
                showHome={false}
              />
            </div>
            
            {/* Page Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                  <Receipt className="h-8 w-8 text-indigo-600" />
                  <span>Order Details</span>
                </h1>
                <p className="text-gray-600 mt-2 break-words">
                  Order ID: <span className="font-mono break-all">{orderId}</span>
                </p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="break-words">Order <span className="break-all font-mono">{orderId}</span></span>
                <Badge 
                  className={
                    orderData.paymentStatus === 'paid' 
                      ? 'bg-green-100 text-green-800 border-green-300' 
                      : 'bg-red-100 text-red-800 border-red-300'
                  }
                >
                  {orderData.paymentStatus}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Order Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID:</span>
                      <span className="font-mono break-all">{orderData.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plan:</span>
                      <span>{orderData.metadata?.plan || orderData.description}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold">{formatCurrency(orderData.amount, orderData.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant="outline">{orderData.status}</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Payment Status</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status:</span>
                      <Badge 
                        className={
                          orderData.paymentStatus === 'paid' 
                            ? 'bg-green-100 text-green-800 border-green-300' 
                            : 'bg-red-100 text-red-800 border-red-300'
                        }
                      >
                        {orderData.paymentStatus}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Can Retry:</span>
                      <span>{orderData.canRetry ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {orderData.canRetry && (
                <div className="pt-6 border-t">
                  <Button
                    onClick={() => router.push(`/checkout/${orderId}`)}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Retry Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto ">
        {/* Header */}
        <div className="mb-8">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              href="/pricing"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Pricing
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <BreadcrumbNavigation
              items={[
                { label: "Pricing", href: "/pricing" },
                { label: "Retry Payment", current: true },
              ]}
              showHome={false}
            />
          </div>
          
          {/* Page Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <CreditCard className="h-8 w-8 text-indigo-600" />
                <span>Retry Payment</span>
              </h1>
              <p className="text-gray-600 mt-2">
                Complete your payment for order {orderId}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 text-green-600 mr-2" />
                Order Summary
              </CardTitle>
              <CardDescription>
                Retry payment for your order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{orderData.metadata?.plan || orderData.description}</h3>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                    {formatCurrency(orderData.amount, orderData.currency)}
                  </Badge>
                </div>
                
                <div className="mt-3 text-sm text-gray-600">
                  <p><strong>Order ID:</strong> {orderData.id}</p>
                  <p><strong>Status:</strong> Payment Required</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total:</span>
                  <span className="text-orange-600">{formatCurrency(orderData.amount, orderData.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 text-green-600 mr-2" />
                Payment Details
              </CardTitle>
              <CardDescription>
                Complete your payment securely
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Method Selection */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Choose Payment Method</h3>
                
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={useElements}
                      onChange={() => setUseElements(true)}
                      className="text-blue-600"
                    />
                    <span className="text-sm font-medium">Card Payment (Recommended)</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={!useElements}
                      onChange={() => setUseElements(false)}
                      className="text-blue-600"
                    />
                    <span className="text-sm font-medium">Stripe Secure Checkout</span>
                  </label>
                </div>
              </div>

              {/* Stripe Elements Form */}
              {useElements && (
                <div className="space-y-4">
                  <StripeElementsForm
                    amount={orderData.amount}
                    currency={orderData.currency}
                    description={orderData.description}
                    metadata={{
                      ...orderData.metadata,
                      retryOrderId: orderId,
                    }}
                    onSuccess={() => {
                      router.push('/payments/success');
                    }}
                    onError={(error) => setError(error)}
                  />
                </div>
              )}

              {/* Stripe Redirect Option */}
              {!useElements && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    You'll be redirected to Stripe's secure checkout page to complete your payment.
                  </p>
                  
                  <Button
                    onClick={handleStripeRedirect}
                    disabled={isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating checkout session...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Continue to Stripe Checkout
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-sm text-red-800">{error}</span>
                  </div>
                </div>
              )}

              {/* Support CTA */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center mb-2">
                  <Phone className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">Need Help?</span>
                </div>
                <p className="text-sm text-blue-800 mb-2">
                  Having trouble with your payment? Our support team is here to help!
                </p>
                <p className="text-sm text-blue-600 font-medium">
                  📞 Call us: +44 (0) 20 1234 5678
                </p>
                <p className="text-sm text-blue-600">
                  ✉️ Email: support@authlessuk.com
                </p>
              </div>

              {/* Security Badge */}
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <Shield className="h-4 w-4" />
                <span>Secured by Stripe • 256-bit SSL encryption</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
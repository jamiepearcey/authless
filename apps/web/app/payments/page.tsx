"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { Button } from '@ui/base';
import { Input } from '@ui/base';
import { Label } from '@ui/base';
import { Badge } from '@ui/base';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/base';
import { 
  CreditCard, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Receipt,
  User,
  Calendar,
  ExternalLink,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { 
  StripeProvider,
  PaymentStatus,
  SubscriptionForm,
  StripeElementsForm,
  StripeErrorBoundary,
  useStripeCustomer,
  formatCurrency,
  type PaymentIntent,
} from '@stripe/integration/client';

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

export default function PaymentsPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<'payment' | 'subscription'>('payment');
  const [paymentFlow, setPaymentFlow] = useState<'checkout' | 'elements'>('checkout');
  const [paymentAmount, setPaymentAmount] = useState(5000); // £50.00 in pence
  const [paymentDescription, setPaymentDescription] = useState('');
  const [completedPayment, setCompletedPayment] = useState<PaymentIntent | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Mock plans for demonstration
  const plans = [
    {
      id: 'price_basic',
      name: 'Basic Plan',
      price: 999, // £9.99
      interval: 'month',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
    },
    {
      id: 'price_pro',
      name: 'Pro Plan',
      price: 1999, // £19.99
      interval: 'month',
      features: ['All Basic features', 'Advanced Feature 1', 'Advanced Feature 2', 'Priority Support'],
    },
  ];

  const { customer, createCustomer, isLoading: customerLoading } = useStripeCustomer();

  // Authentication check
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You must be logged in to access the payments page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/auth/signin'} 
              className="w-full"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Stripe key validation
  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Configuration Error</CardTitle>
            <CardDescription>
              Stripe publishable key is not configured. Please contact support.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handlePaymentSuccess = (paymentIntent: PaymentIntent) => {
    setCompletedPayment(paymentIntent);
    console.log('Payment successful:', paymentIntent);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
  };

  const handleCreateCustomer = async () => {
    if (!session?.user?.email) return;

    try {
      await createCustomer({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: {
          source: 'payments-page',
          userId: session.user.id,
        },
      });
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  const handleCheckoutPayment = async () => {
    setIsProcessingCheckout(true);
    setCheckoutError(null);

    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: paymentAmount,
          currency: 'gbp',
          product_name: 'Payment',
          product_description: paymentDescription || undefined,
          metadata: {
            description: paymentDescription,
            source: 'payments-page',
            userId: session?.user?.id || '',
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setCheckoutError(data.error?.message || 'Failed to create checkout session');
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'An error occurred');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const formatAmountForDisplay = (amount: number) => {
    return formatCurrency(amount, 'gbp');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CreditCard className="h-8 w-8 text-blue-600 mr-3" />
            Payment Center
          </h1>
          <p className="text-gray-600 mt-2">
            Secure payments powered by Stripe integration
          </p>
        </div>

        {/* User Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{session?.user?.name}</p>
                <p className="text-gray-600">{session?.user?.email}</p>
                {customer && (
                  <Badge variant="secondary" className="mt-2">
                    Stripe Customer: {customer.id}
                  </Badge>
                )}
              </div>
              {!customer && (
                <Button 
                  onClick={handleCreateCustomer}
                  disabled={customerLoading}
                  variant="outline"
                >
                  {customerLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <User className="h-4 w-4 mr-2" />
                  )}
                  Create Stripe Customer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('payment')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'payment'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DollarSign className="h-4 w-4 inline mr-2" />
                One-time Payment
              </button>
              <button
                onClick={() => setActiveTab('subscription')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'subscription'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-2" />
                Subscription
              </button>
            </nav>
          </div>
        </div>

        {/* Error Messages */}
        {checkoutError && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800">{checkoutError}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <StripeErrorBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Payment/Subscription Form */}
            <div>
              {activeTab === 'payment' && (
                <div className="space-y-6">
                  {/* Payment Amount Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Details</CardTitle>
                      <CardDescription>
                        Configure your payment amount and description
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="amount">Amount (pence)</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(Number(e.target.value))}
                          min="30"
                          max="99999999"
                        />
                        <p className="text-sm text-gray-600 mt-1">
                          Amount: {formatAmountForDisplay(paymentAmount)}
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="description">Description (optional)</Label>
                        <Input
                          id="description"
                          value={paymentDescription}
                          onChange={(e) => setPaymentDescription(e.target.value)}
                          placeholder="Payment description"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Flow Selection */}
                  <Tabs value={paymentFlow} onValueChange={(value) => setPaymentFlow(value as 'checkout' | 'elements')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="checkout" className="flex items-center space-x-2">
                        <ExternalLink className="h-4 w-4" />
                        <span>Stripe Checkout</span>
                      </TabsTrigger>
                      <TabsTrigger value="elements" className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Payment Form</span>
                      </TabsTrigger>
                    </TabsList>

                    {/* Stripe Checkout Flow */}
                    <TabsContent value="checkout">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <ExternalLink className="h-5 w-5 mr-2" />
                            Stripe Checkout (Redirect)
                          </CardTitle>
                          <CardDescription>
                            Redirect to Stripe's secure checkout page to complete payment
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start">
                              <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                              <div>
                                <h3 className="font-semibold text-blue-900 mb-1">Secure & Trusted</h3>
                                <p className="text-blue-800 text-sm">
                                  Your payment is handled entirely by Stripe's PCI-compliant infrastructure.
                                </p>
                              </div>
                            </div>
                          </div>

                          <Button 
                            onClick={handleCheckoutPayment}
                            disabled={isProcessingCheckout || paymentAmount < 30}
                            className="w-full"
                            size="lg"
                          >
                            {isProcessingCheckout ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating checkout session...
                              </>
                            ) : (
                              <>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Pay {formatAmountForDisplay(paymentAmount)} with Stripe Checkout
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Stripe Elements Flow */}
                    <TabsContent value="elements">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <CreditCard className="h-5 w-5 mr-2" />
                            Payment Form (Elements)
                          </CardTitle>
                          <CardDescription>
                            Enter payment information directly on this page
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <StripeElementsForm
                            amount={paymentAmount}
                            currency="gbp"
                            description={paymentDescription || undefined}
                            metadata={{
                              source: 'payments-page',
                              userId: session?.user?.id || '',
                            }}
                            onSuccess={handlePaymentSuccess}
                            onError={handlePaymentError}
                            onProcessing={() => {
                              // Handle processing state if needed
                            }}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {activeTab === 'subscription' && (
                <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
                  <div className="space-y-6">
                    {/* Plan Selection */}
                    <Card>
                    <CardHeader>
                      <CardTitle>Choose a Plan</CardTitle>
                      <CardDescription>
                        Select a subscription plan that fits your needs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {plans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedPlan === plan.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedPlan(plan.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold">{plan.name}</h3>
                              <span className="text-2xl font-bold">
                                {formatCurrency(plan.price, 'gbp')}
                                <span className="text-sm font-normal text-gray-600">
                                  /{plan.interval}
                                </span>
                              </span>
                            </div>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-center">
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Subscription Form */}
                  {selectedPlan && customer && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Subscribe to {plans.find(p => p.id === selectedPlan)?.name}</CardTitle>
                        <CardDescription>
                          Complete your subscription setup
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SubscriptionForm
                          priceId={selectedPlan}
                          customerId={customer.id}
                          metadata={{
                            source: 'payments-page',
                            userId: session?.user?.id || '',
                            planName: plans.find(p => p.id === selectedPlan)?.name || '',
                          }}
                          onSuccess={(subscription) => {
                            console.log('Subscription created:', subscription);
                          }}
                          onError={(error) => {
                            console.error('Subscription error:', error);
                          }}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {selectedPlan && !customer && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Create Customer Profile</CardTitle>
                        <CardDescription>
                          You need a Stripe customer profile to subscribe
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={handleCreateCustomer} disabled={customerLoading}>
                          {customerLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <User className="h-4 w-4 mr-2" />
                          )}
                          Create Customer Profile
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                  </div>
                </StripeProvider>
              )}
            </div>

            {/* Payment Status */}
            <div>
              {completedPayment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      Payment Successful
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PaymentStatus paymentIntent={completedPayment} />
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center">
                        <Receipt className="h-4 w-4 mr-2" />
                        Payment Details
                      </h4>
                      <dl className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Payment ID:</dt>
                          <dd className="font-mono text-xs">{completedPayment.id}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Amount:</dt>
                          <dd>{formatCurrency(completedPayment.amount, completedPayment.currency)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Status:</dt>
                          <dd className="capitalize">{completedPayment.status}</dd>
                        </div>
                      </dl>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Info Cards */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Secure Payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Powered by Stripe - Industry-leading security
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mt-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      SSL encrypted transactions
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mt-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      PCI DSS compliant
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Integration Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Stripe Client</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Connected
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Authentication</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>API Routes</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Ready
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            </div>
        </StripeErrorBoundary>
      </div>
    </div>
  );
}
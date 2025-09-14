"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Check
} from 'lucide-react';
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";
import { StripeElementsForm } from '@stripe/integration/components';
import { useLeadTracking } from '@/hooks/useLeadTracking';

interface PlanData {
  title: string;
  price: string;
  description: string;
  priceAmount: number;
  features: string[];
}

interface GuestInfo {
  name: string;
  email: string;
}

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { trackPageVisit, trackCheckoutStarted, trackPaymentAttempted, trackPaymentCompleted, trackPaymentFailed } = useLeadTracking();
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: '', email: '' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useElements, setUseElements] = useState(true);

  // Check if this is a retry attempt
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // Track page visit
    trackPageVisit({ page: 'checkout' });

    // Try to get plan data from sessionStorage
    const storedPlan = sessionStorage.getItem('selectedPlan');
    if (storedPlan) {
      try {
        const parsedPlan = JSON.parse(storedPlan);
        setPlanData(parsedPlan);
        
        // Track checkout started
        trackCheckoutStarted(
          parsedPlan.title,
          session?.user?.email || undefined,
          session?.user?.name || undefined,
          { 
            price: parsedPlan.price,
            amount: parsedPlan.priceAmount.toString()
          }
        );
      } catch (e) {
        console.error('Failed to parse stored plan data:', e);
      }
    }

    // If no plan data and not a retry, redirect back to pricing
    if (!storedPlan && !orderId) {
      router.push('/pricing');
    }
  }, [orderId, router, session?.user?.email, session?.user?.name]); // Removed tracking functions from deps

  const isGuest = status !== 'loading' && !session?.user;
  
  // Debug logging
  useEffect(() => {
    console.log('Checkout session state:', {
      status,
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      isGuest
    });
  }, [status, session, isGuest]);

  const handleGuestInfoChange = (field: keyof GuestInfo, value: string) => {
    setGuestInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleStripeRedirect = async () => {
    if (!planData) return;

    setIsProcessing(true);
    setError(null);

    // Track payment attempt
    await trackPaymentAttempted(
      planData.title,
      planData.priceAmount,
      isGuest ? guestInfo.email : session?.user?.email || undefined,
      isGuest ? guestInfo.name : session?.user?.name || undefined,
      { paymentMethod: 'stripe_checkout' }
    );

    try {
      const metadata = {
        plan: planData.title,
        ...(isGuest ? {
          guestEmail: guestInfo.email,
          guestName: guestInfo.name,
        } : {}),
      };

      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: planData.priceAmount,
          currency: 'gbp',
          description: planData.description,
          metadata,
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        const errorMsg = data.error?.message || 'Failed to create checkout session';
        setError(errorMsg);
        
        // Track payment failure
        await trackPaymentFailed(
          planData.title,
          planData.priceAmount,
          errorMsg,
          { paymentMethod: 'stripe_checkout' }
        );
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create checkout session';
      setError(errorMsg);
      
      // Track payment failure
      await trackPaymentFailed(
        planData.title,
        planData.priceAmount,
        errorMsg,
        { paymentMethod: 'stripe_checkout' }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid = () => {
    if (!planData || !agreedToTerms) return false;
    if (isGuest) {
      return guestInfo.name.trim() !== '' && guestInfo.email.trim() !== '';
    }
    return true;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Add additional session validation
  if (status === 'authenticated' && !session?.user?.id) {
    console.error('Session loaded but missing user ID:', session);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Session Error</h3>
          <p className="text-gray-600 mb-4">Your session is invalid. Please try signing in again.</p>
          <Button onClick={() => router.push('/auth/signin')}>
            Sign In Again
          </Button>
        </div>
      </div>
    );
  }

  if (!planData && !orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Plan Selected</h3>
            <p className="text-gray-600 mb-4">Please select a plan from the pricing page.</p>
            <Button onClick={() => router.push('/pricing')}>
              Go to Pricing
            </Button>
          </CardContent>
        </Card>
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
                { label: orderId ? 'Retry Payment' : 'Checkout', current: true },
              ]}
              showHome={false}
            />
          </div>
          
          {/* Page Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <CreditCard className="h-8 w-8 text-indigo-600" />
                <span>{orderId ? 'Retry Payment' : 'Checkout'}</span>
              </h1>
              <p className="text-gray-600 mt-2">
                Complete your purchase securely
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          {planData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 text-green-600 mr-2" />
                  Order Summary
                </CardTitle>
                <CardDescription>
                  Review your selected plan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{planData.title}</h3>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      {planData.price}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{planData.description}</p>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-900">Included:</h4>
                    {planData.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total:</span>
                    <span className="text-blue-600">{planData.price}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 text-green-600 mr-2" />
                Payment Details
              </CardTitle>
              <CardDescription>
                Your payment information is secure and encrypted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Guest Information */}
              {isGuest && (
                <div className="space-y-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h3 className="font-medium text-gray-900">Guest Checkout</h3>
                  <p className="text-sm text-gray-600">
                    We'll send you an account invitation after your purchase is complete.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={guestInfo.name}
                        onChange={(e) => handleGuestInfoChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={guestInfo.email}
                        onChange={(e) => handleGuestInfoChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

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
              {useElements && planData && (isGuest || (session?.user?.id)) ? (
                <div className="space-y-4">
                  <StripeElementsForm
                    amount={planData.priceAmount}
                    currency="gbp"
                    description={planData.description}
                    metadata={{
                      plan: planData.title,
                      ...(isGuest ? {
                        guestEmail: guestInfo.email,
                        guestName: guestInfo.name,
                      } : {}),
                    }}
                    onSuccess={async (paymentIntentId) => {
                      // Track successful payment
                      await trackPaymentCompleted(
                        planData.title,
                        planData.priceAmount,
                        paymentIntentId,
                        { paymentMethod: 'stripe_elements' }
                      );
                      
                      sessionStorage.removeItem('selectedPlan');
                      router.push('/payments/success');
                    }}
                    onError={async (error) => {
                      setError(error);
                      
                      // Track payment failure
                      await trackPaymentFailed(
                        planData.title,
                        planData.priceAmount,
                        error,
                        { paymentMethod: 'stripe_elements' }
                      );
                    }}
                  />
                </div>
              ) : useElements && planData && !isGuest && !session?.user?.id ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">
                      Loading user session... Please wait a moment before proceeding with payment.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Stripe Redirect Option */}
              {!useElements && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    You'll be redirected to Stripe's secure checkout page to complete your payment.
                  </p>
                  
                  <Button
                    onClick={handleStripeRedirect}
                    disabled={!isFormValid() || isProcessing}
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

              {/* Terms and Conditions */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 text-blue-600"
                    required
                  />
                  <div className="text-sm">
                    <span className="font-medium text-gray-900">
                      I agree to the terms and conditions *
                    </span>
                    <p className="text-gray-600 mt-1">
                      By proceeding with this purchase, you agree to our terms of service and privacy policy. 
                      This purchase is non-refundable. Your subscription will begin immediately after payment confirmation.
                    </p>
                  </div>
                </label>
              </div>

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
                  Having trouble with your purchase? Our support team is here to help!
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
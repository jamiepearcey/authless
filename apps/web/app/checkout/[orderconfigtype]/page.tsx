"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ErrorRedirects, handleApiError } from '@/lib/error-utils';
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
import { trpc } from "@/lib/trpc";
import { BillingInformationForm, BillingInformation } from '@/components/BillingInformationForm';
import { lookupLocation } from '@/lib/location-lookup';

// Legacy plan data interface (from sessionStorage)
interface PlanData {
  title: string;
  price: string;
  description: string;
  priceAmount: number;
  features: string[];
}

// Guest checkout information
interface GuestInfo {
  name: string;
  email: string;
}

// Helper function to format currency
function formatCurrency(amount: number, currency: string = 'gbp'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

interface CheckoutPageProps {
  params: {
    orderconfigtype: string;
  };
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { trackPageVisit, trackCheckoutStarted, trackPaymentAttempted, trackPaymentCompleted, trackPaymentFailed } = useLeadTracking();
  
  // State for both legacy and new approaches
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [orderConfiguration, setOrderConfiguration] = useState<any>(null);
  const [selectedPricingOption, setSelectedPricingOption] = useState<any>(null);
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: '', email: '' });
  const [billingInfo, setBillingInfo] = useState<BillingInformation>({});
  const [showBillingInfo, setShowBillingInfo] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useElements, setUseElements] = useState(true);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // Create order mutation - using Temporal workflow
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Get config slug from URL parameter instead of query parameter
  const configSlug = params.orderconfigtype;
  const orderId = searchParams.get('orderId'); // Still support retry via query param

  // Fetch order configuration using the URL parameter
  const { data: fetchedOrderConfig, isLoading: isConfigLoading, error: configError } = trpc.getOrderConfigurationBySlug.useQuery(
    { slug: configSlug },
    { enabled: !!configSlug }
  );

  // Handle order configuration data when it loads
  useEffect(() => {
    if (fetchedOrderConfig) {
      setOrderConfiguration(fetchedOrderConfig);
      // Set default pricing option
      const defaultOption = fetchedOrderConfig.pricingOptions?.find((opt: any) => opt.isDefault) || fetchedOrderConfig.pricingOptions?.[0];
      if (defaultOption) {
        setSelectedPricingOption(defaultOption);
      }
    }
  }, [fetchedOrderConfig]);

  useEffect(() => {
    // Track page visit
    trackPageVisit({ page: 'checkout' });

    // Handle legacy sessionStorage approach (fallback)
    if (!configSlug) {
      const storedPlan = sessionStorage.getItem('selectedPlan');
      if (storedPlan) {
        try {
          const plan = JSON.parse(storedPlan);
          setPlanData(plan);
        } catch (error) {
          console.error('Failed to parse stored plan:', error);
        }
      }
    }
  }, [configSlug, trackPageVisit]);

  // Determine current plan/configuration
  const currentPlan = orderConfiguration && selectedPricingOption ? {
    title: orderConfiguration.name,
    price: formatCurrency(selectedPricingOption.amount, selectedPricingOption.currency),
    description: orderConfiguration.description,
    priceAmount: selectedPricingOption.amount,
    features: orderConfiguration.features || [],
  } : planData;

  // Determine if this is guest checkout
  const isGuest = !session?.user?.id;

  // Form validation
  const isFormValid = () => {
    if (isGuest) {
      return guestInfo.name.trim() !== '' && 
             guestInfo.email.trim() !== '' && 
             agreedToTerms;
    }
    return agreedToTerms;
  };

  // Handle billing information changes
  const handleBillingInfoChange = (field: keyof BillingInformation, value: string) => {
    setBillingInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationLookup = async (address: string): Promise<Partial<BillingInformation>> => {
    try {
      const result = await lookupLocation(address);
      return result;
    } catch (error) {
      console.error('Location lookup failed:', error);
      throw error;
    }
  };

  // Create order with payment (for Stripe Elements flow)
  const createOrderWithPayment = async (paymentIntentId: string) => {
    if (!currentPlan) return null;

    setIsCreatingOrder(true);
    setError(null);

    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const workflowParams = {
        orderNumber,
        description: currentPlan.description,
        totalAmount: currentPlan.priceAmount,
        currency: 'gbp',
        isSubscription: currentPlan.title.toLowerCase().includes('subscription') || currentPlan.title.toLowerCase().includes('monthly') || currentPlan.title.toLowerCase().includes('yearly'),
        subscriptionFrequency: currentPlan.title.toLowerCase().includes('yearly') ? 'YEARLY' : 'MONTHLY',
        // Add user context - either userId for authenticated users or null for guest checkout
        ...(session?.user?.id && !isGuest ? { userId: session.user.id } : {}),
        // Payment processing
        paymentIntentId,
        processPayment: true,
        // Wait for workflow to complete so we get the orderId
        waitForResult: true,
        metadata: {
          plan: currentPlan.title,
          ...(orderConfiguration ? {
            orderConfigurationId: orderConfiguration.id,
            pricingOptionId: selectedPricingOption?.id,
          } : {}),
        },
        // Add guest checkout information if guest
        ...(isGuest ? {
          guestName: guestInfo.name,
          guestEmail: guestInfo.email,
        } : {}),
        // Add billing information
        ...(billingInfo.companyName && { billingCompanyName: billingInfo.companyName }),
        ...(billingInfo.vatNumber && { billingVatNumber: billingInfo.vatNumber }),
        ...(billingInfo.addressLine1 && { billingAddressLine1: billingInfo.addressLine1 }),
        ...(billingInfo.addressLine2 && { billingAddressLine2: billingInfo.addressLine2 }),
        ...(billingInfo.city && { billingCity: billingInfo.city }),
        ...(billingInfo.state && { billingState: billingInfo.state }),
        ...(billingInfo.postalCode && { billingPostalCode: billingInfo.postalCode }),
        ...(billingInfo.country && { billingCountry: billingInfo.country }),
      };

      const response = await fetch('/api/workflows/order-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowParams),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (paymentIntent: any) => {
    try {
      // Extract the ID from the PaymentIntent object
      const paymentIntentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id;
      
      // Create order, invoice, and payment record via workflow with payment info
      const orderResult = await createOrderWithPayment(paymentIntentId);

      // Track successful payment
      await trackPaymentCompleted(
        currentPlan!.title,
        currentPlan!.priceAmount,
        paymentIntentId,
        { paymentMethod: 'stripe_elements' }
      );
      
      sessionStorage.removeItem('selectedPlan');
      // Redirect to order details page
      if (orderResult?.orderId) {
        router.push(`/orders/${orderResult.orderId}`);
      } else {
        // If no order was created, redirect to error page
        router.push('/error/order_creation_failed?returnUrl=/checkout');
      }
    } catch (error) {
      console.error('Failed to create order after payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      router.push(`/error/order_creation_failed?returnUrl=/checkout&details=${encodeURIComponent(errorMessage)}`);
    }
  };

  // Handle payment error
  const handlePaymentError = (error: string) => {
    console.error('Payment failed:', error);
    trackPaymentFailed(currentPlan?.title || 'Unknown Plan', error);
    setError(error);
  };

  // Show loading state
  if (status === 'loading' || isConfigLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Show error if configuration not found
  if (configError || (!isConfigLoading && !fetchedOrderConfig && configSlug)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration Not Found</h1>
          <p className="text-gray-600 mb-6">
            The checkout configuration "{configSlug}" could not be found.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/checkout/select">
                Choose a Plan
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                Go Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show error if no plan data available
  if (!currentPlan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Plan Selected</h1>
          <p className="text-gray-600 mb-6">
            Please select a plan to continue with checkout.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/checkout/select">
                Choose a Plan
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                Go Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbNavigation 
        items={[
          { label: 'Home', href: '/' },
          { label: 'Checkout', href: '/checkout/select' },
          { label: currentPlan.title, href: '#' }
        ]} 
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Purchase
          </h1>
          <p className="text-gray-600">
            Review your plan and complete the secure checkout process.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Order Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{currentPlan.title}</h3>
                    <p className="text-gray-600 text-sm">{currentPlan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600">{currentPlan.price}</p>
                  </div>
                </div>
                
                {currentPlan.features && currentPlan.features.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">What's included:</h4>
                    <ul className="space-y-1">
                      {currentPlan.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing Information */}
            <BillingInformationForm
              billingInfo={billingInfo}
              onChange={handleBillingInfoChange}
              showToggle={true}
              isVisible={showBillingInfo}
              onToggleVisibility={setShowBillingInfo}
              enableLocationLookup={true}
              onLocationLookup={handleLocationLookup}
            />

            {/* Security Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Secure Checkout</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Lock className="h-4 w-4 text-green-500" />
                    <span>256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>PCI DSS compliant</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-green-500" />
                    <span>24/7 customer support</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div className="space-y-6">
            {isGuest && (
              <Card>
                <CardHeader>
                  <CardTitle>Guest Checkout</CardTitle>
                  <CardDescription>
                    Enter your details to complete the purchase
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={guestInfo.name}
                      onChange={(e) => setGuestInfo(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={guestInfo.email}
                      onChange={(e) => setGuestInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter your email address"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Choose how you'd like to pay
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="elements"
                      checked={useElements}
                      onChange={() => setUseElements(true)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Credit/Debit Card</div>
                      <div className="text-sm text-gray-500">
                        Pay securely with Stripe (Visa, Mastercard, American Express)
                      </div>
                    </div>
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Stripe Elements Form */}
            {useElements && (
              <StripeElementsForm
                amount={currentPlan.priceAmount}
                currency="gbp"
                description={currentPlan.description}
                disabled={!isFormValid()}
                metadata={{
                  plan: currentPlan.title,
                  ...(orderConfiguration ? {
                    orderConfigurationId: orderConfiguration.id,
                    pricingOptionId: selectedPricingOption?.id,
                  } : {}),
                  // Add user context to metadata
                  ...(session?.user?.id && !isGuest ? {
                    userId: session.user.id,
                    userEmail: session.user.email,
                  } : {}),
                  // Add guest information to metadata
                  ...(isGuest ? {
                    guestName: guestInfo.name,
                    guestEmail: guestInfo.email,
                  } : {}),
                  // Add billing information to metadata
                  ...(billingInfo.companyName && { billingCompanyName: billingInfo.companyName }),
                  ...(billingInfo.vatNumber && { billingVatNumber: billingInfo.vatNumber }),
                  ...(billingInfo.addressLine1 && { billingAddressLine1: billingInfo.addressLine1 }),
                  ...(billingInfo.addressLine2 && { billingAddressLine2: billingInfo.addressLine2 }),
                  ...(billingInfo.city && { billingCity: billingInfo.city }),
                  ...(billingInfo.state && { billingState: billingInfo.state }),
                  ...(billingInfo.postalCode && { billingPostalCode: billingInfo.postalCode }),
                  ...(billingInfo.country && { billingCountry: billingInfo.country }),
                }}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onProcessing={(isProcessing) => {
                  setIsProcessing(isProcessing);
                  if (isProcessing) {
                    trackPaymentAttempted(currentPlan.title, currentPlan.priceAmount);
                  }
                }}
              />
            )}

            {/* Terms and Conditions */}
            <Card>
              <CardContent className="pt-6">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-sm text-gray-600">
                    I agree to the{' '}
                    <Link href="/terms" className="text-indigo-600 hover:text-indigo-800 underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-indigo-600 hover:text-indigo-800 underline">
                      Privacy Policy
                    </Link>
                    . I understand that this is a recurring subscription and will be charged automatically.
                  </div>
                </label>
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Payment Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-center">
                  <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Processing Payment
                    </h3>
                    <div className="mt-1 text-sm text-blue-700">
                      Please wait while we process your payment...
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

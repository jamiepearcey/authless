"use client";

import { useState, useEffect, useCallback } from 'react';
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
  Check,
  Star,
  Calendar,
  DollarSign,
  Users,
  Building,
  Zap,
  MapPin
} from 'lucide-react';
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";
import { StripeElementsForm } from '@stripe/integration/components';
import { useLeadTracking } from '@/hooks/useLeadTracking';
import { trpc } from "@/lib/trpc";
import { BillingInformationForm, BillingInformation } from '@/components/BillingInformationForm';
import { lookupLocation } from '@/lib/location-lookup';

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

// Helper function to get frequency display text
function getFrequencyText(frequency: string): string {
  switch (frequency) {
    case 'MONTHLY': return 'Monthly';
    case 'YEARLY': return 'Annually';
    case 'QUARTERLY': return 'Quarterly';
    case 'EVERY_10_MINUTES': return 'Testing';
    default: return 'One-time';
  }
}

// Helper function to get frequency description
function getFrequencyDescription(frequency: string): string {
  switch (frequency) {
    case 'MONTHLY': return 'Billed every month';
    case 'YEARLY': return 'Billed once per year';
    case 'QUARTERLY': return 'Billed every 3 months';
    case 'EVERY_10_MINUTES': return 'For testing purposes only';
    default: return 'One-time payment';
  }
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
  
  // State management
  const [orderConfiguration, setOrderConfiguration] = useState<any>(null);
  const [selectedPricingOption, setSelectedPricingOption] = useState<any>(null);
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: '', email: '' });
  const [billingInfo, setBillingInfo] = useState<BillingInformation>({});
  const [showBillingInfo, setShowBillingInfo] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useElements, setUseElements] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Get config slug from URL parameter and pricing option from query parameter
  const configSlug = params.orderconfigtype;
  const orderId = searchParams.get('orderId');
  const pricingOptionId = searchParams.get('pricing');

  // Fetch order configuration using the URL parameter
  const { data: fetchedOrderConfig, isLoading: isConfigLoading, error: configError } = trpc.getOrderConfigurationBySlug.useQuery(
    { slug: configSlug },
    { enabled: !!configSlug }
  );

  // Handle order configuration data when it loads
  useEffect(() => {
    if (fetchedOrderConfig) {
      setOrderConfiguration(fetchedOrderConfig);
      
      // Set pricing option based on URL parameter or default
      const pricingOptions = fetchedOrderConfig.pricingOptions || [];
      let targetOption: any = null;
      
      if (pricingOptionId) {
        targetOption = pricingOptions.find((opt: any) => opt.id === pricingOptionId);
      }
      
      if (!targetOption) {
        targetOption = pricingOptions.find((opt: any) => opt.isDefault) || pricingOptions[0];
      }
      
      if (targetOption) {
        setSelectedPricingOption(targetOption);
      }
    }
  }, [fetchedOrderConfig?.id, pricingOptionId]);

  useEffect(() => {
    trackPageVisit({ page: 'checkout' });
  }, [trackPageVisit]);

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
    if (!selectedPricingOption || !orderConfiguration) return null;

    setIsCreatingOrder(true);
    setError(null);

    try {
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const workflowParams = {
        orderNumber,
        description: orderConfiguration.description,
        totalAmount: selectedPricingOption.amount,
        currency: selectedPricingOption.currency,
        isSubscription: selectedPricingOption.isRecurring,
        subscriptionFrequency: selectedPricingOption.frequency,
        // For guest checkouts, we need to create without user or tenant
        ...(session?.user?.id && !isGuest ? { userId: session.user.id } : {}),
        paymentIntentId,
        processPayment: !!paymentIntentId, // Only process payment if we have a payment intent ID
        waitForResult: true,
        metadata: {
          orderConfigurationId: orderConfiguration.id,
          pricingOptionId: selectedPricingOption.id,
        },
        // Guest information - add to workflow params directly
        ...(isGuest ? {
          guestName: guestInfo.name,
          guestEmail: guestInfo.email,
        } : {}),
        // Billing information
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


  // Handle payment error
  const handlePaymentError = (error: string) => {
    console.error('Payment failed:', error);
    trackPaymentFailed(orderConfiguration?.name || 'Unknown Plan', selectedPricingOption?.amount || 0, error);
    setError(error);
  };

  // Handle Stripe Checkout redirect
  const handleStripeCheckout = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Track checkout attempt
      await trackPaymentAttempted(
        orderConfiguration.name,
        selectedPricingOption.amount,
        isGuest ? guestInfo.email : session?.user?.email || undefined,
        isGuest ? guestInfo.name : session?.user?.name || undefined,
        { paymentMethod: 'stripe_checkout' }
      );

      // Create order via workflow first (without payment processing)
      const orderResult = await createOrderWithPayment('');
      
      if (!orderResult?.result?.orderId) {
        throw new Error('Failed to create order');
      }

      // Redirect to order page where they can pay with Stripe
      router.push(`/orders/${orderResult.result.orderId}`);
    } catch (error) {
      console.error('Stripe checkout failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      trackPaymentFailed(orderConfiguration?.name || 'Unknown Plan', selectedPricingOption?.amount || 0, errorMessage);
    } finally {
      setIsProcessing(false);
    }
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Plan Not Found</h1>
          <p className="text-gray-600 mb-6">
            The plan "{configSlug}" could not be found.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/checkout">
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

  // Show error if no pricing options available
  if (!orderConfiguration || !selectedPricingOption) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration Error</h1>
          <p className="text-gray-600 mb-6">
            This plan is not properly configured for purchase.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/checkout">
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
    <div className="min-h-screen bg-white">
      {/* Enhanced Header with Breadcrumbs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link 
              href="/checkout"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Plans
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <BreadcrumbNavigation 
              items={[
                { label: 'Home', href: '/' },
                { label: 'Checkout', href: '/checkout' },
                { label: orderConfiguration.name, current: true }
              ]} 
              showHome={false}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Complete Your Purchase
          </h1>
          <p className="text-xl text-gray-600">
            You're just one step away from getting started with {orderConfiguration.name}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* LEFT SIDE: Billing Cycle + Order Summary */}
          <div className="space-y-8">
            {/* Billing Cycle Selection */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
                Choose Your Billing Cycle
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Select how often you'd like to be billed for {orderConfiguration.name}
              </p>
              <div className="space-y-4">
                {orderConfiguration.pricingOptions
                  ?.filter((opt: any) => opt.isActive)
                  ?.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  ?.map((pricing: any) => (
                  <div
                    key={pricing.id}
                    className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPricingOption?.id === pricing.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                    onClick={() => setSelectedPricingOption(pricing)}
                  >
                    {pricing.isPopular && (
                      <div className="absolute -top-2 left-4">
                        <Badge className="bg-indigo-600 text-white text-xs px-2 py-1">
                          <Star className="h-3 w-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedPricingOption?.id === pricing.id
                              ? 'border-indigo-500 bg-indigo-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedPricingOption?.id === pricing.id && (
                              <div className="w-2 h-2 rounded-full bg-white m-0.5" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {getFrequencyText(pricing.frequency)} - {pricing.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {getFrequencyDescription(pricing.frequency)}
                            </p>
                          </div>
                        </div>
                        
                        {pricing.trialDays > 0 && (
                          <div className="mt-2 text-sm text-green-600 font-medium">
                            {pricing.trialDays} day free trial included
                          </div>
                        )}
                        
                        {pricing.discountDescription && (
                          <div className="mt-1 text-sm text-green-600 font-medium">
                            {pricing.discountDescription}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(pricing.amount, pricing.currency)}
                        </div>
                        {pricing.setupFee > 0 && (
                          <div className="text-sm text-gray-600">
                            + {formatCurrency(pricing.setupFee, pricing.currency)} setup
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest Information */}
            {isGuest && (
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-indigo-600" />
                  Guest Checkout
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Enter your details to complete the purchase
                </p>
                <div className="space-y-4">
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
                </div>
              </div>
            )}


            {/* Order Summary */}
            <div className="border border-gray-200 rounded-lg p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-indigo-600" />
                Order Summary
              </h2>
              <div className="space-y-6">
                {/* Plan Details */}
                <div className="border-b pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{orderConfiguration.name}</h3>
                      <p className="text-gray-600 text-sm">{orderConfiguration.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-600">
                        {formatCurrency(selectedPricingOption.amount, selectedPricingOption.currency)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getFrequencyText(selectedPricingOption.frequency)}
                      </p>
                    </div>
                  </div>
                  
                  {selectedPricingOption.setupFee > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Setup fee</span>
                      <span>{formatCurrency(selectedPricingOption.setupFee, selectedPricingOption.currency)}</span>
                    </div>
                  )}
                </div>
                
                {/* Features */}
                {orderConfiguration.features && orderConfiguration.features.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">What's included:</h4>
                    <ul className="space-y-2">
                      {orderConfiguration.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Trial Information */}
                {selectedPricingOption.trialDays > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-600 mr-2" />
                      <div>
                        <h4 className="font-medium text-green-800">Free Trial</h4>
                        <p className="text-sm text-green-700">
                          {selectedPricingOption.trialDays} days free, then {formatCurrency(selectedPricingOption.amount, selectedPricingOption.currency)} {getFrequencyText(selectedPricingOption.frequency).toLowerCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-indigo-600">
                      {formatCurrency(selectedPricingOption.amount + (selectedPricingOption.setupFee || 0), selectedPricingOption.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Billing Info + Terms & Payment */}
          <div className="space-y-8">
            {/* Billing Information */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-indigo-600" />
                Billing Information
              </h2>
              <div>
                <BillingInformationForm
                  billingInfo={billingInfo}
                  onChange={handleBillingInfoChange}
                  showToggle={true}
                  isVisible={showBillingInfo}
                  onToggleVisibility={setShowBillingInfo}
                  enableLocationLookup={true}
                  onLocationLookup={handleLocationLookup}
                />
              </div>
            </div>

            {/* Terms and Payment Combined */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-indigo-600" />
                Terms & Payment
              </h2>
              <div className="space-y-6">
                {/* Terms Section */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      By purchasing {orderConfiguration.name}, you agree to our:
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <Link href="/terms" className="text-indigo-600 hover:text-indigo-800 underline">Terms of Service</Link>
                      <Link href="/privacy" className="text-indigo-600 hover:text-indigo-800 underline">Privacy Policy</Link>
                      <Link href="/refund" className="text-indigo-600 hover:text-indigo-800 underline">Refund Policy</Link>
                    </div>
                    
                    {selectedPricingOption.isRecurring && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Recurring Subscription:</strong> You will be charged {formatCurrency(selectedPricingOption.amount, selectedPricingOption.currency)} {getFrequencyText(selectedPricingOption.frequency).toLowerCase()} until you cancel.
                        </p>
                      </div>
                    )}
                    
                    {orderConfiguration.termsContent && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <h5 className="font-medium text-gray-900 mb-2 text-sm">Plan-specific terms:</h5>
                        <div 
                          className="text-xs text-gray-700 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: orderConfiguration.termsContent }}
                        />
                      </div>
                    )}
                  </div>

                  <label className="flex items-start space-x-3 cursor-pointer pt-2 border-t">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                      required
                    />
                    <span className="text-sm font-medium text-gray-900">
                      I agree to the terms and conditions above *
                    </span>
                  </label>
                </div>

                {/* Payment Section */}
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-indigo-600" />
                    Payment Method
                  </h3>
                  
                  {/* Payment Method Toggle */}
                  <div className="flex items-center space-x-4 mb-6">
                    <button
                      onClick={() => setUseElements(true)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        useElements
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      <CreditCard className="h-4 w-4 inline mr-2" />
                      Card Payment
                    </button>
                    <button
                      onClick={() => setUseElements(false)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        !useElements
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      <Shield className="h-4 w-4 inline mr-2" />
                      Stripe Checkout
                    </button>
                  </div>

                  {/* Payment Form */}
                  {useElements ? (
                    <div className="space-y-4">
                      <StripeElementsForm
                        amount={selectedPricingOption.amount}
                        currency={selectedPricingOption.currency}
                        description={`${orderConfiguration.name} - ${getFrequencyText(selectedPricingOption.frequency)}`}
                        disabled={!isFormValid()}
                        metadata={{
                          plan: orderConfiguration.name,
                          pricingOption: selectedPricingOption.id,
                          frequency: selectedPricingOption.frequency || '',
                          isSubscription: selectedPricingOption.isRecurring.toString(),
                          ...(session?.user?.id && { userId: session.user.id }),
                          ...(isGuest && guestInfo.email && { guestEmail: guestInfo.email }),
                          ...(isGuest && guestInfo.name && { guestName: guestInfo.name }),
                        }}
                        onSuccess={async (paymentIntent) => {
                          try {
                            // Extract the ID from the PaymentIntent object
                            const paymentIntentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id;
                            
                            // Create order, invoice, and payment record via workflow with payment info
                            const orderResult = await createOrderWithPayment(paymentIntentId);

                            // Track successful payment
                            await trackPaymentCompleted(
                              orderConfiguration.name,
                              selectedPricingOption.amount,
                              paymentIntentId,
                              { paymentMethod: 'stripe_elements' }
                            );
                            
                            // Redirect to order details page
                            if (orderResult?.result?.orderId) {
                              router.push(`/orders/${orderResult.result.orderId}`);
                            } else {
                              // If no order was created, redirect to error page
                              router.push('/error/order_creation_failed?returnUrl=/checkout');
                            }
                          } catch (error) {
                            console.error('Failed to create order after payment:', error);
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            router.push(`/error/order_creation_failed?returnUrl=/checkout&details=${encodeURIComponent(errorMessage)}`);
                          }
                        }}
                        onError={handlePaymentError}
                        onProcessing={setIsProcessing}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button
                        onClick={handleStripeCheckout}
                        disabled={!isFormValid() || isProcessing}
                        className="w-full py-3 text-lg font-semibold"
                        size="lg"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Shield className="h-5 w-5 mr-2" />
                            Pay with Stripe Checkout
                          </>
                        )}
                      </Button>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          You'll be redirected to Stripe's secure checkout page
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Payment Error</h3>
                          <div className="mt-2 text-sm text-red-700">{error}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
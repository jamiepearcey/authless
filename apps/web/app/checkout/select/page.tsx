"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { Button } from '@ui/base';
import { Badge } from '@ui/base';
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  CreditCard,
  Check,
  Star,
  ShoppingCart,
  Zap
} from 'lucide-react';
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";
import { useLeadTracking } from '@/hooks/useLeadTracking';
import { trpc } from "@/lib/trpc";

// Helper function to format currency
function formatCurrency(amount: number, currency: string = 'gbp'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function CheckoutSelectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { trackPageVisit, trackCheckoutStarted } = useLeadTracking();
  
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Fetch all public order configurations
  const { data: orderConfigurations, isLoading, error } = trpc.getPublicOrderConfigurations.useQuery({
    tenantId: undefined, // Get platform-level configurations
  });

  // Minimal fallback configurations if API fails
  const fallbackConfigurations = [
    {
      id: 'starter',
      slug: 'starter',
      name: 'Starter Plan',
      description: 'Perfect for individuals and small teams getting started with basic features and support.',
      shortDescription: 'Ideal for individuals and small teams.',
      features: [
        'Core features included',
        'Email support',
        'Basic analytics',
        'Up to 5 team members',
        'Standard integrations',
        'Community access'
      ],
      pricingOptions: [
        {
          id: 'starter-monthly',
          name: 'Monthly',
          amount: 990, // £9.90
          currency: 'gbp',
          frequency: 'MONTHLY',
          isRecurring: true,
          isPopular: false,
          discountDescription: null
        }
      ],
      isActive: true,
      displayOrder: 0
    }
  ];

  useEffect(() => {
    // Track page visit
    trackPageVisit({ page: 'checkout-select' });
  }, [trackPageVisit]);

  const handleSelectConfiguration = (configSlug: string) => {
    setSelectedConfig(configSlug);
    setIsNavigating(true);
    
    // Navigate to checkout page with the selected configuration using new URL structure
    router.push(`/checkout/${configSlug}`);
  };

  const handleDefaultCheckout = () => {
    setIsNavigating(true);
    // Navigate to default checkout (current behavior)
    router.push('/checkout');
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading checkout options...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Options</h2>
          <p className="text-gray-600 mb-4">Unable to load checkout options. Please try again.</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                { label: "Select Plan", current: true },
              ]}
              showHome={false}
            />
          </div>
          
          {/* Page Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center space-x-3 mb-4">
              <ShoppingCart className="h-10 w-10 text-indigo-600" />
              <span>Choose Your Plan</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Select the plan that best fits your needs. You can always upgrade or change later.
            </p>
          </div>
        </div>

        {/* Quick Default Checkout Option */}
        <div className="mb-8">
          <Card className="border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <Zap className="h-6 w-6 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Quick Checkout</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Skip plan selection and go directly to the checkout page with your saved preferences.
              </p>
              <Button 
                onClick={handleDefaultCheckout}
                disabled={isNavigating}
                variant="outline"
                size="lg"
              >
                {isNavigating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Continue to Checkout
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Plan Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {(orderConfigurations && orderConfigurations.length > 0 ? orderConfigurations : fallbackConfigurations).map((config: any) => {
            const popularOption = config.pricingOptions?.find((opt: any) => opt.isPopular);
            const minPrice = Math.min(...(config.pricingOptions?.filter((opt: any) => opt.amount > 0).map((opt: any) => opt.amount) || [0]));
            
            return (
              <Card 
                key={config.id} 
                className={`relative transition-all duration-200 hover:shadow-lg cursor-pointer ${
                  selectedConfig === config.slug ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-md'
                }`}
                onClick={() => handleSelectConfiguration(config.slug)}
              >
                {popularOption && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-indigo-600 text-white px-3 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {config.name}
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {config.shortDescription}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Pricing Display */}
                  <div className="text-center mb-6">
                    {config.pricingOptions?.some((opt: any) => opt.amount === 0) ? (
                      <div className="text-2xl font-bold text-gray-900">Contact Sales</div>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-gray-900">
                          {formatCurrency(minPrice)}
                        </div>
                        {config.pricingOptions?.some((opt: any) => opt.isRecurring) && (
                          <div className="text-sm text-gray-500">
                            {popularOption?.frequency === 'YEARLY' ? 'per year' : 'per month'}
                          </div>
                        )}
                        {popularOption?.discountDescription && (
                          <div className="text-sm text-green-600 font-medium mt-1">
                            {popularOption.discountDescription}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {config.features?.map((feature: string, index: number) => (
                      <div key={index} className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Action Button */}
                  <Button 
                    className="w-full" 
                    variant={popularOption ? "default" : "outline"}
                    disabled={isNavigating}
                  >
                    {isNavigating && selectedConfig === config.slug ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Select Plan
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Information */}
        <div className="text-center text-sm text-gray-500 max-w-2xl mx-auto">
          <p className="mb-2">
            All plans include a 30-day money-back guarantee. You can upgrade, downgrade, or cancel at any time.
          </p>
          <p>
            Need help choosing? <Link href="/contact" className="text-indigo-600 hover:text-indigo-800">Contact our sales team</Link> for personalized recommendations.
          </p>
        </div>
      </div>
    </div>
  );
}

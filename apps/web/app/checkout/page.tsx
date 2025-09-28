"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@ui/base';
import { Button } from '@ui/base';
import { Badge } from '@ui/base';
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  CreditCard,
  Check,
  Star,
  ShoppingCart
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

export default function CheckoutPage() {
  const { status } = useSession();
  const router = useRouter();
  const { trackPageVisit } = useLeadTracking();
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Fetch all public order configurations
  const { data: orderConfigurations, isLoading, error } = trpc.getPublicOrderConfigurations.useQuery({
    tenantId: undefined,
  });

  useEffect(() => {
    trackPageVisit({ page: 'checkout' });
  }, [trackPageVisit]);

  const handleSelectPlan = (configSlug: string) => {
    setSelectedPlan(configSlug);
    setIsNavigating(true);
    router.push(`/checkout/${configSlug}`);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Plans</h2>
          <p className="text-gray-600 mb-6">We're having trouble loading the available plans. Please try again.</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const configurations = orderConfigurations || [];
  const sortedConfigurations = configurations.sort((a: any, b: any) => 
    (a.displayOrder || 0) - (b.displayOrder || 0)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link 
              href="/"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <BreadcrumbNavigation
              items={[
                { label: "Home", href: "/" },
                { label: "Checkout", current: true },
              ]}
              showHome={false}
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select the plan that fits your needs. You can always upgrade or change later.
          </p>
        </div>

        {configurations.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Plans Available</h3>
            <p className="text-gray-600 mb-6">
              Plans are currently being configured. Please check back soon.
            </p>
            <Button asChild variant="outline">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {sortedConfigurations.map((config: any) => {
              const popularOption = config.pricingOptions?.find((opt: any) => opt.isPopular);
              const minPrice = Math.min(...(config.pricingOptions?.filter((opt: any) => opt.amount > 0).map((opt: any) => opt.amount) || [0]));
              
              return (
                <Card 
                  key={config.id} 
                  className={`relative transition-all duration-200 hover:shadow-xl cursor-pointer ${
                    popularOption ? 'ring-2 ring-indigo-500' : 'hover:shadow-lg'
                  }`}
                  onClick={() => handleSelectPlan(config.slug)}
                >
                  {popularOption && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-indigo-600 text-white px-3 py-1">
                        <Star className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardContent className="p-8">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {config.name}
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {config.shortDescription || config.description}
                      </p>
                      
                      {/* Price Display */}
                      <div className="mb-6">
                        {config.pricingOptions?.some((opt: any) => opt.amount === 0) ? (
                          <div className="text-2xl font-bold text-gray-900">Contact Sales</div>
                        ) : (
                          <>
                            <div className="text-3xl font-bold text-gray-900">
                              From {formatCurrency(minPrice)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Multiple billing options available
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Features */}
                      {config.features && config.features.length > 0 && (
                        <div className="space-y-3 mb-8 text-left">
                          {config.features.slice(0, 5).map((feature: string, index: number) => (
                            <div key={index} className="flex items-center text-sm">
                              <Check className="h-4 w-4 text-green-600 mr-3 flex-shrink-0" />
                              <span className="text-gray-700">{feature}</span>
                            </div>
                          ))}
                          {config.features.length > 5 && (
                            <div className="text-sm text-gray-500 text-center pt-2">
                              + {config.features.length - 5} more features
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Action Button */}
                      <Button 
                        className="w-full" 
                        variant={popularOption ? "default" : "outline"}
                        disabled={isNavigating}
                      >
                        {isNavigating && selectedPlan === config.slug ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Choose Plan
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 mb-6">
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-2 text-green-600" />
              <span>30-day money-back guarantee</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-2 text-green-600" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-2 text-green-600" />
              <span>Instant activation</span>
            </div>
          </div>
          <p className="text-gray-600">
            Need help choosing? <Link href="/contact" className="text-indigo-600 hover:text-indigo-800">Contact our sales team</Link> for personalized recommendations.
          </p>
        </div>
      </div>
    </div>
  );
}
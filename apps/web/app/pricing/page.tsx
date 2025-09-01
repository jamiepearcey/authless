"use client";

import Link from "next/link";
import { Button } from "@ui/base";
import { 
  Check, 
  X,
  Star,
  Rocket,
  Users,
  Crown,
  Building,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Zap,
  CreditCard,
  Loader2
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLeadTracking } from "@/hooks/useLeadTracking";
import { StripeElementsForm } from '@stripe/integration/components';

const PricingCard = ({ 
  title, 
  price, 
  description, 
  features, 
  notIncluded = [],
  highlight = false,
  buttonText,
  buttonLink,
  delay = 0,
  icon: Icon,
  priceAmount,
  isPaymentEnabled = false
}: {
  title: string;
  price: string;
  description: string;
  features: string[];
  notIncluded?: string[];
  highlight?: boolean;
  buttonText: string;
  buttonLink: string;
  delay?: number;
  icon: any;
  priceAmount?: number; // Price in pence
  isPaymentEnabled?: boolean;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { data: session } = useSession();
  const router = useRouter();
  const { trackPlanSelection } = useLeadTracking();
  const [isProcessing, setIsProcessing] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showElementsForm, setShowElementsForm] = useState(false);

  const handlePayment = async () => {
    // Track plan selection
    await trackPlanSelection(title, {
      price: price,
      amount: priceAmount?.toString() || '0'
    });

    if (!isPaymentEnabled || !priceAmount) {
      // Fallback to link navigation
      router.push(buttonLink);
      return;
    }

    // Always redirect to dedicated checkout page with plan details
    const planData = {
      title,
      price,
      description,
      priceAmount,
      features,
    };
    
    // Store plan data in sessionStorage for the checkout page
    sessionStorage.setItem('selectedPlan', JSON.stringify(planData));
    
    // Redirect to checkout page
    router.push('/checkout');
  };




  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay }}
      className={`relative ${highlight ? "scale-105 z-10" : ""}`}
    >
      {highlight && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: delay + 0.1 }}
          className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white px-4 py-1 rounded-full text-sm font-medium"
        >
          🔥 Most Popular
        </motion.div>
      )}
      
      <motion.div 
        className={`p-8 rounded-2xl border-2 ${
          highlight 
            ? "border-indigo-200 bg-gradient-to-br from-indigo-50 to-cyan-50 shadow-2xl" 
            : "border-gray-200 bg-white shadow-lg"
        } h-full hover:shadow-2xl transition-all duration-250`}
        whileHover={{ 
          y: -4,
          transition: { type: "spring", stiffness: 400, damping: 25 }
        }}
      >
        <div className="text-center mb-8">
          <motion.div 
            className={`w-16 h-16 ${
              highlight 
                ? "bg-gradient-to-br from-indigo-500 to-cyan-500" 
                : "bg-gradient-to-br from-gray-600 to-gray-800"
            } rounded-2xl flex items-center justify-center mx-auto mb-4`}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Icon className="h-8 w-8 text-white" />
          </motion.div>
          
          <h3 className={`text-2xl font-bold mb-2 ${highlight ? "text-indigo-600" : "text-gray-900"}`}>
            {title}
          </h3>
          
          <motion.div 
            className="mb-4"
            initial={{ opacity: 0.8 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, delay: delay + 0.1 }}
          >
            <span className={`text-5xl font-bold ${highlight ? "text-indigo-600" : "text-gray-900"}`}>
              {price}
            </span>
            {price !== "Custom" && (
              <span className="text-gray-500 text-lg">/lifetime</span>
            )}
          </motion.div>
          
          <p className="text-gray-600">{description}</p>
        </div>

        <div className="space-y-4 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -8 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
              transition={{ type: "spring", stiffness: 400, damping: 25, delay: delay + 0.05 + (index * 0.03) }}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              </motion.div>
              <span className="text-gray-700 text-sm">{feature}</span>
            </motion.div>
          ))}
          
          {notIncluded.map((feature, index) => (
            <motion.div
              key={`not-${index}`}
              className="flex items-start gap-3 opacity-50"
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 0.5, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.4, delay: delay + 0.1 + ((features.length + index) * 0.05) }}
            >
              <X className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="text-gray-400 text-sm line-through">{feature}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          <Button 
            onClick={handlePayment}
            disabled={isProcessing}
            size="lg" 
            className={`w-full text-lg py-4 rounded-xl transition-all duration-300 ${
              highlight
                ? "bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white shadow-lg"
                : "bg-gray-900 hover:bg-gray-800 text-white"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : isPaymentEnabled && priceAmount ? (
              <>
                <CreditCard className="mr-2 h-5 w-5" />
                {buttonText}
              </>
            ) : (
              <>
                {buttonText}
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>

      </motion.div>
    </motion.div>
  );
};

const ComparisonTable = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const comparisons = [
    {
      category: "Authentication",
      authless: ["Passkeys", "2FA/MFA", "SSO", "Device Management"],
      hosted: ["Basic auth", "Limited 2FA", "Enterprise SSO ($$$)", "No device control"],
      custom: ["6-12 months", "Security risks", "Compliance complexity", "Ongoing maintenance"]
    },
    {
      category: "Multi-Tenancy",
      authless: ["Built-in", "Custom domains", "Data isolation", "Admin console"],
      hosted: ["Not included", "Manual setup", "Limited isolation", "No admin tools"],
      custom: ["Complex architecture", "3-6 months", "Data leakage risks", "Custom admin UI"]
    },
    {
      category: "Real-time Features",
      authless: ["Self-hosted", "No limits", "Full control", "Custom channels"],
      hosted: ["Per-connection fees", "Usage limits", "Vendor dependency", "Limited customization"],
      custom: ["WebSocket complexity", "Scaling challenges", "Infrastructure costs", "Maintenance burden"]
    },
    {
      category: "Cost at 10K Users",
      authless: ["£400 one-time OR £0 (if qualifying)", "Infrastructure only: £50-200/month", "No surprise fees", "Predictable scaling"],
      hosted: ["£500-2,500/month", "Per-user fees", "Feature upsells", "Exponential growth"],
      custom: ["£150K+ dev costs", "Opportunity cost", "Bug fixing time", "Security incidents"]
    }
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.8 }}
      className="overflow-x-auto"
    >
      <table className="w-full border-collapse bg-white rounded-2xl overflow-hidden shadow-xl">
        <thead>
          <tr className="bg-gradient-to-r from-indigo-600 to-cyan-600 text-white">
            <th className="p-6 text-left">Feature Category</th>
            <th className="p-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <Rocket className="h-5 w-5" />
                Authless
              </div>
            </th>
            <th className="p-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="h-5 w-5" />
                Hosted Services
              </div>
            </th>
            <th className="p-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Build Custom
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((row, index) => (
            <motion.tr
              key={index}
              initial={{ opacity: 0, x: -50 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="p-6 font-semibold text-gray-900">{row.category}</td>
              <td className="p-6">
                <div className="space-y-2">
                  {row.authless.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </td>
              <td className="p-6">
                <div className="space-y-2">
                  {row.hosted.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-orange-600">
                      <X className="h-4 w-4" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </td>
              <td className="p-6">
                <div className="space-y-2">
                  {row.custom.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-red-600">
                      <X className="h-4 w-4" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};

export default function PricingPage() {
  const heroRef = useRef(null);
  const { trackPageVisit } = useLeadTracking();

  useEffect(() => {
    // Track page visit
    trackPageVisit({ page: 'pricing' });
  }, [trackPageVisit]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,165,0,0.1),transparent_50%)]" />

        <div className="mx-auto max-w-7xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 to-cyan-100 px-4 py-2 text-sm font-medium text-indigo-700 mb-8"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Star className="h-4 w-4" />
            </motion.div>
            Transparent Pricing
          </motion.div>

          <motion.h1 
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Escape the{" "}
            <motion.span 
              className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent"
              animate={{ 
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: "200% 200%" }}
            >
              Per-User Tax
            </motion.span>
          </motion.h1>

          <motion.p 
            className="mx-auto max-w-4xl text-xl md:text-2xl text-gray-600 leading-relaxed mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Free for charities, individuals, and small businesses. Fair one-time pricing for larger companies. 
            Never pay per-user again.
          </motion.p>

          {/* Cost Calculator */}
          <motion.div 
            className="bg-white rounded-2xl p-8 shadow-xl max-w-5xl mx-auto mb-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h3 className="text-2xl font-bold mb-6">True Cost Comparison</h3>
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div className="p-6 bg-red-50 rounded-xl">
                <h4 className="font-bold text-red-600 mb-2">Hosted Auth at 10K Users</h4>
                <div className="text-3xl font-bold text-red-600 mb-2">£2,000+</div>
                <div className="text-sm text-red-500">per month forever</div>
              </div>
              <div className="p-6 bg-orange-50 rounded-xl">
                <h4 className="font-bold text-orange-600 mb-2">Custom Development</h4>
                <div className="text-3xl font-bold text-orange-600 mb-2">£150K+</div>
                <div className="text-sm text-orange-500">upfront + maintenance</div>
              </div>
              <div className="p-6 bg-blue-50 rounded-xl">
                <h4 className="font-bold text-blue-600 mb-2">Authless Commercial</h4>
                <div className="text-3xl font-bold text-blue-600 mb-2">£400</div>
                <div className="text-sm text-blue-500">one-time payment</div>
              </div>
              <div className="p-6 bg-green-50 rounded-xl">
                <h4 className="font-bold text-green-600 mb-2">Authless Free</h4>
                <div className="text-3xl font-bold text-green-600 mb-2">£0</div>
                <div className="text-sm text-green-500">for qualifying users</div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-600">
                💡 <strong>Free tier qualifies for:</strong> Charities, non-profits, individuals, and companies with annual revenue under £100,000
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Choose Your Path to Freedom
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Perpetual licenses. No per-user fees. Reverse trial. Save 8-12+ weeks of engineering.
            </p>
          </motion.div>

          {/* Founding Cohort Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-4xl mx-auto mb-12 p-6 bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-200 rounded-2xl text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🚀
              </motion.div>
              <span className="font-bold text-orange-800 text-lg">Founding Cohort Special</span>
            </div>
            <p className="text-orange-700 mb-4">
              First 100 buyers get <strong>Commercial License for £299</strong> (save £100) with same 12-month updates + priority support
            </p>
            <div className="text-sm text-orange-600">
              ✅ 30-day money-back guarantee • ✅ Vote on roadmap features • ✅ Maintenance still £120/year
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <PricingCard
              icon={Rocket}
              title="Free (Maker)"
              price="£0"
              description="Full core kernel with attribution"
              features={[
                "Complete SaaS foundation",
                "Auth (passkeys, TOTP, WhatsApp 2FA)",
                "Multi-tenancy + custom domains",
                "i18n codegen + LLM fill",
                "Real-time notifications",
                "Support system + reply-loop",
                "Basic feature flags",
                "Audit logs + compliance",
                "Community support",
                "Attribution in footer required"
              ]}
              buttonText="Start Building"
              buttonLink="/setup"
              delay={0.05}
            />

            <PricingCard
              icon={Crown}
              title="Commercial"
              price="£299"
              description="Perpetual license + 12mo updates & priority support"
              features={[
                "Everything in Free (Maker)",
                "No attribution required",
                "Per-tenant SSO presets",
                "Observability dashboards",
                "Backup/restore UI",
                "Premium n8n packs (WhatsApp/SMS)",
                "Priority email support",
                "Perpetual license (runs forever)",
                "12 months updates included",
                "Maintenance: £120/year after"
              ]}
              highlight={true}
              buttonText="Get License - £299"
              buttonLink="/contact"
              priceAmount={29900} // £299 in pence
              isPaymentEnabled={true}
              delay={0.1}
            />

            <PricingCard
              icon={Users}
              title="Agency/Studio"
              price="£999"
              description="Unlimited client projects + transfer tools"
              features={[
                "Everything in Commercial",
                "Unlimited client projects",
                "Client transfer tooling",
                "Migration playbooks",
                "White-glove setup (£299 value)",
                "Installation + SSO setup included",
                "Priority Slack support",
                "Quarterly strategy calls",
                "Early access to new modules",
                "Annual license (renews yearly)"
              ]}
              buttonText="Perfect for Agencies"
              buttonLink="/contact"
              priceAmount={99900} // £999 in pence
              isPaymentEnabled={true}
              delay={0.15}
            />

            <PricingCard
              icon={Building}
              title="Enterprise"
              price="Custom"
              description="SLA + security reviews + assisted SSO/SCIM"
              features={[
                "Everything in Agency/Studio", 
                "Custom SLA guarantees",
                "Security reviews + pen testing",
                "Assisted SSO/SCIM setup",
                "Compliance documentation",
                "Dedicated support channel",
                "Advanced audit + export",
                "Custom deployment options",
                "Migration assistance",
                "Training + onboarding",
                "Annual contract"
              ]}
              buttonText="Contact Sales"
              buttonLink="/contact"
              delay={0.2}
            />
          </div>

          {/* Reverse Trial Explanation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-4xl mx-auto mt-12 p-6 bg-gradient-to-r from-indigo-50 to-cyan-50 border-2 border-indigo-200 rounded-2xl text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-indigo-600" />
              <span className="font-bold text-indigo-800 text-lg">Reverse Trial</span>
            </div>
            <p className="text-indigo-700 mb-2">
              All Pro modules work for <strong>30 days</strong> out of the box. No credit card, no lockout.
            </p>
            <p className="text-sm text-indigo-600">
              If you don't license, features gracefully fall back to Free tier - keep shipping, no data loss.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold mb-6">
              Why Authless Wins Every Time
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Compare the real costs and capabilities of each approach.
            </p>
          </motion.div>

          <ComparisonTable />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold mb-6">Frequently Asked Questions</h2>
          </motion.div>

          <div className="space-y-8">
            {            [
              {
                question: "What's included in the Free (Maker) tier?",
                answer: "The complete SaaS foundation: auth (passkeys, TOTP, WhatsApp 2FA), multi-tenancy, i18n codegen, real-time notifications, support system, basic feature flags, and audit logs. Only requires attribution in footer."
              },
              {
                question: "When do I need the £399 Commercial license?",
                answer: "Commercial license removes attribution and adds Pro modules: advanced feature flags (%, variants, staged rollouts), per-tenant SSO presets, SCIM, observability dashboards, premium n8n packs. Perpetual license + 12 months updates & priority support included. Maintenance: £120/year after."
              },
              {
                question: "What's the Founding Cohort special?",
                answer: "First 100 buyers get Commercial License for £299 (save £100) with same 12-month updates + priority support. 30-day money-back guarantee, vote on roadmap features, maintenance still £120/year after."
              },
              {
                question: "What's the Reverse Trial?",
                answer: "All Pro modules work for 30 days out of the box. No credit card, no lockout. If you don't license, features gracefully fall back to Free tier - keep shipping, no data loss."
              },
              {
                question: "When should I choose Agency/Studio (£999/year)?",
                answer: "Perfect for agencies building multiple client projects. Includes unlimited client projects, transfer tooling, migration playbooks, white-glove setup, and priority Slack support. Annual license."
              },
              {
                question: "How is this different from hosted auth services?",
                answer: "Hosted services charge per user (£2-10/user/month) and lock you in. Authless is self-hosted with no per-user fees. Save 8-12+ weeks of senior engineering vs building from scratch. One weekend vs months."
              },
              {
                question: "What about Enterprise pricing?",
                answer: "Custom annual contracts for organizations needing SLAs, security reviews, assisted SSO/SCIM setup, compliance documentation, and dedicated support channels. Contact sales for pricing."
              },
              {
                question: "Do you offer setup assistance?",
                answer: "Yes! White-glove setup (installation + SSO configuration) available as £299-£1,500 add-on depending on complexity. Included with Agency/Studio tier."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-sm"
              >
                <h3 className="text-xl font-bold mb-3">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-cyan-600">
        <div className="mx-auto max-w-4xl px-4 text-center text-white">
          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Join the Founding Cohort
          </motion.h2>
          
          <motion.p 
            className="text-xl md:text-2xl mb-12 opacity-90"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Get Commercial License for <strong>£299</strong> (save £100). Perpetual license + 12 months updates.
            <br />
            30-day money-back guarantee. No per-user fees. Deploy in 2 minutes.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button asChild size="lg" className="text-lg px-8 py-6 rounded-xl bg-white text-indigo-600 hover:bg-gray-50 shadow-lg">
                <Link href="/setup">
                  <Rocket className="mr-2 h-5 w-5" />
                  Deploy Free Now
                </Link>
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl border-2 border-white text-black hover:bg-white/10">
                <Link href="/contact">
                  <Building className="mr-2 h-5 w-5" />
                  Claim Founding Discount
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div 
            className="text-sm opacity-80"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.8 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <p>Free for revenue under £100k • £400 lifetime for larger businesses</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

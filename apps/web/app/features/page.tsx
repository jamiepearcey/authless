"use client";

import Link from "next/link";
import { Button } from "@ui/base";
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  Server, 
  Globe, 
  Check, 
  Star,
  Users,
  Code,
  Rocket,
  Lock,
  MessageCircle,
  Database,
  Palette,
  Timer,
  Settings,
  Bell,
  Phone,
  Mail,
  Eye,
  Target,
  BarChart3,
  FileText,
  Layers,
  Workflow,
  Cloud
} from "lucide-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef } from "react";

const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  features, 
  gradient,
  delay = 0 
}: {
  icon: any;
  title: string;
  description: string;
  features: string[];
  gradient: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay }}
      className="group"
    >
      <motion.div 
        className="p-8 rounded-2xl border-2 border-gray-100 hover:border-white hover:shadow-2xl transition-all duration-300 bg-white h-full"
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <motion.div 
          className={`w-16 h-16 ${gradient} rounded-2xl flex items-center justify-center mb-6`}
          whileHover={{ rotate: 5, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300, damping: 10 }}
        >
          <Icon className="h-8 w-8 text-white" />
        </motion.div>
        
        <h3 className="text-2xl font-bold mb-4 group-hover:text-indigo-600 transition-colors">
          {title}
        </h3>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          {description}
        </p>
        
        <div className="space-y-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: delay + 0.1 + (index * 0.05) }}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              </motion.div>
              <span className="text-gray-700 text-sm">{feature}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

const StatCard = ({ number, label, delay = 0 }: { number: string; label: string; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 150, damping: 20, delay }}
      className="text-center"
    >
      <motion.div 
        className="text-4xl font-bold text-indigo-600 mb-2"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 10 }}
      >
        {number}
      </motion.div>
      <div className="text-gray-600">{label}</div>
    </motion.div>
  );
};

export default function FeaturesPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  const features = [
    {
      icon: Shield,
      title: "Enterprise Authentication",
      description: "Complete authentication system with modern security standards built for scale.",
      features: [
        "Passkeys/WebAuthn with device management",
        "TOTP & WhatsApp/SMS 2FA with rate limiting",
        "Google, GitHub OAuth + custom providers",
        "Tenant SSO (OpenID Connect) for enterprise",
        "Session management & device revocation",
        "Breach checks & security monitoring"
      ],
      gradient: "bg-gradient-to-br from-indigo-500 to-purple-600",
      delay: 0.1
    },
    {
      icon: Users,
      title: "Multi-Tenancy + Domains",
      description: "Enterprise-grade multi-tenancy with custom domains and complete data isolation.",
      features: [
        "Subdomain & custom domain resolution",
        "Tenant admin console with full control",
        "Magic links & secure invite system",
        "Role-based access control (RBAC)",
        "Data isolation & tenant scoping",
        "Bulk user operations & management"
      ],
      gradient: "bg-gradient-to-br from-cyan-500 to-blue-600",
      delay: 0.2
    },
    {
      icon: Globe,
      title: "LLM-Powered Internationalization",
      description: "Revolutionary i18n system with AI-assisted translations and automatic code generation.",
      features: [
        "CLI auto-finds English strings in code",
        "Generates stable IDs with smart heuristics",
        "LLM fills missing translations with context",
        "Developer approval workflow for translations",
        "One-click language expansion",
        "Production-ready i18n architecture"
      ],
      gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
      delay: 0.3
    },
    {
      icon: Bell,
      title: "Real-Time Notifications",
      description: "Self-hosted real-time engine with comprehensive notification system.",
      features: [
        "Self-hosted Ably alternative (no vendor fees)",
        "In-app notification tray + dedicated page",
        "Email & WhatsApp via webhook workflows",
        "Smart targeting: users, roles, tenants, global",
        "User notification preferences & opt-outs",
        "Digest scheduling & batching"
      ],
      gradient: "bg-gradient-to-br from-orange-500 to-red-600",
      delay: 0.4
    },
    {
      icon: MessageCircle,
      title: "Support + Contact System",
      description: "Complete customer support system with email threading and SLA management.",
      features: [
        "User-facing support forms with smart routing",
        "Email threading via webhooks (Mailgun integration)",
        "Inbound email replies threaded back to app",
        "SLA tracking & escalation workflows",
        "Admin deletion & audit capabilities",
        "Global + tenant-level routing rules"
      ],
      gradient: "bg-gradient-to-br from-purple-500 to-pink-600",
      delay: 0.5
    },
    {
      icon: Settings,
      title: "Feature Flags + Audit",
      description: "Comprehensive feature management with compliance-ready audit logging.",
      features: [
        "Global (platform) & tenant-level toggles",
        "Three tiers: Core, Secondary, Tenancy-only",
        "Simple precedence: tenant > global > default",
        "Cache + pub/sub invalidation for performance",
        "Complete audit trail for compliance",
        "Discussion walls attachable to any resource"
      ],
      gradient: "bg-gradient-to-br from-gray-700 to-gray-900",
      delay: 0.6
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-20">
        <motion.div 
          className="absolute inset-0 -z-10"
          style={{ y, opacity }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,165,0,0.1),transparent_50%)]" />
        </motion.div>

        <div className="mx-auto max-w-7xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 to-cyan-100 px-4 py-2 text-sm font-medium text-indigo-700 mb-8"
          >
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Star className="h-4 w-4" />
            </motion.div>
            Complete SaaS Foundation
          </motion.div>

          <motion.h1 
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.1 }}
          >
            Enterprise Features.{" "}
            <motion.span 
              className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent"
              initial={{ backgroundPosition: "0% 50%" }}
              animate={{ backgroundPosition: "100% 50%" }}
              transition={{ 
                duration: 8, 
                repeat: Infinity, 
                repeatType: "reverse",
                ease: "easeInOut"
              }}
              style={{ backgroundSize: "200% 200%" }}
            >
              Day One.
            </motion.span>
          </motion.h1>

          <motion.p 
            className="mx-auto max-w-3xl text-xl md:text-2xl text-gray-600 leading-relaxed mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.2 }}
          >
            Every feature you need to launch an enterprise-grade SaaS, 
            built with modern architecture and ready for production scale.
          </motion.p>

          {/* Stats */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <StatCard number="50+" label="Production Features" delay={0.1} />
            <StatCard number="2min" label="Setup Time" delay={0.2} />
            <StatCard number="0" label="Per-User Fees" delay={0.3} />
            <StatCard number="∞" label="Scale Potential" delay={0.4} />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
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
              Six Pillars of Enterprise SaaS
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Each pillar represents months of development work, 
              ready to deploy in your stack immediately.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold mb-6">
              Built for Scale & Security
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Production-ready architecture with security best practices, 
              performance optimization, and enterprise compliance built-in.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
              className="text-center p-6"
            >
              <motion.div
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
                className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
              >
                <Database className="h-8 w-8 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold mb-3">Modular Monolith</h3>
              <p className="text-gray-600">
                Next.js + Prisma + PostgreSQL with clean seams. 
                Scale via replicas before splitting.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
              className="text-center p-6"
            >
              <motion.div
                whileHover={{ scale: 1.05, rotate: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
                className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
              >
                <Workflow className="h-8 w-8 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold mb-3">Webhook Everything</h3>
              <p className="text-gray-600">
                All external integrations via webhooks + n8n. 
                Swap providers without code changes.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
              className="text-center p-6"
            >
              <motion.div
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
                className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
              >
                <Cloud className="h-8 w-8 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold mb-3">Deploy Anywhere</h3>
              <p className="text-gray-600">
                Docker + Kubernetes ready. Works great on 
                Coolify, Hetzner, OVH, or any cloud.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-cyan-600">
        <div className="mx-auto max-w-4xl px-4 text-center text-white">
          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Ready to Experience These Features?
          </motion.h2>
          
          <motion.p 
            className="text-xl md:text-2xl mb-12 opacity-90"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Deploy Authless in 2 minutes and see every feature in action.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
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
                  Deploy Now
                </Link>
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl border-2 border-white text-white hover:bg-white/10">
                <Link href="/pricing">
                  <Star className="mr-2 h-5 w-5" />
                  View Pricing
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

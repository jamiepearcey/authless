"use client";

import Link from "next/link";
import { Button, Highlighter } from "@ui/base";
import {
  ArrowRight,
  Github,
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
  DollarSign,
  PoundSterling
} from "lucide-react";
import { HelloWorld } from "../components/TrpcHelloWorld";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";

export default function HomePage() {
  // Highlight triggers: flip true exactly when the last animation for that area finishes
  const [hlHeroTitle, setHlHeroTitle] = useState(false);
  const [hlHeroParagraph, setHlHeroParagraph] = useState(false);
  const [hlProblemSection, setHlProblemSection] = useState(false);
  const [hlFeaturesHeading, setHlFeaturesHeading] = useState(false);
  const [hlSetupHeading, setHlSetupHeading] = useState(false);

  // If you still use this elsewhere, keep it:
  const [relayoutKey, setRelayoutKey] = useState(0);

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden">
        <motion.div
          className="absolute inset-0 -z-10"
          style={{ y, opacity }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,165,0,0.1),transparent_50%)]" />
        </motion.div>

        <div className="mx-auto max-w-7xl px-4 py-20 md:py-32 text-center">
          <motion.div
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 to-cyan-100 px-4 py-2 text-sm font-medium text-indigo-700 mb-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.05 }}
          >
            <motion.div
              animate={{ rotate: [0, 3, -3, 0] }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
                repeatDelay: 2
              }}
            >
              <Star className="h-4 w-4" />
            </motion.div>
            Self-hostable • No per-user fees • Enterprise-grade
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30, delay: 0.1 }}
            onAnimationComplete={() => setHlHeroTitle(true)} // 🔑 gate the "Day One" highlight
          >
            The{" "}
            <motion.span
              className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent"
              initial={{ backgroundPosition: "0% 50%" }}
              animate={{ backgroundPosition: "100% 50%" }}
              onAnimationComplete={() => setRelayoutKey(prev => prev + 1)}
              transition={{
                duration: 8,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
              style={{ backgroundSize: "200% 200%" }}
            >
              SaaS Kernel
            </motion.span>{" "}
            That Ships{" "}
            <Highlighter action="highlight" color="#fde68a" startWhen={hlHeroTitle}>
              Day One
            </Highlighter>
          </motion.h1>

          <motion.p
            className="mx-auto max-w-4xl text-xl md:text-2xl text-gray-600 leading-relaxed mb-12"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
            onAnimationComplete={() => setHlHeroParagraph(true)} // 🔑 gate the paragraph’s highlights
          >
            <strong>Authless</strong> is a{" "}
            <Highlighter action="highlight" color="#ffd1dc" isView startWhen={hlHeroParagraph}>
              self-hostable SaaS foundation
            </Highlighter>{" "}
            that packages{" "}
            <span className="font-semibold text -indigo-600">enterprise auth</span>,{" "}
            <span className="font-semibold text-cyan-600">multi-tenancy</span>,{" "}
            <span className="font-semibold text-purple-600">SSO</span>,{" "}
            <span className="font-semibold text-emerald-600">i18n</span>, and{" "}
            <span className="font-semibold text-orange-600">real-time notifications</span>{" "}
            into a single{" "}
            <Highlighter action="box" color="#a7f3d0" isView startWhen={hlHeroParagraph}>
              <code className="bg-gray-100 px-2 py-1 rounded text-lg">docker compose</code>
            </Highlighter>{" "}
            command.
            <br />
            <span className="text-lg text-gray-500 mt-2 block">
              <Highlighter action="underline" color="#fbbf24" isView startWhen={hlHeroParagraph}>
                Escape per-user pricing traps
              </Highlighter>
              . Start building your product, not plumbing.
            </span>
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 250, damping: 20, delay: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Button asChild size="lg" className="text-lg px-8 py-6 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-300">
                <Link href="/setup">
                  <Rocket className="mr-2 h-5 w-5" />
                  Deploy in 2 Minutes
                </Link>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl border-2 hover:bg-gray-50">
                <Link href="/features">
                  <Star className="mr-2 h-5 w-5" />
                  Explore Features
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Value Metrics */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span>2-minute setup wizard</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              <span>One docker compose command</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>No per-user pricing</span>
            </div>
          </div>

          {/* tRPC demo pill */}
          <div className="mt-8 text-sm text-muted-foreground">
            <HelloWorld />
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <motion.section
        className="bg-gray-50 py-20"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        onAnimationComplete={() => setHlProblemSection(true)} // 🔑 gate both highlights in this section
      >
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Escape The{" "}
              <span className="text-red-600">Per-User Pricing Trap</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stop choosing between expensive hosted auth services that charge per-user
              or spending months building enterprise-grade foundations from scratch.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-red-600 mb-6">Hosted Auth Vendors</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <p className="text-gray-600">$0.05-$0.25 per user per month (scales to $1000s)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <p className="text-gray-600">Vendor lock-in with limited customization</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <p className="text-gray-600">Data lives on their servers, compliance complexity</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <p className="text-gray-600">No multi-tenancy, i18n, or advanced features</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <p className="text-gray-600">Still need to build notifications, support, audit</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-red-800 font-semibold">
                  At 10,000 users:{" "}
                  <Highlighter action="strike-through" color="#ef4444" startWhen={hlProblemSection}>
                    $500-2,500/month forever
                  </Highlighter>
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-green-600 mb-6">The Authless Way</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <p className="text-gray-600">Self-host: predictable $50-200/month infrastructure</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <p className="text-gray-600">Full source code access, complete customization</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <p className="text-gray-600">Your data, your servers, your compliance story</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <p className="text-gray-600">Multi-tenancy, SSO, i18n, and audit built-in</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <p className="text-gray-600">Complete SaaS foundation: auth + notifications + support</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-800 font-semibold">
                  At 10,000 users:{" "}
                  <Highlighter action="circle" color="#22c55e" startWhen={hlProblemSection}>
                    Still $50-200/month
                  </Highlighter>
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Core Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            onAnimationComplete={() => setHlFeaturesHeading(true)} // 🔑 gate the features heading highlight
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              The{" "}
              <Highlighter action="highlight" color="#c7d2fe" isView startWhen={hlFeaturesHeading}>
                Complete SaaS Foundation
              </Highlighter>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to launch an enterprise-grade SaaS: authentication, multi-tenancy,
              i18n, notifications, support, audit, and feature flags in one self-hostable package.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Authentication */}
            <motion.div
              className="group p-8 rounded-2xl border-2 border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all duration-200"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.05 }}
              whileHover={{
                y: -3,
                transition: { type: "spring", stiffness: 400, damping: 25 }
              }}
            >
              <motion.div
                className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-6"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Lock className="h-7 w-7 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold mb-3">Enterprise Authentication</h3>
              <p className="text-gray-600 mb-4">
                Passkeys, TOTP, WhatsApp OTP, Google/GitHub OAuth, tenant SSO (OpenID), and device management.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <motion.span
                  className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  Passkeys
                </motion.span>
                <motion.span
                  className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  Tenant SSO
                </motion.span>
                <motion.span
                  className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  WhatsApp OTP
                </motion.span>
              </div>
            </motion.div>

            {/* Multi-tenancy */}
            <div className="group p-8 rounded-2xl border-2 border-gray-100 hover:border-cyan-200 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Multi-Tenancy + Domains</h3>
              <p className="text-gray-600 mb-4">
                Tenant resolver (subdomain/custom domains), admin console, invites, magic links, and data isolation.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded">Custom Domains</span>
                <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded">Admin Console</span>
                <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded">Magic Links</span>
              </div>
            </div>

            {/* i18n */}
            <div className="group p-8 rounded-2xl border-2 border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-6">
                <Globe className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">LLM-Powered i18n</h3>
              <p className="text-gray-600 mb-4">
                CLI codegen finds strings, generates stable IDs, and LLM fills missing translations with dev approval.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded">Auto-Codegen</span>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded">LLM Fill</span>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded">Stable IDs</span>
              </div>
            </div>

            {/* Notifications */}
            <div className="group p-8 rounded-2xl border-2 border-gray-100 hover:border-orange-200 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Real-Time Notifications</h3>
              <p className="text-gray-600 mb-4">
                Self-hosted real-time engine, in-app tray, email/WhatsApp via webhooks, targeting & preferences.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">Real-time</span>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">Email/SMS</span>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">Targeting</span>
              </div>
            </div>

            {/* Support */}
            <div className="group p-8 rounded-2xl border-2 border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Support + Contact</h3>
              <p className="text-gray-600 mb-4">
                Support forms with routing, email threading via webhooks, SLAs, escalation, and full audit trail.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Email Threading</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">SLA Tracking</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Escalation</span>
              </div>
            </div>

            {/* Feature Flags & Audit */}
            <div className="group p-8 rounded-2xl border-2 border-gray-100 hover:border-gray-300 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center mb-6">
                <Server className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Feature Flags + Audit</h3>
              <p className="text-gray-600 mb-4">
                Global and tenant feature toggles, compliance-ready audit logs, and discussion walls for any resource.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">Feature Flags</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">Audit Logs</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">Discussion</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Setup Demo */}
      <section className="bg-gradient-to-r from-indigo-600 to-cyan-600 py-20">
        <div className="mx-auto max-w-6xl px-4 text-center text-white">
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onAnimationComplete={() => setHlSetupHeading(true)} // 🔑 gate the bracket highlight
          >
            From Zero to SaaS in{" "}
            <Highlighter action="bracket" color="#06b6d4" startWhen={hlSetupHeading}>
              2 Minutes
            </Highlighter>
          </motion.h2>

          <p className="text-xl md:text-2xl mb-12 opacity-90 max-w-4xl mx-auto">
            No complex setup, no hidden dependencies. Just{" "}
            <code className="bg-white/20 px-2 py-1 rounded">docker compose up</code>
            {" "}and a 2-minute wizard to configure your enterprise-grade SaaS foundation.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">1 Command</div>
              <div className="text-lg opacity-80">docker compose up -d</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">2 Minutes</div>
              <div className="text-lg opacity-80">First-run setup wizard</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">∞ Users</div>
              <div className="text-lg opacity-80">No per-user fees ever</div>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-2xl p-8 mb-12 max-w-4xl mx-auto">
            <div className="text-left font-mono text-sm space-y-2">
              <div><span className="text-cyan-300">$</span> <span className="text-white">git clone authless && cd authless</span></div>
              <div><span className="text-cyan-300">$</span> <span className="text-white">docker compose up -d</span></div>
              <div className="text-gray-400"># Visit http://localhost:3000/setup</div>
              <div className="text-green-400">✓ Database configured</div>
              <div className="text-green-400">✓ Admin user created</div>
              <div className="text-green-400">✓ Features selected</div>
              <div className="text-green-400">✓ SaaS ready to customize!</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="text-lg px-8 py-6 rounded-xl bg-white text-indigo-600 hover:bg-gray-50 shadow-lg">
              <Link href="/setup">
                <Rocket className="mr-2 h-5 w-5" />
                Try the Setup Wizard
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl border-2 border-white text-black hover:bg-white/10">
              <Link href="https://github.com/authless-org/authless" target="_blank">
                <Github className="mr-2 h-5 w-5" />
                View on GitHub
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Developer Experience */}
      <section id="demo" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Built By Developers, For Developers
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every line of code is optimized for maintainability, scalability, and developer happiness.
              No bloat, no black boxes, just clean architecture you can understand and extend.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6">Production-Ready From Day One</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="font-semibold">Docker & Kubernetes Ready</p>
                    <p className="text-gray-600">Complete deployment scripts and monitoring setup</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="font-semibold">Security Best Practices</p>
                    <p className="text-gray-600">OWASP compliance, rate limiting, input validation</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="font-semibold">Comprehensive Testing</p>
                    <p className="text-gray-600">Unit, integration, and E2E tests included</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="font-semibold">Performance Optimized</p>
                    <p className="text-gray-600">SSR, caching, database optimization out of the box</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 text-white font-mono text-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="ml-2 text-gray-400">~/your-saas</span>
              </div>
              <div className="space-y-2">
                <div><span className="text-green-400">$</span> git clone authless</div>
                <div><span className="text-green-400">$</span> pnpm install</div>
                <div><span className="text-green-400">$</span> pnpm dev</div>
                <div className="text-gray-400"># Your SaaS is now running!</div>
                <div className="text-cyan-400">✓ Next.js app running on http://localhost:3000</div>
                <div className="text-cyan-400">✓ Database migrations complete</div>
                <div className="text-cyan-400">✓ Auth system configured</div>
                <div className="text-cyan-400">✓ Real-time features enabled</div>
                <div className="text-green-400">Ready to customize for your use case!</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Details */}
      <section id="stack" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Modern Tech Stack</h2>
            <p className="text-xl text-gray-600">The same tools used by unicorn startups and Fortune 500 companies</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <Database className="h-12 w-12 mx-auto mb-4 text-indigo-600" />
              <h3 className="font-semibold mb-2">Next.js 14</h3>
              <p className="text-sm text-gray-600">App Router, SSR, Edge Runtime</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <Code className="h-12 w-12 mx-auto mb-4 text-cyan-600" />
              <h3 className="font-semibold mb-2">tRPC</h3>
              <p className="text-sm text-gray-600">End-to-end type safety</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <Database className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="font-semibold mb-2">Prisma</h3>
              <p className="text-sm text-gray-600">PostgreSQL, SQLite support</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <Shield className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <h3 className="font-semibold mb-2">NextAuth</h3>
              <p className="text-sm text-gray-600">Passkeys, 2FA, SSO</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <Palette className="h-12 w-12 mx-auto mb-4 text-pink-600" />
              <h3 className="font-semibold mb-2">Tailwind CSS</h3>
              <p className="text-sm text-gray-600">shadcn/ui components</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <Zap className="h-12 w-12 mx-auto mb-4 text-orange-600" />
              <h3 className="font-semibold mb-2">Centrifugo</h3>
              <p className="text-sm text-gray-600">Real-time WebSockets</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <Server className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <h3 className="font-semibold mb-2">Docker</h3>
              <p className="text-sm text-gray-600">Container deployment</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <Globe className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <h3 className="font-semibold mb-2">Turborepo</h3>
              <p className="text-sm text-gray-600">Monorepo architecture</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Start Free. Scale Without Limits.
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 mb-12">
            Self-host Authless for free and build your SaaS without per-user pricing traps.
            Join the movement of developers taking back control of their infrastructure.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Button asChild size="lg" className="text-xl px-12 py-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 shadow-xl hover:shadow-2xl transition-all duration-300">
                <Link href="/setup">
                  <Rocket className="mr-3 h-6 w-6" />
                  Deploy Authless Now
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Link>
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Button asChild size="lg" variant="outline" className="text-xl px-12 py-8 rounded-2xl border-2 hover:bg-gray-50">
                <Link href="/pricing">
                  <PoundSterling className="mr-3 h-6 w-6" />
                  View Pricing
                </Link>
              </Button>
            </motion.div>
          </div>

          <div className="text-sm text-gray-500">
            <p>✓ Self-hostable forever • ✓ No vendor lock-in • ✓ Full source code included</p>
          </div>

          <div className="mt-12 p-6 bg-gray-50 rounded-2xl border max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-4">Perfect for:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>B2B SaaS startups</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Enterprise software teams</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Multi-tenant platforms</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Global applications</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
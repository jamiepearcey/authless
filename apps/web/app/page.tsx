import { t } from "@i18n-core";
import Link from "next/link";
import { Button } from "@ui/base";
import { ArrowRight, Github, Shield, Zap, Server, Globe } from "lucide-react";
import { HelloWorld } from "./hello-world";
export default function HomePage() {
  console.log("HomePage where?", typeof window === "undefined" ? "server" : "browser");
  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background to-muted/30" />
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            {t(
              "Clerk\u2011free \xB7 Passkeys \xB7 2FA \xB7 Webhook\u2011first",
              "page.HomePage.clerk_free_passkeys_2fa_webhook_first__2ehzdi",
            )}
          </div>

          <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
            {t("Ship SaaS faster.", "page.HomePage.ship_saas_faster__29qasn")}
            <span className="text-primary">
              {t(
                "Skip the auth tax.",
                "page.HomePage.skip_the_auth_tax__10gjt3",
              )}
            </span>
          </h1>

          <p className="mt-4 text-lg md:text-xl text-muted-foreground">
            {t(
              "A full\u2011stack TypeScript starter with",
              "page.HomePage.a_full_stack_typescript_starter_with__166ah1",
            )}
            <span className="font-medium">Next.js 14</span>,{" "}
            <span className="font-medium">tRPC</span>,{" "}
            <span className="font-medium">Prisma</span>, and{" "}
            <span className="font-medium">NextAuth</span>
            {t(
              ". \n            Production\u2011ready auth (passkeys, TOTP, SMS, Google), rich user profiles, and webhook\u2011driven notifications.",
              "page.HomePage.production_ready_auth_passkeys_totp_sms_google_rich_user_profiles_and_webhook_driven_notifications__1zalz4",
            )}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link
                href="https://github.com/your-org/authless"
                target="_blank"
                rel="noreferrer"
              >
                <Github className="mr-2 h-5 w-5" />
                {t("Star on GitHub", "page.HomePage.star_on_github__96t1qu")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="#getting-started">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* tRPC demo pill */}
          <div className="mt-6 text-sm text-muted-foreground">
           <HelloWorld />
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border">
            <Shield className="h-6 w-6" />
            <h3 className="mt-3 text-lg font-semibold">Full‑featured Auth</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "Passkeys, email/password, TOTP, SMS 2FA, Google login, recovery codes, device/session management \u2014 \u201CClerk without Clerk.\u201D",
                "page.HomePage.passkeys_email_password_totp_sms_2fa_google_login_recovery_codes_device_session_management_clerk_without_clerk__ao38zj",
              )}
            </p>
          </div>
          <div className="p-6 rounded-2xl border">
            <Globe className="h-6 w-6" />
            <h3 className="mt-3 text-lg font-semibold">
              {t(
                "Rich User Profiles",
                "page.HomePage.rich_user_profiles__1z1kpv",
              )}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "Locale, country, currency baked\u2011in. Ready for i18n, pricing, tax, and formatting from day one.",
                "page.HomePage.locale_country_currency_baked_in_ready_for_i18n_pricing_tax_and_formatting_from_day_one__1l6jtt",
              )}
            </p>
          </div>
          <div className="p-6 rounded-2xl border">
            <Zap className="h-6 w-6" />
            <h3 className="mt-3 text-lg font-semibold">Webhook‑first</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "Offload email/SMS via webhooks. n8n JSON workflows included for Mailgun and your SMS provider.",
                "page.HomePage.offload_email_sms_via_webhooks_n8n_json_workflows_included_for_mailgun_and_your_sms_provider__1k3cns",
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Tech + Getting Started */}
      <section id="stack" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Tech Stack</h3>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>
                {t(
                  "\u2022 Next.js 14+ (App Router)",
                  "page.HomePage.next_js_14_app_router__1t61j8",
                )}
              </li>
              <li>
                {t(
                  "\u2022 tRPC (end\u2011to\u2011end types)",
                  "page.HomePage.trpc_end_to_end_types__232plq",
                )}
              </li>
              <li>
                {t(
                  "\u2022 Prisma (SQLite/PostgreSQL)",
                  "page.HomePage.prisma_sqlite_postgresql__2czv7i",
                )}
              </li>
              <li>
                {t(
                  "\u2022 NextAuth.js (passkeys, TOTP, SMS, Google)",
                  "page.HomePage.nextauth_js_passkeys_totp_sms_google__g5libm",
                )}
              </li>
              <li>
                {t(
                  "\u2022 Tailwind CSS + shadcn/ui",
                  "page.HomePage.tailwind_css_shadcn_ui__2877k1",
                )}
              </li>
              <li>
                {t(
                  "\u2022 Turborepo monorepo",
                  "page.HomePage.turborepo_monorepo__2ailai",
                )}
              </li>
            </ul>
          </div>

          <div id="getting-started" className="p-6 rounded-2xl border">
            <h3 className="text-lg font-semibold">Getting Started</h3>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>
                • Copy <code>.env.example</code> → <code>.env</code>
              </li>
              <li>
                • <code>pnpm db:migrate</code>
              </li>
              <li>
                • <code>pnpm dev</code>
              </li>
              <li>
                • {t("Visit account settigs for auth demo", "page.HomePage.for_auth_demo__t2xp4x")}
              </li>
            </ul>
            <div className="mt-4 flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/docs">
                  {t("Read the Docs", "page.HomePage.read_the_docs__po9535")}
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Create Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

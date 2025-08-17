import { t } from "@i18n-core";
export const navigationLinks = [
  {
    href: "/features",
    label: t("Features", "components.links.navigationLinks.features__1itlrq"),
  },
  {
    href: "/tech-stack",
    label: t(
      "Tech Stack",
      "components.links.navigationLinks.tech_stack__1bkoks",
    ),
  },
  {
    href: "/getting-started",
    label: t(
      "Getting Started",
      "components.links.navigationLinks.getting_started__1uousr",
    ),
  },
  {
    href: "/contact",
    label: t("Contact", "components.links.navigationLinks.contact__1itlrq"),
  },
];
export const quickLinks = [
  ...navigationLinks,
  {
    href: "/contact",
    label: t("Contact", "components.links.quickLinks.contact__1itlrq"),
  },
];
export const legalLinks = [
  {
    href: "/terms",
    label: t("Terms of Service", "terms.page.Terms.terms_of_service__22ckfi"),
  },
  {
    href: "/privacy",
    label: t(
      "Privacy Policy",
      "components.links.legalLinks.privacy_policy__1rxb2k",
    ),
  },
  {
    href: "/cookies",
    label: t(
      "Cookie Policy",
      "components.links.legalLinks.cookie_policy__10ird3",
    ),
  },
  {
    href: "/accessibility",
    label: t(
      "Accessibility",
      "components.links.legalLinks.accessibility__wn0cao",
    ),
  },
];

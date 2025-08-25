import { t } from "@i18n-core";
export const navigationLinks = [
  {
    href: "/features",
    label: t("Features", "components.links.navigationLinks.features__1itlrq"),
  },
  {
    href: "/contact",
    label: t("Contact", "components.links.navigationLinks.contact__1itlrq"),
  },
  {
    href: "/admin/tenants",
    label: t("Admin", "components.links.navigationLinks.admin__1ckols"),
    adminOnly: true,
  },
];
export const quickLinks = [
  ...navigationLinks
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

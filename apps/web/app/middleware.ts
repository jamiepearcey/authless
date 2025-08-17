// middleware.ts
import { createI18nMiddleware, defaultMatcher } from "@i18n-core/src/server";
import locales from "../locales.settings.json";

const i18nMiddleware = createI18nMiddleware({
  allowed: locales.locales,
  defaultLocale: locales.defaultLocale,
  cookieDomainStrategy: "apex",  // optional
});

export default i18nMiddleware;

// Optional: restrict which paths it applies to
export const config = {
  matcher: defaultMatcher,
};
import { Locale } from "../server-context";

export type ResolveInput = {
    url: URL;
    headers: Headers;
    cookies: Map<string, string>;
    user?: { locale?: Locale }; // from auth/profile
    allowed: Locale[];
    defaultLocale: Locale;
  };
  
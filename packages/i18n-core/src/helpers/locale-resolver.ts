import { ResolveInput } from "../abstractions";
import { Locale } from "../server-context";

export type ResolveResult = { locale: Locale; source: string };

export interface LocaleResolver {
  name: string;
  resolve: (input: ResolveInput) => Locale | undefined;
}

// Concrete resolvers
export const ProfileResolver: LocaleResolver = {
  name: "profile",
  resolve: (i) => (i.user?.locale && i.allowed.includes(i.user.locale)) ? i.user.locale : undefined
};

export const SubdomainResolver: LocaleResolver = {
  name: "subdomain",
  resolve: (i) => {
    const sub = i.url.hostname.split(".")[0];
    return i.allowed.includes(sub) ? sub : undefined;
  }
};

export const PathResolver: LocaleResolver = {
  name: "path",
  resolve: (i) => {
    const seg = i.url.pathname.split("/").filter(Boolean)[0];
    return i.allowed.includes(seg) ? seg : undefined;
  }
};

export const CookieResolver: LocaleResolver = {
  name: "cookie",
  resolve: (i) => {
    const c = i.cookies.get("locale");
    return c && i.allowed.includes(c) ? c : undefined;
  }
};

export const AcceptLanguageResolver: LocaleResolver = {
  name: "accept-language",
  resolve: (i) => {
    const raw = i.headers.get("accept-language") ?? "";
    const cand = raw.split(",").map(s => s.split(";")[0].trim());
    return cand.find((c) => i.allowed.includes(c)) ?? undefined;
  }
};

// Compose with your precedence:
export function resolveLocale(input: ResolveInput, resolvers: LocaleResolver[]): ResolveResult {
  for (const r of resolvers) {
    const v = r.resolve(input);
    if (v) return { locale: v, source: r.name };
  }
  return { locale: input.defaultLocale, source: "default" };
}
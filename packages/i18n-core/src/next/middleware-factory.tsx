import { t } from "@i18n-core"; // @i18n-core/next/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export type I18nMiddlewareOptions = {
  allowed: string[];
  defaultLocale: string;
  headerName?: string; // default "x-locale"
  cookieName?: string; // default "locale"
  cookieMaxAgeSeconds?: number; // default 1y
  cookieSameSite?: "lax" | "strict" | "none";
  cookieSecure?: boolean;
  cookieDomainStrategy?: "none" | "apex";
  precedence?: Array<"path" | "subdomain" | "cookie" | "accept-language">;
};

const defaultMatcher = ["/((?!_next/static|_next/image|favicon.ico).*)"];
export { defaultMatcher };

function apexDomain(hostname: string): string | undefined {
  const parts = hostname.split(".");
  if (hostname === "localhost" || /\d+\.\d+\.\d+\.\d+/.test(hostname)) return undefined;
  if (parts.length <= 2) return undefined;
  return `${parts.at(-2)}.${parts.at(-1)}`;
}

export function createI18nMiddleware(opts: I18nMiddlewareOptions) {
  const {
    allowed,
    defaultLocale,
    headerName = "x-locale",
    cookieName = "locale",
    cookieMaxAgeSeconds = 60 * 60 * 24 * 365,
    cookieSameSite = "lax",
    cookieSecure = process.env.NODE_ENV === "production",
    cookieDomainStrategy = "none",
    precedence = ["path", "subdomain", "cookie", "accept-language"]
  } = opts;

  return function middleware(req: NextRequest) {
    const res = NextResponse.next();

    let locale: string | undefined;

    for (const p of precedence) {
      if (p === "path") {
        const seg = req.nextUrl.pathname.split("/").filter(Boolean)[0];
        if (allowed.includes(seg)) {locale = seg;break;}
      }
      if (p === "subdomain") {
        const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
        const sub = host.split(".")[0];
        if (allowed.includes(sub)) {locale = sub;break;}
      }
      if (p === "cookie") {
        const c = req.cookies.get(cookieName)?.value;
        if (c && allowed.includes(c)) {locale = c;break;}
      }
      if (p === "accept-language") {
        const al = req.headers.get("accept-language") ?? "";
        const prefs = al.split(",").map((s) => s.split(";")[0].trim());
        const match = prefs.find((x) => allowed.includes(x));
        if (match) {locale = match;break;}
      }
    }

    if (!locale) locale = defaultLocale;

    // annotate this request
    res.headers.set(headerName, locale);

    // persist for future requests
    const cookieOpts: Parameters<typeof res.cookies.set>[2] = {
      path: "/",
      maxAge: cookieMaxAgeSeconds,
      sameSite: cookieSameSite,
      secure: cookieSecure
    };
    if (cookieDomainStrategy === "apex") {
      const domain = apexDomain(req.nextUrl.hostname);
      if (domain) cookieOpts.domain = `.${domain}`;
    }
    res.cookies.set(cookieName, locale, cookieOpts);

    return res;
  };
}
// app/(wherever)/I18nMount.tsx
import "server-only";
import { getActiveLocale, getConfig, buildManifest } from "../server-context";
import { I18nGate } from "./I18nGate";

export const runtime = "nodejs";

export async function I18nMount({
  children
}: {
  children: React.ReactNode;
}) {
  // Active locale for this request (middleware sets x-locale/cookie)
  const activeLocale = getActiveLocale();

  // Build client manifest (urls + hashes)
  const manifest = await buildManifest();

  const { defaultLocale } = getConfig();

  // This is a server component that fetches data and renders a client wrapper
  return (
    <I18nGate
      activeLocale={activeLocale}
      locales={manifest}
      defaultLocale={defaultLocale}
    >
      {children}
    </I18nGate>
  );
}
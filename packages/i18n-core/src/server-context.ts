import "server-only";
import { headers, cookies } from "next/headers";
import fs from "node:fs";
import path from "node:path";
import { tagFor } from "./helpers/file-helper";

export type Dict = Record<string, string>;
export type Locale = string;
export type I18nConfig = {
  defaultLocale: Locale;
  locales: Locale[];
  localesDir: string; // e.g. "public/i18n"
};

/** Process-global config & cache */
const g = globalThis as any;
g.__I18N_CFG__ ??= null as I18nConfig | null;
g.__I18N_CACHE__ ??= new Map<string, Dict>();   // locale -> dict
g.__I18N_HASH__  ??= new Map<string, string>();  // locale -> tag/hash (server-side)

/** Configure once at boot */
export function configureI18n(cfg: I18nConfig) {
  g.__I18N_CFG__ = cfg;
}

export function getConfig(): I18nConfig {
  if (!g.__I18N_CFG__) throw new Error("[i18n] configureI18n() not called");
  return g.__I18N_CFG__ as I18nConfig;
}

/** Decide active locale for *this* request from header/cookie/fallback. */
export function getActiveLocale(): Locale {
  const cfg = getConfig();
  const h = headers();

  // 1) Header set by middleware (preferred)
  const viaHeader = h.get("x-locale");
  if (viaHeader && cfg.locales.includes(viaHeader)) return viaHeader as Locale;

  // 2) Cookie (persisted)
  const viaCookie = cookies().get("locale")?.value;
  if (viaCookie && cfg.locales.includes(viaCookie)) return viaCookie as Locale;

  // 3) Fallback to default
  return cfg.defaultLocale;
}

function dictFile(locale: string): string {
  const { localesDir } = getConfig();
  return path.join(process.cwd(), localesDir, `${locale}.json`);
}

/** Fast, synchronous file tag based on mtime+size (good enough for invalidation). */
function fileTagSync(absPath: string): string {
  try {
    const st = fs.statSync(absPath);
    // Using both size and mtime guards most edits; cheap and stable.
    return `${st.size}:${st.mtimeMs}`;
  } catch {
    // If file missing or unreadable, return a tag that won't match cached one.
    return "0:0";
  }
}

/** Sync-load dict from disk with process-global memoization AND invalidation. */
export function getDict(locale: Locale): Dict {
  const cache: Map<string, Dict> = g.__I18N_CACHE__;
  const tags:  Map<string, string> = g.__I18N_HASH__;

  const file = dictFile(locale);
  const nowTag = fileTagSync(file);
  const lastTag = tags.get(locale);

  // If we have a cached dict and tag matches, serve from cache
  if (cache.has(locale) && lastTag === nowTag) {
    return cache.get(locale)!;
  }

  // Tag changed or not cached → (re)read from disk
  try {
    const json = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(json) as Dict;
    cache.set(locale, parsed);
    tags.set(locale, nowTag);
    return parsed;
  } catch {
    // On error, cache an empty dict to avoid repeated IO thrash
    cache.set(locale, {});
    tags.set(locale, nowTag); // still set tag so we don’t loop on missing files
    return {};
  }
}

/** Default→active merged dict so default fills gaps. (Still sync.) */
export function getMergedDict(active: Locale): Dict {
  const cfg = getConfig();
  const def = getDict(cfg.defaultLocale);
  if (active === cfg.defaultLocale) return def;
  return { ...def, ...getDict(active) };
}

/** Build a client manifest (url + *content* tag) for all locales. */
export async function buildManifest() {
  const { locales, localesDir } = getConfig();
  const webBase = "/" + localesDir.replace(/^public[\\/]/, "").replace(/\\/g, "/");

  const entries = await Promise.all(
    locales.map(async (loc) => {
      const abs = dictFile(loc);
      // Use the stronger async tag (e.g., content hash) for client cache-busting
      const hash = await tagFor(abs);
      return [loc, { locale: loc, url: `${webBase}/${loc}.json`, hash }] as const;
    })
  );

  return Object.fromEntries(entries) as Record<
    string,
    { locale: string; url: string; hash: string }
  >;
}
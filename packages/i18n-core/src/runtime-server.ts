// @i18n-core/runtime-server.ts
import "server-only";
import { getActiveLocale, getMergedDict, getConfig } from "./server-context";

type Vars = Record<string, unknown>;
const TOKEN = /\{([^}]+)\}/g;

export function t(seed: string, id?: string, vars?: Vars): string {
  const active = getActiveLocale();             // header/cookie/default
  const dict = getMergedDict(active);           // default → active merged
  const key = id ?? seed;
  let tpl = dict[key] ?? seed ?? key;

  if (vars) {
    tpl = tpl.replace(TOKEN, (_, expr) => {
      const path = String(expr).trim();
      return path.split(".").reduce<any>(
        (acc, k) => (acc && typeof acc === "object" ? acc[k] : undefined),
        vars
      ) ?? `{${path}}`;
    });
  }
  return tpl;
}

/** Optionally expose for <html lang=...> */
export function currentLangAttr(): string {
  const { defaultLocale } = getConfig();
  try { return getActiveLocale(); } catch { return defaultLocale; }
}
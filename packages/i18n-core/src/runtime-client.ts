// runtime-client.ts
// Client-only i18n runtime with a single global source of truth on window.__I18N__.
// No parallel module state; no "priming" that can overwrite newer values.

import { setLocaleCookie } from "./helpers/cookie-helper";

export type Dict = Record<string, string>;
export type Vars = Record<string, unknown>;

type I18nState = {
  locale: string;
  dict: Dict;
  ver: number;          // monotonically increasing version for reactivity
  updatedAt: number;    // ms, for tie-breaking/debug
};

declare global {
  interface Window {
    __I18N__?: I18nState;
  }
}

const HAS_WINDOW = typeof window !== "undefined";

/** Get the live singleton (creates it lazily on first access in the browser). */
function getState(): I18nState {
  if (!HAS_WINDOW) {
    // SSR-safe shim (isolated per request/module). You can choose to throw instead.
    // This prevents crashes if server imports this file.
    return _serverState;
  }
  if (!window.__I18N__) {
    window.__I18N__ = { locale: "en", dict: {}, ver: 0, updatedAt: Date.now() };
  }
  return window.__I18N__!;
}

// Minimal SSR shim so import won’t explode on the server.
// You won’t *use* it on the server—RSC should pass dict as props.
let _serverState: I18nState = { locale: "en", dict: {}, ver: 0, updatedAt: 0 };

// ---------- Storage helpers (optional URL/hash cache you already use) ----------
const lsGet = (k: string) => {
  if (!HAS_WINDOW) return null;
  try { return localStorage.getItem(k); } catch { return null; }
};
const lsSet = (k: string, v: string) => {
  if (!HAS_WINDOW) return;
  try {
    localStorage.setItem(k, v);
    // Cross-tab nudge; not relied upon for same-tab reactivity.
    window.dispatchEvent(new StorageEvent("storage", { key: k, newValue: v }));
  } catch {}
};

const urlKey = (loc: string) => `i18n:url:${loc}`;
const idxKey = (url: string) => `i18n:idx:${url}`;
const blobKey = (url: string, hash: string) => `i18n:blob:${url}@${hash}`;

/** Resolve URL for a given locale (mapping first, fallback to conventional path). */
function urlForLocale(locale: string): string {
  const mapped = lsGet(urlKey(locale));
  return mapped || `/i18n/${locale}.json`;
}

/** Load a dict for `locale` from localStorage cache (does not mutate state). */
function loadDictFromLocalStorage(locale: string): Dict | null {
  const url = urlForLocale(locale);
  const hash = lsGet(idxKey(url));
  if (!hash) return null;
  const blob = lsGet(blobKey(url, hash));
  if (!blob) return null;
  try {
    return JSON.parse(blob) as Dict;
  } catch {
    return null;
  }
}

// ---------- Public getters ----------
export function getActiveLocale(): string {
  return getState().locale;
}
export function getDict(): Dict {
  return getState().dict;
}
export function getVersion(): number {
  return getState().ver;
}

// ---------- Broadcasting ----------
/** Notify listeners (your React glue can subscribe to this). */
function broadcastUpdate() {
  if (!HAS_WINDOW) return;
  try {
    // CustomEvent for same-tab listeners.
    window.dispatchEvent(new CustomEvent<I18nState>("i18n:update", { detail: getState() }));
    // Optional: cross-tab “ping”.
    lsSet("i18n:lastUpdate", String(getState().updatedAt));
  } catch {}
}

/** Subscribe to i18n updates in the browser. Returns an unsubscribe fn. */
export function subscribeI18n(cb: (s: I18nState) => void): () => void {
  if (!HAS_WINDOW) return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<I18nState>).detail;
    cb(detail || getState());
  };
  window.addEventListener("i18n:update", handler);
  return () => window.removeEventListener("i18n:update", handler);
}

// ---------- Single source of truth mutators ----------
/** Atomically replace locale + dict; bumps version; sets cookie; broadcasts. */
export function setLocaleAndDict(locale: string, dict: Dict) {
  const s = getState();
  s.locale = locale;
  s.dict = dict;
  s.ver += 1;
  s.updatedAt = Date.now();

  // Keep cookie in sync so the next SSR fetch respects it.
  try { setLocaleCookie(locale); } catch {}

  broadcastUpdate();
}

/** Change locale and try to hydrate dict immediately from localStorage cache. */
export function changeLocale(locale: string): boolean {
  const cached = loadDictFromLocalStorage(locale);
  if (cached) {
    setLocaleAndDict(locale, cached);
    return true;
  }
  // No cached dict; still update cookie + bump version so callers can show a
  // “loading” state while they fetch the dict async and then call setLocaleAndDict().
  const s = getState();
  s.locale = locale;
  s.ver += 1;
  s.updatedAt = Date.now();
  try { setLocaleCookie(locale); } catch {}
  broadcastUpdate();
  return false;
}

/** Convenience: set just the dict for the current locale (after async fetch). */
export function setDictForCurrentLocale(dict: Dict) {
  const s = getState();
  setLocaleAndDict(s.locale, dict);
}

// ---------- Optional bootstrapping ----------
/**
 * Ensure we have some dict right now without racing with fresher values.
 * Prefers whatever is already on window.__I18N__ (never overwrites it),
 * otherwise tries LS for the *current* locale (if any).
 */
export function ensureI18nReady(): boolean {
  if (!HAS_WINDOW) return true; // SSR: noop
  if (window.__I18N__ && window.__I18N__!.updatedAt > 0) return true;

  // No window state yet: try to synthesize from localStorage (best effort).
  // You can read an "active locale" you store elsewhere; otherwise keep default.
  const active = lsGet("i18n:active") || getState().locale;
  const cached = loadDictFromLocalStorage(active);
  if (cached) {
    setLocaleAndDict(active, cached);
    return true;
  }
  return false;
}

// ---------- Tiny formatter ----------
const TOKEN = /\{([^}]+)\}/g;

/** Pure translator: reads the live singleton; no local copies, no priming. */
export function t(seed: string, id?: string, vars?: Vars): string {
  const { dict } = getState();
  const key = id ?? seed;
  let tpl = dict[key] ?? seed ?? key;
  if (!vars) return tpl;

  return tpl.replace(TOKEN, (_, raw) => {
    const path = String(raw).trim();
    const val = path.split(".").reduce<any>((acc, k) => (acc && typeof acc === "object" ? acc[k] : undefined), vars);
    return val == null ? `{${path}}` : String(val);
  });
}
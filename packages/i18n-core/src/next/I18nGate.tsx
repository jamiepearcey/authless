"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LocaleDict } from "../abstractions/locale-entry";

import {
  ensureI18nReady,
  setLocaleAndDict,
  changeLocale,
  subscribeI18n,
  getVersion,
} from "../runtime-client";

type GateProps = {
  children: React.ReactNode;
  activeLocale: string;
  locales?: LocaleDict; // { [locale]: { locale, url, hash } }
  fallback?: React.ReactNode;
  refreshGuardKey?: string;
  defaultLocale?: string;
};

export function I18nGate({
  children,
  activeLocale,
  locales = {},
  fallback = null,
  refreshGuardKey,
  defaultLocale,
}: GateProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  // internal “version” to nudge React to re-render (no remount)
  const [, force] = useState(0);
  const refreshedOnce = useRef(false);

  const active = useMemo(() => locales[activeLocale] ?? null, [locales, activeLocale]);
  const others = useMemo(
    () => Object.keys(locales).filter((x) => x !== activeLocale).map((x) => locales[x]),
    [locales, activeLocale]
  );

  // ---- LS helpers (same keys you already use) ----
  const idxKey = (url: string) => `i18n:idx:${url}`;                // -> "<hash>"
  const blobKey = (url: string, hash: string) => `i18n:blob:${url}@${hash}`;
  const urlKey = (loc: string) => `i18n:url:${loc}`;                // -> "<url>"

  const getLS = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
  const setLS = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };
  const delLS = (k: string) => { try { localStorage.removeItem(k); } catch {} };

  // ---- Boot + keep URL mappings/current locale in LS so runtime can resolve paths sync ----
  useEffect(() => {
    if (!active) return;

    try {
      setLS("i18n:active", active.locale);
      if (defaultLocale) setLS("i18n:default", defaultLocale);
      for (const loc of Object.keys(locales)) {
        const e = locales[loc];
        if (e?.url) setLS(urlKey(loc), e.url);
      }
    } catch {}

    ensureI18nReady();
  }, [active?.locale, locales, defaultLocale, active]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const ac = new AbortController();

    async function loadActive() {
      const currentPtr = getLS(idxKey(active.url));
      const wantPtr = active.hash;
      const wantBlobK = blobKey(active.url, wantPtr);

      // 1) Try LS pointer+blob fast path
      let raw = currentPtr === wantPtr ? getLS(wantBlobK) : null;
      if (!raw) {
        // 2) Fetch; use reload/no-store so a fresh hash guarantees new content
        const res = await fetch(active.url, { cache: "reload", signal: ac.signal });
        if (!res.ok) throw new Error(`Failed to fetch ${active.url} (${res.status})`);
        raw = await res.text();
        debugger

        // minimally validate & persist
        try {
          JSON.parse(raw);
          setLS(wantBlobK, raw);
          setLS(idxKey(active.url), wantPtr);
          if (currentPtr && currentPtr !== wantPtr) delLS(blobKey(active.url, currentPtr));
        } catch {
          // bad JSON => don't cache
        }
      }

      if (cancelled) return;

      let parsed: Record<string, string> = {};
      try { parsed = JSON.parse(raw!); } catch {}

      // ⬇️ Publish atomically to the singleton (no direct window mutation)
      setLocaleAndDict(active.locale, parsed);

      // we're good to render client children
      setReady(true);

      // Guarded RSC refresh (once per (url,hash))
      const guard = (refreshGuardKey ?? "i18n:refreshed") + `:${active.url}@${active.hash}`;
      if (!sessionStorage.getItem(guard) && !refreshedOnce.current) {
        sessionStorage.setItem(guard, "1");
        refreshedOnce.current = true;
        router.refresh();
      }

      // 3) Best-effort prefetch of other locales to LS (don’t publish)
      void prefetchOthers(ac.signal);
    }

    async function prefetchOthers(signal: AbortSignal) {
      for (const e of others) {
        const existingPtr = getLS(idxKey(e.url));
        if (existingPtr === e.hash && getLS(blobKey(e.url, e.hash))) continue;
        try {
          const r = await fetch(e.url, { cache: "reload", signal });
          if (!r.ok) continue;
          const raw = await r.text();
          JSON.parse(raw); // sanity
          setLS(blobKey(e.url, e.hash), raw);
          setLS(idxKey(e.url), e.hash);
          setLS(urlKey(e.locale), e.url);
        } catch {
          // ignore
        }
      }
    }

    loadActive().catch(() => setReady(true));

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [active?.url, active?.hash, active?.locale, others, router, refreshGuardKey]);

  // ---- React to runtime updates (version bumps) without remounting ----
  useEffect(() => {
    // Subscribes once; any i18n update (setLocaleAndDict/changeLocale) will re-render this gate.
    const unsub = subscribeI18n(() => {
      // nudge a render; clients using pure `t()` will read the new dict
      force((x) => x + 1);
    });
    return unsub;
  }, []);

  // Optional: if *only* the locale changes externally (no dict yet), reflect it now
  useEffect(() => {
    if (!active) return;
    // This will immediately update cookie + bump version, and if the dict is cached
    // in LS it will publish it right away; otherwise you’ll publish later when fetched.
    changeLocale(active.locale);
  }, [active?.locale]);

  if (!ready) return <>{fallback}</>;
  return <>{children}</>;
}
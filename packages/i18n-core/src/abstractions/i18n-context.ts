import { LocaleEntries } from "./locale-entry";

export type I18nContext = {
    activeLocale: string;
    locales: LocaleEntries;
    defaultLocale: string;
    onMissing?: (id: string, fallback: string) => string;
  };
  
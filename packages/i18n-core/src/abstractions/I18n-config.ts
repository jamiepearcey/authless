export interface I18nConfig {
    /** Locale the strings are originally written in */
    sourceLocale: string;
  
    /** Locale to fall back to when no translation is found */
    defaultLocale: string;
  
    /** All supported locales */
    locales: string[];
  
    /** Directory where locale JSON files are stored */
    localesDir: string;
  
    /** Glob patterns to scan for translatable text */
    sourceGlobs: string[];
  
    /** Glob patterns to exclude from scanning */
    ignoreGlobs: string[];
  }
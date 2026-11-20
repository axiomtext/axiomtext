/** Messages for one locale: message id → text. `{name}` placeholders are interpolated. */
export type Messages = Record<string, string>;

export interface I18n {
  readonly locale: string;
  /** Text direction for the locale. */
  readonly dir: 'ltr' | 'rtl';
  t(id: string, params?: Record<string, string | number>): string;
}

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi', 'dv', 'ug', 'ckb']);

export function isRtlLocale(locale: string): boolean {
  const lang = locale.toLowerCase().split(/[-_]/)[0] ?? '';
  return RTL_LANGUAGES.has(lang);
}

/**
 * Creates a translator. Lookup order: exact locale (e.g. `bn-BD`), base language (`bn`), then `en`.
 * Missing ids return the id itself so gaps are visible during development.
 */
export function createI18n(locale: string, catalogs: Record<string, Messages>): I18n {
  const base = locale.split(/[-_]/)[0] ?? locale;
  const chain = [catalogs[locale], catalogs[base], catalogs['en']].filter(
    (c): c is Messages => c !== undefined,
  );
  return {
    locale,
    dir: isRtlLocale(locale) ? 'rtl' : 'ltr',
    t(id, params) {
      const template = chain.find((c) => id in c)?.[id] ?? id;
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (match, key: string) =>
        key in params ? String(params[key]) : match,
      );
    },
  };
}

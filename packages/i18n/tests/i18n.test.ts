import { describe, expect, it } from 'vitest';
import { createI18n, isRtlLocale } from '../src';

const catalogs = {
  en: { 'toolbar.bold': 'Bold', 'words.count': '{count} words' },
  bn: { 'toolbar.bold': 'বোল্ড' },
  ar: { 'toolbar.bold': 'غامق' },
};

describe('i18n', () => {
  it('falls back from region to language to English', () => {
    const i18n = createI18n('bn-BD', catalogs);
    expect(i18n.t('toolbar.bold')).toBe('বোল্ড');
    expect(i18n.t('words.count', { count: 12 })).toBe('12 words');
    expect(i18n.t('missing.id')).toBe('missing.id');
  });

  it('detects right-to-left locales', () => {
    expect(createI18n('ar', catalogs).dir).toBe('rtl');
    expect(isRtlLocale('ur-PK')).toBe(true);
    expect(isRtlLocale('bn')).toBe(false);
  });
});

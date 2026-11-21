import { describe, expect, it } from 'vitest';
import { convertBijoy, isBijoyFont, looksLikeBijoy } from '../src/bijoy';

describe('Bijoy to Unicode', () => {
  it.each([
    ['Avwg evsjvq Mvb MvB|', 'আমি বাংলায় গান গাই।'],
    ['Avgvi †mvbvi evsjv', 'আমার সোনার বাংলা'],
    ['evsjv‡`k', 'বাংলাদেশ'],
    ['wk¶v', 'শিক্ষা'],
    ['cÖ_g', 'প্রথম'],
    ['Kg©KZ©vi', 'কর্মকর্তার'],
    ['Dfq cv‡k', 'উভয় পাশে'],
    ['†KvbwU', 'কোনটি'],
    ['‡gŠjK', 'মৌলক'],
    ['mvjv‡gi ২০২৬', 'সালামের ২০২৬'],
    ['12:30', '১২:৩০'],
  ])('%s → %s', (bijoy, unicode) => {
    expect(convertBijoy(bijoy)).toBe(unicode);
  });

  it('recognises Bijoy text but leaves English alone', () => {
    expect(looksLikeBijoy('Avgvi †mvbvi evsjv, Avwg †Zvgvq fvjevwm|')).toBe(true);
    expect(looksLikeBijoy('Avwg evsjvq Mvb MvB|')).toBe(true);
    expect(looksLikeBijoy('The quick brown fox jumps over the lazy dog.')).toBe(false);
    expect(looksLikeBijoy('Price: 10 — 20 • ok… © 2026 Ltd.')).toBe(false);
    expect(looksLikeBijoy('আমার সোনার বাংলা')).toBe(false);
    expect(looksLikeBijoy('ev bv')).toBe(true);
  });

  it('recognises Bijoy fonts', () => {
    expect(isBijoyFont('SutonnyMJ')).toBe(true);
    expect(isBijoyFont('"SutonnyMJ", serif')).toBe(true);
    expect(isBijoyFont('SolaimanLipi')).toBe(false);
    expect(isBijoyFont('Noto Sans Bengali')).toBe(false);
    expect(isBijoyFont('Arial')).toBe(false);
  });
});

/**
 * Bijoy (SutonnyMJ and other "MJ" fonts) → Unicode Bangla.
 *
 * Bijoy is a legacy encoding: Bangla written with Latin and Windows-1252 characters that only
 * look like Bangla in a Bijoy font. Old Word files, PDFs and textbooks still use it. This turns
 * it into real Unicode Bangla, which searches, sorts, copies and displays correctly everywhere.
 *
 * The character table and reordering rules are adapted from bijoy2unicode
 * (https://www.npmjs.com/package/bijoy2unicode), MIT License,
 * Copyright (c) 2026 Md. Jehad (Jehadur Rahman Emran), itself building on Mad-FOX/bijoy2unicode
 * and bnwebtools. See THIRD_PARTY_NOTICES.md.
 */

type Rule = readonly [RegExp, string];

const escape = (literal: string): string => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rules = (table: Readonly<Record<string, string>>): Rule[] =>
  Object.entries(table).map(([from, to]) => [new RegExp(escape(from), 'g'), to] as const);
const apply = (text: string, list: readonly Rule[]): string =>
  list.reduce((out, [pattern, to]) => out.replace(pattern, to), text);

/** Tidying of common typing slips before converting. */
const BEFORE = rules({
  '  ': ' ',
  yy: 'y',
  vv: 'v',
  '\xAD\xAD': '\xAD',
  'y&': 'y',
  '„&': '„',
  '‡u': 'u‡',
  wu: 'uw',
  ' ,': ',',
  ' |': '|',
  '\\ ': '',
  ' \\': '',
  '\\': '',
});

/**
 * Bijoy characters → Unicode, in visual (typed) order. Multi-character sequences come first so
 * that their parts aren't converted on their own.
 */
const TABLE = rules({
  // Sequences
  'i\xE6': 'রু',
  'i“': 'রু',
  iƒ: 'রূ',
  'M\xF8': 'গ্ল',
  '”Q\xA6': 'চ্ছ্ব',
  'c\xF8': 'প্ল',
  'e\xF8': 'ব্ল',
  'k\xF8': 'শ্ল',
  '\xA4\xF8': 'ম্ল',
  '\xAF\xF8': 'স্ল',
  '\xE5“': 'ভ্রু',
  '\xAF\xCD\xA1': 'স্ত্ব',
  'š\xCD\xA1': 'ন্ত্ব',
  '\xAF\xCD': 'স্ত',
  'š\xCD': 'ন্ত',
  '\xCB\xA1': 'ত্ত্ব',
  // Vowels (Av before A)
  Av: 'আ',
  A: 'অ',
  B: 'ই',
  C: 'ঈ',
  D: 'উ',
  E: 'ঊ',
  F: 'ঋ',
  G: 'এ',
  H: 'ঐ',
  I: 'ও',
  J: 'ঔ',
  // Consonants
  K: 'ক',
  L: 'খ',
  M: 'গ',
  N: 'ঘ',
  O: 'ঙ',
  P: 'চ',
  Q: 'ছ',
  R: 'জ',
  S: 'ঝ',
  T: 'ঞ',
  U: 'ট',
  V: 'ঠ',
  W: 'ড',
  X: 'ঢ',
  Y: 'ণ',
  Z: 'ত',
  _: 'থ',
  '`': 'দ',
  a: 'ধ',
  b: 'ন',
  c: 'প',
  d: 'ফ',
  e: 'ব',
  f: 'ভ',
  g: 'ম',
  h: 'য',
  i: 'র',
  j: 'ল',
  k: 'শ',
  l: 'ষ',
  m: 'স',
  n: 'হ',
  o: 'ড়', // ড়
  p: 'ঢ়', // ঢ়
  q: 'য়', // য়
  r: 'ৎ',
  s: 'ং',
  t: 'ঃ',
  u: 'ঁ',
  // Digits
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
  // Vowel signs (kar)
  '•': 'ঙ্',
  v: 'া',
  w: 'ি',
  x: 'ী',
  y: 'ু',
  z: 'ু',
  '“': 'ু',
  '–': 'ু',
  '~': 'ূ',
  ƒ: 'ূ',
  '‚': 'ূ',
  '„„': 'ৃ',
  '„': 'ৃ',
  '…': 'ৃ',
  '†': 'ে',
  '‡': 'ে',
  ˆ: 'ৈ',
  '‰': 'ৈ',
  Š: 'ৗ',
  '|': '।',
  '&': '্‌',
  // Conjuncts and joining forms
  '^': '্ব',
  '‘': '্তু',
  '’': '্থ',
  '‹': '্ক',
  Œ: '্ক্র',
  '”': 'চ্',
  '—': '্ত',
  '˜': 'দ্',
  '™': 'দ্',
  š: 'ন্',
  '›': 'ন্',
  œ: '্ন',
  Ÿ: '্ব',
  '\xA1': '্ব',
  '\xA2': '্ভ',
  '\xA3': '্ভ্র',
  '\xA4': 'ম্',
  '\xA5': '্ম',
  '\xA6': '্ব',
  '\xA7': '্ম',
  '\xA8': '্য',
  '\xA9': 'র্',
  '\xAA': '্র',
  '\xAB': '্র',
  '\xAC': '্ল',
  '\xAD': '্ল',
  '\xAE': 'ষ্',
  '\xAF': 'স্',
  '\xB0': 'ক্ক',
  '\xB1': 'ক্ট',
  '\xB2': 'ক্ষ্ণ',
  '\xB3': 'ক্ত',
  '\xB4': 'ক্ম',
  '\xB5': 'ক্র',
  '\xB6': 'ক্ষ',
  '\xB7': 'ক্স',
  '\xB8': 'গু',
  '\xB9': 'জ্ঞ',
  '\xBA': 'গ্দ',
  '\xBB': 'গ্ধ',
  '\xBC': 'ঙ্ক',
  '\xBD': 'ঙ্গ',
  '\xBE': 'জ্জ',
  '\xBF': '্ত্র',
  '\xC0': 'জ্ঝ',
  '\xC1': 'জ্ঞ',
  '\xC2': 'ঞ্চ',
  '\xC3': 'ঞ্ছ',
  '\xC4': 'ঞ্জ',
  '\xC5': 'ঞ্ঝ',
  '\xC6': 'ট্ট',
  '\xC7': 'ড্ড',
  '\xC8': 'ণ্ট',
  '\xC9': 'ণ্ঠ',
  '\xCA': 'ণ্ড',
  '\xCB': 'ত্ত',
  '\xCC': 'ত্থ',
  '\xCD': 'ত্ম',
  '\xCE': 'ত্র',
  '\xCF': 'দ্দ',
  '\xD0': '-',
  '\xD1': '-',
  '\xD2': '"',
  '\xD3': '"',
  '\xD4': "'",
  '\xD5': "'",
  '\xD6': '্র',
  '\xD7': 'দ্ধ',
  '\xD8': 'দ্ব',
  '\xD9': 'দ্ম',
  '\xDA': 'ন্ঠ',
  '\xDB': 'ন্ড',
  '\xDC': 'ন্ধ',
  '\xDD': 'ন্স',
  '\xDE': 'প্ট',
  '\xDF': 'প্ত',
  '\xE0': 'প্প',
  '\xE1': 'প্স',
  '\xE2': 'ব্জ',
  '\xE3': 'ব্দ',
  '\xE4': 'ব্ধ',
  '\xE5': 'ভ্র',
  '\xE6': 'ু',
  '\xE7': 'ম্ফ',
  '\xE8': '্ন',
  '\xE9': 'ল্ক',
  '\xEA': 'ল্গ',
  '\xEB': 'ল্ট',
  '\xEC': 'ল্ড',
  '\xED': 'ল্প',
  '\xEE': 'ল্ফ',
  '\xEF': 'শু',
  '\xF0': 'শ্চ',
  '\xF1': 'শ্ছ',
  '\xF2': 'ষ্ণ',
  '\xF3': 'ষ্ট',
  '\xF4': 'ষ্ঠ',
  '\xF5': 'ষ্ফ',
  '\xF6': 'স্খ',
  '\xF7': 'স্ট',
  '\xF8': 'স্ন',
  '\xF9': 'স্ফ',
  '\xFA': '্প',
  '\xFB': 'হু',
  '\xFC': 'হৃ',
  '\xFD': 'হ্ন',
  '\xFE': 'হ্ম',
  '\xFF': 'ক্ষ',
});

const DOUBLE_HALANT = rules({ '্্': '্' });

const AFTER = rules({
  '০ঃ': '০:',
  '১ঃ': '১:',
  '২ঃ': '২:',
  '৩ঃ': '৩:',
  '৪ঃ': '৪:',
  '৫ঃ': '৫:',
  '৬ঃ': '৬:',
  '৭ঃ': '৭:',
  '৮ঃ': '৮:',
  '৯ঃ': '৯:',
  ' ঃ': ':',
  '\nঃ': '\n:',
  ']ঃ': ']:',
  '[ঃ': '[:',
  অা: 'আ',
  '্‌্‌': '্‌',
});

const HALANT = '্';
const CONSONANTS = 'কখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়ৎংঃঁ';
const isConsonant = (c: string): boolean => c !== '' && CONSONANTS.includes(c);
const isPreKar = (c: string): boolean => c === 'ি' || c === 'ৈ' || c === 'ে';
const isPostKar = (c: string): boolean => 'াোৌৗুূীৃ'.includes(c) && c !== '';
const isKar = (c: string): boolean => isPreKar(c) || isPostKar(c);
const isSpace = (c: string): boolean => c === ' ' || c === '\t' || c === '\n' || c === '\r';
const at = (s: string, i: number): string => (i < 0 || i >= s.length ? '' : s.charAt(i));

/**
 * Bijoy stores some signs in the order they're drawn: a reph (র্) after its cluster and the
 * vowel signs ি ে ৈ before their consonant. Unicode wants the spoken order.
 */
function reorder(input: string): string {
  let s = input;
  // Reph that follows a conjunct: move it before the cluster.
  for (let i = 0; i < s.length; i++) {
    if (
      at(s, i) === 'র' &&
      at(s, i + 1) === HALANT &&
      at(s, i - 1) === HALANT &&
      i < s.length - 1
    ) {
      let j = 1;
      while (i - j >= 0) {
        if (isConsonant(at(s, i - j)) && at(s, i - j - 1) === HALANT) j += 2;
        else if (j === 1 && isKar(at(s, i - j))) j += 1;
        else break;
      }
      s = s.slice(0, i - j) + at(s, i) + at(s, i + 1) + s.slice(i - j, i) + s.slice(i + 2);
    }
  }
  // Reph at the end of a syllable (কর্মকর্তা written Kg©KZ©v).
  for (let i = 1; i < s.length - 1; i++) {
    if (
      at(s, i) === 'র' &&
      at(s, i + 1) === HALANT &&
      isConsonant(at(s, i - 1)) &&
      at(s, i - 2) !== HALANT &&
      !(isConsonant(at(s, i + 2)) && at(s, i + 3) === HALANT)
    ) {
      let j = 1;
      while (i - j - 1 >= 0 && isConsonant(at(s, i - j - 1)) && at(s, i - j) === HALANT) j += 2;
      s = s.slice(0, i - j) + at(s, i) + at(s, i + 1) + s.slice(i - j, i) + s.slice(i + 2);
      i += 1;
    }
  }
  s = apply(s, DOUBLE_HALANT);
  for (let i = 0; i < s.length; i++) {
    if (
      at(s, i) === 'র' &&
      at(s, i + 1) === HALANT &&
      at(s, i - 1) !== HALANT &&
      at(s, i + 2) === HALANT &&
      i < s.length - 1
    ) {
      let j = 1;
      while (i - j >= 0) {
        if (isConsonant(at(s, i - j)) && at(s, i - j - 1) === HALANT) j += 2;
        else if (j === 1 && isKar(at(s, i - j))) j += 1;
        else break;
      }
      s = s.slice(0, i - j) + at(s, i) + at(s, i + 1) + s.slice(i - j, i) + s.slice(i + 2);
      continue;
    }
    // A vowel sign or candrabindu before a halant goes after the joined consonant.
    if (
      i > 0 &&
      at(s, i) === HALANT &&
      (isKar(at(s, i - 1)) || at(s, i - 1) === 'ঁ') &&
      i < s.length - 1
    ) {
      s = s.slice(0, i - 1) + at(s, i) + at(s, i + 1) + at(s, i - 1) + s.slice(i + 2);
    }
    if (
      i > 0 &&
      i < s.length - 1 &&
      at(s, i) === HALANT &&
      at(s, i - 1) === 'র' &&
      at(s, i - 2) !== HALANT &&
      isKar(at(s, i + 1))
    ) {
      s = s.slice(0, i - 1) + at(s, i + 1) + at(s, i - 1) + at(s, i) + s.slice(i + 2);
    }
    // ি ে ৈ typed before their consonant cluster: move them after it (ে + া → ো, ে + ৗ → ৌ).
    if (i < s.length - 1 && isPreKar(at(s, i)) && !isSpace(at(s, i + 1))) {
      let j = 1;
      while (i + j < s.length - 1 && isConsonant(at(s, i + j))) {
        if (at(s, i + j + 1) === HALANT) j += 2;
        else break;
      }
      let out = s.slice(0, i) + s.slice(i + 1, i + j + 1);
      let used = 0;
      if (at(s, i) === 'ে' && at(s, i + j + 1) === 'া') {
        out += 'ো';
        used = 1;
      } else if (at(s, i) === 'ে' && at(s, i + j + 1) === 'ৗ') {
        out += 'ৌ';
        used = 1;
      } else {
        out += at(s, i);
      }
      s = out + s.slice(i + j + used + 1);
      i += j;
    }
    if (i < s.length - 1 && at(s, i) === 'ঁ' && isPostKar(at(s, i + 1))) {
      s = s.slice(0, i) + at(s, i + 1) + at(s, i) + s.slice(i + 2);
    }
  }
  return s;
}

/** Converts Bijoy-encoded text (SutonnyMJ etc.) to Unicode Bangla. */
export function convertBijoy(text: string): string {
  if (!text) return text;
  // NFC: the same form Bangla keyboards type (ড় য় as letter + nukta), so search and
  // comparison treat converted and typed text alike.
  return apply(reorder(apply(apply(text, BEFORE), TABLE)), AFTER).normalize('NFC');
}

/** Whether text has Unicode Bangla in it (then it isn't Bijoy). */
// Built from a string so bundles keep the escapes (raw Bangla in a regular expression breaks on
// pages served without a UTF-8 charset).
const BANGLA = new RegExp('[\\u0980-\\u09FF]');
export const hasBanglaUnicode = (text: string): boolean => BANGLA.test(text);

/** Characters that are common in Bijoy text and rare in English. */
const BIJOY_SIGNS = /[†‡ˆ‰\xAA\xA8\xAFš\xD6„\xB6\xB3\xB5\xCE\xE6\xFF]/g;

/** Very common Bangla words as Bijoy spells them (none of them are English words). */
const COMMON = new Set([
  'Avwg',
  'Avgvi',
  'Avgiv',
  'Avcwb',
  'Zzwg',
  'Ges',
  'A_ev',
  'wKš‘',
  'bv',
  'nq',
  'n‡q',
  'K‡i',
  'Kiv',
  'Ki‡Z',
  'Av‡Q',
  'wQj',
  'ev',
  'Zvi',
  '†_‡K',
  'Rb¨',
  'g‡a¨',
  'c‡i',
  'GKwU',
  'wZwb',
  'Zviv',
  'evsjv',
  'evsjv‡`k',
  'Kx',
  'wK',
  'Lye',
  'Avi',
  'mv‡_',
  'n‡e',
  'K‡i‡Q',
  'nq|',
  'K‡i|',
]);

/**
 * Whether plain text looks like Bijoy-encoded Bangla. Careful on purpose: English text is
 * never converted (it would need Bijoy-only signs or several common Bijoy words).
 */
export function looksLikeBijoy(text: string): boolean {
  if (!text.trim() || hasBanglaUnicode(text)) return false;
  const signs = text.match(BIJOY_SIGNS)?.length ?? 0;
  const words = text.split(/\s+/).filter(Boolean);
  const common = words.filter((w) => COMMON.has(w.replace(/[,.;:!?"'()]+$/, ''))).length;
  // Danda (|) right after a word ends many Bijoy sentences.
  const dandas = words.filter((w) => /[A-Za-z~‡†ˆ‰]\|$/.test(w)).length;
  const score = (signs + common + dandas) * 2;
  return score >= 4 && (signs > 0 || common > 0);
}

/** Bijoy font names in Word, web pages and PDFs (SutonnyMJ, SolaimanLipiMJ, …). */
export const isBijoyFont = (fontFamily: string): boolean =>
  /(^|[\s"',])(\w+MJ|Sutonny|Bijoy|AdarshaLipi|Nikosh ?MJ)\b/i.test(fontFamily) &&
  !/unicode|OMJ/i.test(fontFamily);

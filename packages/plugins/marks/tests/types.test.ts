import { describe, expect, it } from 'vitest';
import { DEFAULT_MARK_TYPES, normalizeMarkTypes } from '../src/data';

describe('mark types', () => {
  it('keeps app-defined ids and labels, e.g. Sheersho’s Bangla types', () => {
    const types = normalizeMarkTypes([
      { id: 'IMPORTANT', label: 'গুরুত্বপূর্ণ', color: '#DC2626', style: 'fill' },
      { id: 'MARKED', label: 'দাগানো', color: '#2563eb', style: 'underline' },
      { id: 'PREVIOUS_YEAR', label: 'পূর্বের বছরের প্রশ্ন', color: '#ca8a04', style: 'box' },
    ]);
    expect(types.map((t) => [t.id, t.label, t.color, t.style])).toEqual([
      ['IMPORTANT', 'গুরুত্বপূর্ণ', '#dc2626', 'fill'],
      ['MARKED', 'দাগানো', '#2563eb', 'underline'],
      ['PREVIOUS_YEAR', 'পূর্বের বছরের প্রশ্ন', '#ca8a04', 'box'],
    ]);
  });

  it('ships three defaults the app can replace', () => {
    expect(normalizeMarkTypes(DEFAULT_MARK_TYPES).map((t) => t.id)).toEqual([
      'important',
      'marked',
      'pyq',
    ]);
  });
});

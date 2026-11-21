import { describe, expect, it } from 'vitest';
import { convertBijoyHTML } from '../src';

describe('pasted HTML', () => {
  it('converts text in a Bijoy font, keeps English, drops the Bijoy font', () => {
    const html =
      '<p><span style="font-family: SutonnyMJ">Avgvi †mvbvi evsjv</span> <span style="font-family: Arial">is a song.</span></p>';
    const out = convertBijoyHTML(html) ?? '';
    expect(out).toContain('আমার সোনার বাংলা');
    expect(out).toContain('is a song.');
    expect(out).not.toMatch(/SutonnyMJ/);
  });

  it('converts plain Bijoy without fonts, but never English', () => {
    expect(convertBijoyHTML('<p>Avwg evsjvq Mvb MvB|</p>')).toContain('আমি বাংলায় গান গাই।');
    expect(convertBijoyHTML('<p>The quick brown fox.</p>')).toBeNull();
    expect(convertBijoyHTML('<p>আমার সোনার বাংলা</p>')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { anchor, describe as describeAnchor, offsetOf, rangeOf, textModel } from '../src/anchor';

/** Fails the test when a value is missing (instead of a non-null assertion). */
function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('missing value');
  return value;
}

describe('anchoring reader highlights', () => {
  const text = 'The cat sat on the mat. The cat was happy.';

  it('describes a selection with context', () => {
    const a = describeAnchor(text, 4, 7);
    expect(a).toEqual({
      exact: 'cat',
      prefix: 'The ',
      suffix: ' sat on the mat. The cat was hap',
      start: 4,
      end: 7,
    });
  });

  it('finds unchanged text at its position', () => {
    expect(anchor(text, describeAnchor(text, 28, 31))).toEqual({ start: 28, end: 31 });
  });

  it('follows the quote when text is inserted before it', () => {
    const a = describeAnchor(text, 28, 31); // the second "cat"
    const changed = `Once upon a time. ${text}`;
    expect(anchor(changed, a)).toEqual({ start: 46, end: 49 });
  });

  it('uses context to pick the right one of repeated words', () => {
    const second = describeAnchor(text, 28, 31);
    // Both "cat"s moved by different amounts; context decides.
    const changed = 'The big cat sat on the mat. Then the cat was happy.';
    const found = must(anchor(changed, second));
    expect(changed.slice(found.start - 4, found.end + 4)).toBe('the cat was');
  });

  it('survives small edits inside the highlight when the context is intact', () => {
    const long =
      'Chapter one begins here. The quick brown fox jumps over the lazy dog. Chapter two follows.';
    const start = long.indexOf('quick brown fox');
    const a = describeAnchor(long, start, start + 'quick brown fox'.length);
    const edited = long.replace('quick brown fox', 'quick red fox');
    const found = must(anchor(edited, a));
    expect(edited.slice(found.start, found.end)).toBe('quick red fox');
  });

  it('gives up when the text is gone', () => {
    expect(anchor('Completely different.', describeAnchor(text, 4, 7))).toBeNull();
  });

  it('maps DOM points and ranges, skipping hidden MathML', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<p>Area is <span class="katex"><span class="katex-mathml">πr2</span><span class="katex-html">πr²</span></span> exactly.</p><p>Next.</p>';
    const model = textModel(root);
    expect(model.text).toBe('Area is πr² exactly.Next.');
    const start = model.text.indexOf('exactly');
    const range = must(rangeOf(model, start, start + 7));
    expect(range.toString()).toBe('exactly');
    expect(offsetOf(model, range.startContainer, range.startOffset)).toBe(start);
    // An element point maps to the next text.
    const second = must(root.querySelectorAll('p')[1]);
    expect(offsetOf(model, second, 0)).toBe(model.text.indexOf('Next'));
  });
});

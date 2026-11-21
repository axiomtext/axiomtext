import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createTestView } from '@axiomtext/test-utils';
import type { TestView } from '@axiomtext/test-utils';
import { loadKatex, MathPlugin, mathmlStringToLatex, splitTextMath, textMathSlice } from '../src';
import { matchCommands } from '../src/autocomplete';

let t: TestView | undefined;
afterEach(() => t?.destroy());
beforeAll(async () => {
  await loadKatex();
});

const kinds = (doc: { forEach(f: (n: { type: { name: string } }) => void): void }): string[] => {
  const out: string[] = [];
  doc.forEach((n) => out.push(n.type.name));
  return out;
};

describe('splitTextMath', () => {
  it('finds all four delimiter styles', () => {
    expect(splitTextMath('a $x^2$ b \\(y\\) c $$z$$ d \\[w\\]')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'math', latex: 'x^2', display: false },
      { type: 'text', text: ' b ' },
      { type: 'math', latex: 'y', display: false },
      { type: 'text', text: ' c ' },
      { type: 'math', latex: 'z', display: true },
      { type: 'text', text: ' d ' },
      { type: 'math', latex: 'w', display: true },
    ]);
  });
  it('leaves prices alone', () => {
    expect(splitTextMath('It costs $5 and $10 today')).toEqual([
      { type: 'text', text: 'It costs $5 and $10 today' },
    ]);
  });
});

describe('MathML → LaTeX', () => {
  it.each([
    ['<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>', '\\frac{a}{b}'],
    ['<math><msqrt><mi>x</mi></msqrt></math>', '\\sqrt{x}'],
    ['<math><msup><mi>x</mi><mn>2</mn></msup></math>', 'x^2'],
    ['<math><mroot><mi>x</mi><mn>3</mn></mroot></math>', '\\sqrt[3]{x}'],
    ['<math><mi>α</mi><mo>≤</mo><mi>π</mi></math>', '\\alpha\\leq\\pi'],
    [
      '<math><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover></math>',
      '\\sum_{i=1}^n',
    ],
    [
      '<math><semantics><mi>x</mi><annotation encoding="application/x-tex">{\\displaystyle x^{2}}</annotation></semantics></math>',
      'x^{2}',
    ],
  ])('%s', (mathml, latex) => {
    expect(mathmlStringToLatex(mathml)?.replace(/\s/g, '')).toBe(latex.replace(/\s/g, ''));
  });
});

describe('pasting math', () => {
  it('turns plain text with $…$ into equations', () => {
    t = createTestView([MathPlugin]);
    const slice = textMathSlice(t.view.state.schema, 'Area $\\pi r^2$ and\n$$E=mc^2$$');
    expect(slice).not.toBeNull();
    if (slice) t.view.dispatch(t.view.state.tr.replaceSelection(slice));
    expect(kinds(t.view.state.doc)).toEqual(['paragraph', 'math_block']);
    expect(t.view.state.doc.firstChild?.child(1).attrs['latex']).toBe('\\pi r^2');
  });

  it('pastes Wikipedia-style MathML as an equation (and drops the fallback image)', () => {
    t = createTestView([MathPlugin]);
    t.view.pasteHTML(
      '<p>Euler: <span class="mwe-math-element"><span class="mwe-math-mathml-inline"><math><semantics><mrow><msup><mi>e</mi><mrow><mi>i</mi><mi>π</mi></mrow></msup></mrow><annotation encoding="application/x-tex">{\\displaystyle e^{i\\pi }}</annotation></semantics></math></span><img class="mwe-math-fallback-image-inline" src="https://wikimedia.org/x.svg" alt="e^{i\\pi}"></span></p>',
    );
    const json = JSON.stringify(t.view.state.doc.toJSON());
    expect(json).toContain('"math_inline"');
    expect(json).toContain('e^{i\\\\pi }');
    expect(json).not.toContain('wikimedia');
  });

  it('pastes KaTeX output (ChatGPT, docs sites) without the visual duplicate', () => {
    t = createTestView([MathPlugin]);
    t.view.pasteHTML(
      '<p>See <span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi>x</mi></mrow><annotation encoding="application/x-tex">x^2</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">x2</span></span> here</p>',
    );
    expect(t.view.state.doc.textContent).toBe('See $x^2$ here');
  });
});

describe('LaTeX autocomplete', () => {
  it('suggests commands by prefix', () => {
    expect(matchCommands('fr')[0]?.[0]).toBe('frac');
    expect(matchCommands('alp').map((c) => c[0])).toContain('alpha');
    expect(matchCommands('Ga')[0]?.[0]).toBe('Gamma');
    expect(matchCommands('')).toEqual([]);
  });
});

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createTestView } from '@axiomtext/test-utils';
import type { TestView } from '@axiomtext/test-utils';
import { insertMath, loadKatex, MathPlugin, renderLatex } from '../src';

let t: TestView | undefined;
afterEach(() => {
  t?.destroy();
  t = undefined;
  document.querySelectorAll('.ax-math-editor').forEach((e) => e.remove());
});
beforeAll(async () => {
  await loadKatex();
});

const corpus = [
  'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
  '\\int_0^1 x^2 \\, dx',
  '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1',
  '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
  '|x| = \\begin{cases} x & x \\geq 0 \\\\ -x & x < 0 \\end{cases}',
  '\\begin{aligned} a &= b + c \\\\ &= d \\end{aligned}',
  '\\forall \\varepsilon > 0 \\; \\exists \\delta > 0',
  '\\mathbb{R}, \\vec{v}, \\hat{n}, \\overbrace{1+2}^{n}',
];

describe('renderLatex', () => {
  it.each(corpus)('renders %s', (latex) => {
    const result = renderLatex(latex, false);
    expect(result.error).toBeNull();
    expect(result.html).toContain('<math'); // MathML for screen readers
  });

  it('reports invalid LaTeX', () => {
    const result = renderLatex('\\frac{1}{', false);
    expect(result.html).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('never renders links or scripts (trust: false)', () => {
    const result = renderLatex('\\href{javascript:alert(1)}{click}', false);
    const html = result.html ?? '';
    expect(html).not.toMatch(/<a[\s>]/); // no anchors (<annotation> is fine)
    expect(html).not.toMatch(/href=/);
    expect(html).not.toMatch(/<script/i);
  });

  it('stops macro bombs', () => {
    const bomb = '\\def\\a{\\a\\a}\\a';
    expect(renderLatex(bomb, false).error).toBeTruthy();
  });
});

describe('math plugin', () => {
  it('"$x^2$" becomes an inline equation', () => {
    t = createTestView([MathPlugin]);
    t.type('Area $\\pi r^2$');
    const node = t.view.state.doc.firstChild?.lastChild;
    expect(node?.type.name).toBe('math_inline');
    expect(node?.attrs['latex']).toBe('\\pi r^2');
    expect(t.view.dom.querySelector('.ax-math .katex')).not.toBeNull();
  });

  it('copies as $latex$ in plain text', () => {
    t = createTestView([MathPlugin]);
    t.type('$a+b$');
    expect(
      t.view.state.doc.textBetween(
        0,
        t.view.state.doc.content.size,
        '',
        (n) => n.type.spec.leafText?.(n) ?? '',
      ),
    ).toBe('$a+b$');
  });

  it('insertMath opens the editor and Enter saves', () => {
    t = createTestView([MathPlugin]);
    insertMath()(t.view.state, t.view.dispatch, t.view);
    const input = document.querySelector<HTMLTextAreaElement>('.ax-math-editor textarea');
    if (!input) throw new Error('editor not open');
    input.value = 'e^{i\\pi} + 1 = 0';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(document.querySelector('.ax-math-editor')).toBeNull();
    let latex = '';
    t.view.state.doc.descendants((n) => {
      if (n.type.name === 'math_inline') latex = n.attrs['latex'] as string;
    });
    expect(latex).toBe('e^{i\\pi} + 1 = 0');
  });

  it('blocks saving invalid LaTeX and Escape removes an empty equation', () => {
    t = createTestView([MathPlugin]);
    insertMath()(t.view.state, t.view.dispatch, t.view);
    const input = document.querySelector<HTMLTextAreaElement>('.ax-math-editor textarea');
    const done = [...document.querySelectorAll<HTMLButtonElement>('.ax-math-editor button')].find(
      (b) => b.textContent === 'Done',
    );
    if (!input || !done) throw new Error('editor not open');
    input.value = '\\frac{1}{';
    input.dispatchEvent(new Event('input'));
    expect(done.disabled).toBe(true);
    expect(document.querySelector('.ax-math-editor__error')?.textContent).not.toBe('');
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    let count = 0;
    t.view.state.doc.descendants((n) => {
      if (n.type.name === 'math_inline') count++;
    });
    expect(count).toBe(0);
  });
});

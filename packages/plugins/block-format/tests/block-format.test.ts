import { afterEach, describe, expect, it } from 'vitest';
import { createTestView } from '@axiomtext/test-utils';
import type { TestView } from '@axiomtext/test-utils';
import { Indent, TextAlignment, indentBlock, outdentBlock, setTextAlign } from '../src';

let t: TestView;
afterEach(() => t.destroy());
const run = (cmd: ReturnType<typeof indentBlock>) => cmd(t.view.state, t.view.dispatch, t.view);

describe('text alignment', () => {
  it('aligns paragraphs and renders text-align', () => {
    t = createTestView([TextAlignment]);
    t.type('hello');
    expect(run(setTextAlign('center'))).toBe(true);
    expect(t.html()).toContain('style="text-align: center;"');
    expect(run(setTextAlign('left'))).toBe(true);
    expect(t.html()).not.toContain('text-align');
  });

  it('rejects unknown alignments', () => {
    t = createTestView([TextAlignment]);
    t.type('x');
    expect(run(setTextAlign('evil' as never))).toBe(false);
  });
});

describe('indent', () => {
  it('indents and outdents within limits', () => {
    t = createTestView([Indent]);
    t.type('hello');
    expect(run(outdentBlock())).toBe(false);
    run(indentBlock());
    run(indentBlock());
    expect(t.html()).toContain('margin-inline-start: 4em;');
    run(outdentBlock());
    run(outdentBlock());
    expect(t.html()).not.toContain('margin-inline-start');
  });

  it('combines with alignment in one style attribute', () => {
    t = createTestView([TextAlignment, Indent]);
    t.type('hello');
    run(setTextAlign('right'));
    run(indentBlock());
    expect(t.html()).toMatch(
      /style="text-align: right; margin-inline-start: 2em;"|style="margin-inline-start: 2em; text-align: right;"/,
    );
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestView } from '@axiomtext/test-utils';
import type { TestView } from '@axiomtext/test-utils';
import { DOMParser as PMDOMParser } from 'prosemirror-model';
import type { Node as PMNode } from 'prosemirror-model';
import { NodeSelection } from 'prosemirror-state';
import {
  Marks,
  Pages,
  insertPage,
  listMarks,
  listPages,
  localizeNumber,
  normalizeMarkTypes,
  removeMark,
  sanitizeMarkData,
  setMark,
  setMarkBadge,
  setMarkData,
  setMarkFilter,
  setPageNumber,
} from '../src';
import type { MarkClickEvent } from '../src';

const TYPES = [
  { id: 'important', label: 'গুরুত্বপূর্ণ', color: '#16a34a', style: 'fill' },
  { id: 'marked', label: 'দাগানো', color: '#2563eb', style: 'underline' },
  { id: 'pyq', label: 'পূর্বের বছরের প্রশ্ন', color: '#b45309', style: 'box' },
] as const;

let t: TestView;
afterEach(() => t?.destroy());

/** The value, or a failed test. */
function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('missing value');
  return value;
}

const run = (cmd: ReturnType<typeof setMark>): boolean =>
  cmd(t.view.state, t.view.dispatch, t.view);
const json = () =>
  ({ version: 1, doc: t.view.state.doc.toJSON() }) as Parameters<typeof listMarks>[0];

function setup(extra: Record<string, unknown> = {}): void {
  t = createTestView([Marks, Pages], { marks: { types: TYPES, ...extra } });
  t.type('Water boils at 100 degrees.');
}

describe('mark types', () => {
  it('cleans the app’s mark types', () => {
    expect(
      normalizeMarkTypes([
        { id: 'a', label: 'A', color: '#ABC' },
        { id: 'a', label: 'dup', color: '#000000' },
        { id: 'bad id!', label: 'x', color: '#000000' },
        { id: 'b', color: 'red', style: 'wavy' },
      ]),
    ).toEqual([
      { id: 'a', label: 'A', color: '#aabbcc', style: 'fill' },
      { id: 'b', label: 'b', color: '#eab308', style: 'fill' },
    ]);
  });

  it('marks the selection with a type, saved as { type, id }', () => {
    setup();
    t.select(7, 12); // "boils"
    expect(run(setMark('important', { id: 'm1' }))).toBe(true);
    const marks = listMarks(json());
    expect(marks).toEqual([
      expect.objectContaining({
        id: 'm1',
        type: 'important',
        text: 'boils',
        data: null,
        page: null,
      }),
    ]);
    expect(marks[0]?.anchor).toEqual({
      exact: 'boils',
      prefix: 'Water ',
      suffix: ' at 100 degrees.',
    });
    const mark = t.view.dom.querySelector('mark.ax-mark');
    expect(mark?.getAttribute('data-mark-type')).toBe('important');
    expect(mark?.getAttribute('data-mark-style')).toBe('fill');
    expect(mark?.getAttribute('style')).toContain('#16a34a');
  });

  it('refuses unknown types and empty selections', () => {
    setup();
    t.select(7, 12);
    expect(run(setMark('nope'))).toBe(false);
    t.select(7);
    expect(run(setMark('important'))).toBe(false);
  });

  it('a new mark replaces the one there; removeMark clears it', () => {
    setup();
    t.select(7, 12);
    run(setMark('important', { id: 'm1' }));
    run(setMark('pyq', { id: 'm2' }));
    expect(listMarks(json()).map((m) => [m.id, m.type])).toEqual([['m2', 'pyq']]);
    t.select(9); // cursor inside
    expect(run(removeMark())).toBe(true);
    expect(listMarks(json())).toEqual([]);
  });

  it('Alt+1/2/3 apply the types in order, Alt+0 removes', () => {
    setup();
    t.select(1, 6);
    expect(t.press('Alt-2')).toBe(true);
    expect(listMarks(json())[0]?.type).toBe('marked');
    t.select(1, 6);
    expect(t.press('Alt-0')).toBe(true);
    expect(listMarks(json())).toEqual([]);
  });

  it('keeps app data and a badge on the mark, through HTML too', () => {
    setup();
    t.select(7, 12);
    run(setMark('important', { id: 'm1' }));
    expect(run(setMarkData('m1', { questionIds: ['q1', 'q2'], note: 'Learn this' }))).toBe(true);
    expect(run(setMarkBadge('m1', 3))).toBe(true);
    expect(listMarks(json())[0]).toMatchObject({
      data: { questionIds: ['q1', 'q2'], note: 'Learn this' },
      badge: '3',
    });
    expect(t.view.dom.querySelector('.ax-mark-badge')?.textContent).toBe('3');

    // Copy & paste: the HTML parses back to the same mark.
    const html = t.view.dom.innerHTML;
    const box = document.createElement('div');
    box.innerHTML = html;
    const parsed = PMDOMParser.fromSchema(t.view.state.schema).parse(box);
    expect(
      listMarks({ version: 1, doc: parsed.toJSON() } as Parameters<typeof listMarks>[0])[0],
    ).toMatchObject({
      id: 'm1',
      type: 'important',
      data: { questionIds: ['q1', 'q2'], note: 'Learn this' },
      badge: '3',
    });
  });

  it('undo brings a removed mark back', async () => {
    const { createEditor } = await import('@axiomtext/view');
    const element = document.createElement('div');
    document.body.append(element);
    const editor = createEditor({
      element,
      plugins: [Marks],
      config: { marks: { types: TYPES } },
      content: {
        version: 1,
        doc: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
        },
      },
    });
    editor.focus('start');
    // Select "Hello" through the DOM selection the engine reads.
    const text = editor.dom.querySelector('p')?.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 5);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
    editor.dom.dispatchEvent(new Event('selectionchange'));
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise((r) => setTimeout(r, 30));
    expect(editor.execute('setMark', 'important', { id: 'm1' })).toBe(true);
    expect(editor.execute('removeMark', 'm1')).toBe(true);
    expect(listMarks(editor.getJSON())).toEqual([]);
    editor.undo();
    expect(listMarks(editor.getJSON())[0]?.id).toBe('m1');
    editor.destroy();
  });

  it('data must be a plain JSON object of reasonable size', () => {
    expect(sanitizeMarkData({ a: 1 })).toEqual({ a: 1 });
    expect(sanitizeMarkData([1])).toBeNull();
    expect(sanitizeMarkData('x')).toBeNull();
    expect(sanitizeMarkData({ big: 'x'.repeat(40_000) })).toBeNull();
  });

  it('tells the app when a reader clicks a mark', () => {
    const onClick = vi.fn<(e: MarkClickEvent) => void>();
    setup({ onClick });
    t.select(7, 12);
    run(setMark('pyq', { id: 'm1', data: { questionIds: ['q9'] } }));
    t.view.setProps({ editable: () => false });
    t.view.dom
      .querySelector('mark.ax-mark')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'm1',
        type: 'pyq',
        text: 'boils',
        data: { questionIds: ['q9'] },
      }),
    );
  });
});

describe('pages', () => {
  it('inserts numbered pages; marks report their page', () => {
    setup();
    t.select(1);
    expect(run(insertPage(23))).toBe(true);
    expect(listPages(json())).toEqual([{ number: 23, index: 0 }]);
    const page = t.view.dom.querySelector('.ax-page');
    expect(page?.getAttribute('data-page')).toBe('23');
    expect(page?.getAttribute('data-label')).toBe('Page 23');
    expect(page?.textContent).toBe(''); // the label isn't text
    // The paragraph moved after the page block: "boils" is now 1 further on.
    t.select(8, 13);
    run(setMark('important', { id: 'm1' }));
    expect(listMarks(json())[0]?.page).toBe(23);
  });

  it('continues numbering and can renumber', () => {
    setup();
    t.select(1);
    run(insertPage(5));
    const end = t.view.state.doc.content.size;
    t.view.dispatch(
      t.view.state.tr.insert(end, need(t.view.state.schema.nodes['paragraph']).create()),
    );
    t.select(t.view.state.doc.content.size - 1);
    run(insertPage());
    expect(listPages(json()).map((p) => p.number)).toEqual([5, 6]);
    const at = need(listPages(json())[1]).index;
    let pos = 0;
    t.view.state.doc.forEach((_n, offset, i) => {
      if (i === at) pos = offset;
    });
    t.view.dispatch(t.view.state.tr.setSelection(NodeSelection.create(t.view.state.doc, pos)));
    expect(run(setPageNumber(7))).toBe(true);
    expect(listPages(json()).map((p) => p.number)).toEqual([5, 7]);
  });

  it('page numbers in the reader’s digits', () => {
    expect(localizeNumber(23, 'bn')).toBe('২৩');
    expect(localizeNumber(1234, 'en')).toBe('1234');
  });
});

describe('reading filter', () => {
  it('folds paragraphs without the chosen marks', () => {
    t = createTestView([Marks, Pages], { marks: { types: TYPES } });
    const schema = t.view.state.schema;
    const para = (text: string, type?: string) =>
      need(schema.nodes['paragraph']).create(
        null,
        schema.text(
          text,
          type ? [need(schema.marks['marker']).create({ type, id: `m-${text}` })] : [],
        ),
      );
    const doc = need(schema.nodes['doc']).create(null, [
      para('One'),
      para('Two', 'important'),
      para('Three'),
      para('Four'),
      para('Five', 'marked'),
    ]) as PMNode;
    t.view.dispatch(t.view.state.tr.replaceWith(0, t.view.state.doc.content.size, doc.content));
    run(setMarkFilter('marked'));
    expect(t.view.dom.querySelectorAll('.ax-folded').length).toBe(3);
    expect([...t.view.dom.querySelectorAll('.ax-fold')].map((b) => b.textContent)).toEqual([
      '… 1 paragraph',
      '… 2 paragraphs',
    ]);
    run(setMarkFilter(['marked']));
    expect(t.view.dom.querySelectorAll('.ax-folded').length).toBe(4);
    expect(t.view.dom.querySelectorAll('.ax-fold').length).toBe(1); // One…Four in one group
    // Expand it.
    (t.view.dom.querySelector('.ax-fold') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(t.view.dom.querySelectorAll('.ax-folded').length).toBe(0);
    run(setMarkFilter('all'));
    expect(t.view.dom.querySelectorAll('.ax-folded').length).toBe(0);
  });
});

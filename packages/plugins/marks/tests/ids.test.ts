import { describe, expect, it } from 'vitest';
import { buildSchema } from '@axiomtext/core';
import { history, redo, undo } from 'prosemirror-history';
import { EditorState, TextSelection } from 'prosemirror-state';
import type { Command, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Marks, Pages, listMarks, setMark, setMarkFilter, setMarkState } from '../src';

const TYPES = [
  { id: 'IMPORTANT', label: 'গুরুত্বপূর্ণ', color: '#dc2626', style: 'fill' },
  { id: 'MARKED', label: 'দাগানো', color: '#2563eb', style: 'underline' },
  { id: 'PREVIOUS_YEAR', label: 'পূর্বের বছরের প্রশ্ন', color: '#ca8a04', style: 'box' },
] as const;

/** A small editor with history: `ed.text` is "Water boils at 100 degrees." in one paragraph. */
function editor(extra: Record<string, unknown> = {}, paragraphs = ['Water boils at 100 degrees.']) {
  const schema = buildSchema([Marks, Pages], { marks: { types: TYPES, ...extra } });
  const doc = schema.node(
    'doc',
    null,
    paragraphs.map((p) => schema.node('paragraph', null, p ? [schema.text(p)] : [])),
  );
  let state = EditorState.create({
    schema,
    doc,
    plugins: [...(Marks.enginePlugins?.(schema) ?? []), history()],
  });
  const place = document.createElement('div');
  document.body.append(place);
  const view = new EditorView(place, {
    state,
    dispatchTransaction(tr: Transaction) {
      state = state.apply(tr);
      view.updateState(state);
    },
  });
  const run = (cmd: Command): boolean => cmd(view.state, view.dispatch, view);
  return {
    view,
    run,
    /** Text positions: 1 is before the first character of the first paragraph. */
    select(from: number, to = from) {
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)));
    },
    marks: () => listMarks({ version: 1, doc: view.state.doc.toJSON() }),
    ids: () => listMarks({ version: 1, doc: view.state.doc.toJSON() }).map((m) => [m.id, m.text]),
    undo: () => run(undo),
    redo: () => run(redo),
    destroy: () => view.destroy(),
  };
}

// "Water boils at 100 degrees."  →  "boils" is 7..12, "100 degrees" is 16..27.

describe('mark ids stay stable and unique', () => {
  it('fixing a typo inside a mark keeps its id', () => {
    const ed = editor();
    ed.select(7, 12);
    ed.run(setMark('IMPORTANT', { id: 'm1', data: { questions: ['q1'] } }));
    ed.view.dispatch(ed.view.state.tr.insertText('X', 9)); // "boXils"
    ed.view.dispatch(ed.view.state.tr.delete(9, 10)); // back to "boils"
    expect(ed.ids()).toEqual([['m1', 'boils']]);
    expect(ed.marks()[0]?.data).toEqual({ questions: ['q1'] });
    ed.destroy();
  });

  it('undo and redo keep the id', () => {
    const ed = editor();
    ed.select(7, 12);
    ed.run(setMark('IMPORTANT', { id: 'm1' }));
    ed.view.dispatch(ed.view.state.tr.insertText('X', 9).setMeta('addToHistory', true));
    ed.undo();
    expect(ed.ids()).toEqual([['m1', 'boils']]);
    ed.redo();
    expect(ed.ids()).toEqual([['m1', 'boXils']]);
    ed.destroy();
  });

  it('a pasted copy gets a new id, without the data; the original keeps its id', () => {
    for (const at of ['after', 'before'] as const) {
      const ed = editor();
      ed.select(7, 12);
      ed.run(setMark('IMPORTANT', { id: 'm1', data: { questions: ['q1'] }, badge: 2 }));
      const copy = ed.view.state.doc.slice(7, 12);
      const pos = at === 'after' ? 28 : 1;
      ed.view.dispatch(ed.view.state.tr.replace(pos, pos, copy).setMeta('uiEvent', 'paste'));
      const marks = ed.marks();
      expect(marks).toHaveLength(2);
      const original = marks.find((m) => m.id === 'm1');
      const pasted = marks.find((m) => m.id !== 'm1');
      expect(original?.data).toEqual({ questions: ['q1'] });
      expect(pasted).toMatchObject({ type: 'IMPORTANT', text: 'boils', data: null, badge: null });
      expect(pasted?.id).toMatch(/^m/);
      ed.destroy();
    }
  });

  it('cut and paste (moving a mark) keeps its id', () => {
    const ed = editor();
    ed.select(7, 12);
    ed.run(setMark('IMPORTANT', { id: 'm1' }));
    const cut = ed.view.state.doc.slice(7, 12);
    ed.view.dispatch(ed.view.state.tr.delete(7, 12));
    ed.view.dispatch(ed.view.state.tr.replace(1, 1, cut));
    expect(ed.ids()).toEqual([['m1', 'boils']]);
    ed.destroy();
  });

  it('splitting a mark: the first half keeps the id, the second gets a new one', () => {
    const ed = editor();
    ed.select(16, 27);
    ed.run(setMark('PREVIOUS_YEAR', { id: 'm1', data: { questions: ['q1'] } }));
    const marker = ed.view.state.schema.marks['marker'];
    if (!marker) throw new Error('no marker');
    ed.view.dispatch(ed.view.state.tr.removeMark(19, 20, marker)); // the space in "100 degrees"
    const [first, second] = ed.marks();
    expect(first).toMatchObject({ id: 'm1', text: '100', data: { questions: ['q1'] } });
    expect(second).toMatchObject({ type: 'PREVIOUS_YEAR', text: 'degrees', data: null });
    expect(second?.id).not.toBe('m1');
    // Undo joins them again under the first id; redo splits with the same new id.
    const newId = second?.id;
    ed.undo();
    expect(ed.ids()).toEqual([['m1', '100 degrees']]);
    ed.redo();
    expect(ed.ids()).toEqual([
      ['m1', '100'],
      [newId, 'degrees'],
    ]);
    ed.destroy();
  });

  it('joining two marks keeps the first id (and its data)', () => {
    const ed = editor();
    ed.select(7, 12);
    ed.run(setMark('IMPORTANT', { id: 'm1', data: { questions: ['q1'] } }));
    ed.select(16, 27);
    ed.run(setMark('MARKED', { id: 'm2' }));
    // Selecting across both and marking keeps the first; a partly covered mark keeps the rest.
    ed.select(7, 27);
    ed.run(setMark('IMPORTANT'));
    expect(ed.marks().map((m) => [m.id, m.type, m.text, m.data])).toEqual([
      ['m1', 'IMPORTANT', 'boils at 100 degrees', { questions: ['q1'] }],
    ]);
    ed.destroy();
  });

  it('changing a whole mark’s type keeps its id and data', () => {
    const ed = editor();
    ed.select(7, 12);
    ed.run(setMark('IMPORTANT', { id: 'm1', data: { questions: ['q1'] } }));
    ed.select(7, 12);
    ed.run(setMark('PREVIOUS_YEAR'));
    expect(ed.marks().map((m) => [m.id, m.type, m.data])).toEqual([
      ['m1', 'PREVIOUS_YEAR', { questions: ['q1'] }],
    ]);
    ed.destroy();
  });

  it('a mark across two paragraphs (Enter inside it) is still one mark', () => {
    const ed = editor();
    ed.select(7, 27);
    ed.run(setMark('MARKED', { id: 'm1' }));
    ed.view.dispatch(ed.view.state.tr.split(13));
    expect(ed.ids()).toEqual([['m1', 'boils at 100 degrees']]);
    ed.destroy();
  });
});

describe('readers’ states on marks', () => {
  it('shows a state with the app’s style and filters by it', () => {
    const ed = editor({ states: { learned: { fade: true, badge: '✓' } } }, [
      'Water boils at 100 degrees.',
      'Nothing here.',
      'Ice melts at 0 degrees.',
    ]);
    ed.select(7, 12);
    ed.run(setMark('IMPORTANT', { id: 'm1', badge: 3 }));
    ed.select(45, 48); // "Ice" in the third paragraph
    ed.run(setMark('IMPORTANT', { id: 'm2' }));
    ed.view.setProps({ editable: () => false });

    ed.run(setMarkState('m1', 'learned'));
    const state = ed.view.dom.querySelector('[data-mark-state="learned"]');
    expect(state?.textContent).toBe('boils');
    expect(state?.classList.contains('ax-mark-faded')).toBe(true);
    expect(state?.closest('mark.ax-mark')?.getAttribute('data-mark-id')).toBe('m1');
    expect([...ed.view.dom.querySelectorAll('.ax-mark-badge')].map((b) => b.textContent)).toEqual([
      '3 ✓',
    ]);

    // "Not learned yet": only the paragraph with m2 stays open.
    ed.run(setMarkFilter({ excludeStates: ['learned'] }));
    const folded = [...ed.view.dom.querySelectorAll('p')].map((p) =>
      p.classList.contains('ax-folded'),
    );
    expect(folded).toEqual([true, true, false]);

    // Clearing the state shows it again; states never change the document.
    const before = ed.view.state.doc;
    ed.run(setMarkState('m1', null));
    expect(ed.view.dom.querySelector('[data-mark-state]')).toBeNull();
    expect(ed.view.state.doc).toBe(before);
    ed.destroy();
  });
});

describe('reading every mark in one call', () => {
  it('editor.getMarks() and getPages() return the documented shape in document order', async () => {
    const { createEditor } = await import('@axiomtext/view');
    const element = document.createElement('div');
    document.body.append(element);
    const marker = (id: string, type: string, data: unknown = null) => ({
      type: 'marker',
      attrs: { id, type, data, badge: null },
    });
    const editor = createEditor({
      element,
      plugins: [Marks, Pages],
      config: { marks: { types: TYPES } },
      content: {
        version: 1,
        doc: {
          type: 'doc',
          content: [
            { type: 'page', attrs: { number: 23 } },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Newton’s ' },
                { type: 'text', text: 'second law', marks: [marker('m1', 'IMPORTANT')] },
              ],
            },
            { type: 'page', attrs: { number: 24 } },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'F = ma',
                  marks: [marker('m2', 'PREVIOUS_YEAR', { questionIds: ['q7'] })],
                },
              ],
            },
          ],
        },
      },
    });
    expect(
      editor.getMarks().map(({ id, type, text, page, data }) => ({ id, type, text, page, data })),
    ).toEqual([
      { id: 'm1', type: 'IMPORTANT', text: 'second law', page: 23, data: null },
      { id: 'm2', type: 'PREVIOUS_YEAR', text: 'F = ma', page: 24, data: { questionIds: ['q7'] } },
    ]);
    expect(editor.getPages()).toEqual([
      { number: 23, index: 0 },
      { number: 24, index: 2 },
    ]);
    editor.destroy();
  });
});

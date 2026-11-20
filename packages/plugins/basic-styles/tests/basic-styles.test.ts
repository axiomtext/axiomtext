import { describe, expect, it } from 'vitest';
import { buildSchema } from '@axiomtext/core';
import { EditorState, TextSelection } from 'prosemirror-state';
import { BasicStyles, toggleBold } from '../src';

describe('basic-styles', () => {
  const schema = buildSchema([BasicStyles]);

  it('registers all marks', () => {
    for (const name of ['bold', 'italic', 'underline', 'strikethrough', 'code']) {
      expect(schema.marks[name]).toBeDefined();
    }
  });

  it('toggles bold on a selection', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('hello')])]);
    let state = EditorState.create({ doc });
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 6)));
    const ok = toggleBold()(state, (tr) => {
      state = state.apply(tr);
    });
    expect(ok).toBe(true);
    const textNode = state.doc.firstChild?.firstChild;
    expect(textNode?.marks.map((m) => m.type.name)).toEqual(['bold']);
  });
});

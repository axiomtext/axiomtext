import { describe, expect, it } from 'vitest';
import { buildSchema } from '@axiomtext/core';
import { EditorState } from 'prosemirror-state';
import { Heading, setHeading, setParagraph } from '../src';

describe('heading', () => {
  const schema = buildSchema([Heading]);
  const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Title')])]);

  it('converts a paragraph to a heading and back', () => {
    let state = EditorState.create({ doc });
    setHeading(2)(state, (tr) => (state = state.apply(tr)));
    expect(state.doc.firstChild?.type.name).toBe('heading');
    expect(state.doc.firstChild?.attrs['level']).toBe(2);

    setParagraph()(state, (tr) => (state = state.apply(tr)));
    expect(state.doc.firstChild?.type.name).toBe('paragraph');
  });
});

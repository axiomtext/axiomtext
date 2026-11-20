import { afterEach, describe, expect, it } from 'vitest';
import { createTestView } from '@axiomtext/test-utils';
import type { TestView } from '@axiomtext/test-utils';
import { Blockquote, toggleBlockquote } from '../src';

let t: TestView;
afterEach(() => t.destroy());

describe('blockquote plugin', () => {
  it('"> " creates a quote, toggle removes it', () => {
    t = createTestView([Blockquote]);
    t.type('> quoted');
    expect(t.view.state.doc.firstChild?.type.name).toBe('blockquote');
    toggleBlockquote()(t.view.state, t.view.dispatch, t.view);
    expect(t.view.state.doc.firstChild?.type.name).toBe('paragraph');
  });

  it('"---" inserts a horizontal line', () => {
    t = createTestView([Blockquote]);
    t.type('---');
    expect(t.view.state.doc.firstChild?.type.name).toBe('horizontal_rule');
    expect(t.html()).toContain('<hr');
  });
});

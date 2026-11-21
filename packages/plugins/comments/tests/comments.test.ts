import { afterEach, describe, expect, it } from 'vitest';
import { createTestView } from '@axiomtext/test-utils';
import type { TestView } from '@axiomtext/test-utils';
import { DOMParser as PMDOMParser } from 'prosemirror-model';
import {
  Comments,
  addComment,
  commentThreadsAt,
  deleteComment,
  deleteCommentThread,
  editComment,
  getCommentThreads,
  listCommentThreads,
  normalizeColor,
  replyToComment,
  resolveComment,
  sanitizeComments,
  selectComment,
  setCommentColor,
  setCommentFill,
} from '../src';

let t: TestView;
afterEach(() => t?.destroy());

const ana = { name: 'Ana', id: 'u1' };
const ben = { name: 'Ben', id: 'u2' };

/** "The quick brown fox" with "quick" commented. */
function withComment(): string {
  t = createTestView([Comments]);
  t.type('The quick brown fox');
  t.select(5, 10);
  expect(
    addComment({ text: 'Too fast?', author: ana, id: 't1', time: 1 })(
      t.view.state,
      t.view.dispatch,
    ),
  ).toBe(true);
  return 't1';
}

describe('comments plugin', () => {
  it('highlights the selection and stores the thread in the document', () => {
    withComment();
    const [thread] = getCommentThreads(t.view.state.doc);
    expect(thread).toMatchObject({
      id: 't1',
      color: 'yellow',
      resolved: false,
      quote: 'quick',
      ranges: [{ from: 5, to: 10 }],
    });
    expect(thread?.comments).toEqual([
      expect.objectContaining({ author: 'Ana', authorId: 'u1', text: 'Too fast?', time: 1 }),
    ]);
    const html = t.html();
    expect(html).toContain('<mark class="ax-comment" data-comment-id="t1" data-color="yellow"');
    expect(html).toContain('Too fast?');
    // Saved JSON keeps the thread.
    const json = t.view.state.doc.toJSON() as {
      content: { content: { marks?: { attrs: { comments: unknown[] } }[] }[] }[];
    };
    expect(json.content[0]?.content[1]?.marks?.[0]?.attrs.comments).toHaveLength(1);
  });

  it('needs selected text and a message', () => {
    t = createTestView([Comments]);
    t.type('Hello');
    expect(addComment({ text: 'x', author: ana })(t.view.state, t.view.dispatch)).toBe(false);
    t.select(1, 3);
    expect(addComment({ text: '   ', author: ana })(t.view.state, t.view.dispatch)).toBe(false);
  });

  it('replies, edits, deletes messages and resolves threads', () => {
    const id = withComment();
    const run = (cmd: (s: typeof t.view.state, d: typeof t.view.dispatch) => boolean) =>
      cmd(t.view.state, t.view.dispatch);
    expect(run(replyToComment(id, 'Fine by me', ben, 2))).toBe(true);
    let thread = getCommentThreads(t.view.state.doc)[0];
    expect(thread?.comments.map((c) => c.author)).toEqual(['Ana', 'Ben']);
    const reply = thread?.comments[1]?.id ?? '';
    expect(run(editComment(id, reply, 'Fine by me!', 3))).toBe(true);
    thread = getCommentThreads(t.view.state.doc)[0];
    expect(thread?.comments[1]).toMatchObject({ text: 'Fine by me!', edited: 3 });
    expect(run(resolveComment(id))).toBe(true);
    expect(getCommentThreads(t.view.state.doc)[0]?.resolved).toBe(true);
    expect(t.html()).toContain('data-resolved="true"');
    // A reply reopens a resolved thread.
    run(replyToComment(id, 'One more thing', ana, 4));
    expect(getCommentThreads(t.view.state.doc)[0]?.resolved).toBe(false);
    expect(run(deleteComment(id, reply))).toBe(true);
    expect(getCommentThreads(t.view.state.doc)[0]?.comments).toHaveLength(2);
    expect(run(setCommentColor(id, 'blue'))).toBe(true);
    expect(getCommentThreads(t.view.state.doc)[0]?.color).toBe('blue');
    // Deleting the first message removes the thread; the text stays.
    const first = getCommentThreads(t.view.state.doc)[0]?.comments[0]?.id ?? '';
    expect(run(deleteComment(id, first))).toBe(true);
    expect(getCommentThreads(t.view.state.doc)).toEqual([]);
    expect(t.view.state.doc.textContent).toBe('The quick brown fox');
  });

  it('overlapping threads coexist and are found at a position', () => {
    withComment();
    t.select(7, 16); // "ick brow"
    addComment({ text: 'Second', author: ben, id: 't2' })(t.view.state, t.view.dispatch);
    expect(getCommentThreads(t.view.state.doc).map((x) => x.id)).toEqual(['t1', 't2']);
    expect(
      commentThreadsAt(t.view.state, 8)
        .map((x) => x.id)
        .sort(),
    ).toEqual(['t1', 't2']);
    expect(commentThreadsAt(t.view.state, 13).map((x) => x.id)).toEqual(['t2']);
    expect(deleteCommentThread('t1')(t.view.state, t.view.dispatch)).toBe(true);
    expect(getCommentThreads(t.view.state.doc).map((x) => x.id)).toEqual(['t2']);
  });

  it('selects a thread', () => {
    withComment();
    t.select(1);
    expect(selectComment('t1')(t.view.state, t.view.dispatch)).toBe(true);
    expect([t.view.state.selection.from, t.view.state.selection.to]).toEqual([5, 10]);
    expect(selectComment('nope')(t.view.state, t.view.dispatch)).toBe(false);
  });

  it('reads its own HTML back and rejects junk', () => {
    withComment();
    const html = t.html();
    const host = document.createElement('div');
    host.innerHTML = html;
    const parsed = PMDOMParser.fromSchema(t.view.state.schema).parse(host);
    expect(getCommentThreads(parsed)[0]).toMatchObject({ id: 't1', quote: 'quick' });

    host.innerHTML =
      '<p><mark data-comment-id="bad id!" data-thread="[]">x</mark><mark data-comment-id="ok" data-thread="nope">y</mark></p>';
    expect(getCommentThreads(PMDOMParser.fromSchema(t.view.state.schema).parse(host))).toEqual([]);
  });

  it('lists threads from saved JSON, without an editor', () => {
    withComment();
    t.select(11, 16);
    addComment({ text: 'Colour?', author: ben, id: 't2', color: 'green' })(
      t.view.state,
      t.view.dispatch,
    );
    const json = { version: 1, doc: t.view.state.doc.toJSON() as never };
    const list = listCommentThreads(json);
    expect(list.map((x) => [x.id, x.quote, x.color])).toEqual([
      ['t1', 'quick', 'yellow'],
      ['t2', 'brown', 'green'],
    ]);
    expect(list[0]?.comments[0]?.text).toBe('Too fast?');
  });

  it('takes any colour, and can underline instead of filling the background', () => {
    t = createTestView([Comments]);
    t.type('Custom colours');
    t.select(1, 7);
    addComment({ text: 'Brand colour', author: ana, id: 'c1', color: '#0EA5E9', fill: false })(
      t.view.state,
      t.view.dispatch,
    );
    let thread = getCommentThreads(t.view.state.doc)[0];
    expect(thread).toMatchObject({ color: '#0ea5e9', fill: false });
    const html = t.html();
    expect(html).toContain('data-color="custom"');
    expect(html).toContain('data-color-value="#0ea5e9"');
    expect(html).toContain('data-fill="false"');
    expect(html).toContain('--ax-hl-line: #0ea5e9');

    // Reads its own HTML back with the same colour and setting.
    const host = document.createElement('div');
    host.innerHTML = html;
    const parsed = PMDOMParser.fromSchema(t.view.state.schema).parse(host);
    expect(getCommentThreads(parsed)[0]).toMatchObject({ color: '#0ea5e9', fill: false });

    expect(setCommentFill('c1', true)(t.view.state, t.view.dispatch)).toBe(true);
    expect(setCommentColor('c1', '#f0a')(t.view.state, t.view.dispatch)).toBe(true);
    thread = getCommentThreads(t.view.state.doc)[0];
    expect(thread).toMatchObject({ color: '#ff00aa', fill: true });
    // Anything that isn't a colour is refused (no CSS injection through the style attribute).
    expect(
      setCommentColor('c1', 'red; background:url(x)' as never)(t.view.state, t.view.dispatch),
    ).toBe(false);
    expect(normalizeColor('javascript:alert(1)')).toBe('yellow');
  });

  it('sanitizes thread data', () => {
    expect(
      sanitizeComments([
        { id: 'a', text: 'ok', author: 'A', time: 5, extra: '<script>' },
        { id: 'b', text: 42 },
        'junk',
        null,
      ]),
    ).toEqual([{ id: 'a', text: 'ok', author: 'A', time: 5 }]);
    expect(sanitizeComments('nope')).toEqual([]);
  });
});

/**
 * Comment threads on text (COL-001…): select text, comment, reply, resolve, delete.
 *
 * Each commented range carries a `comment` mark holding the whole thread, so threads are saved
 * inside the document (JSON and HTML) and travel with it to websites and the Flutter SDK.
 * Several threads may overlap (`excludes: ''`). A thread whose text is deleted disappears with
 * it, and comes back on undo.
 */
import { definePlugin } from '@axiomtext/core';
import type { EditorCommand } from '@axiomtext/core';
import type { Mark, MarkType, Node as PMNode } from 'prosemirror-model';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import type { EditorState, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

import { colorStyle, createId, isColor, isPreset, normalizeColor, sanitizeComments } from './data';
import type { CommentAuthor, CommentColor, CommentEntry, CommentThread } from './data';

export {
  COMMENT_COLORS,
  PRESET_HEX,
  colorStyle,
  createId,
  hexToRgba,
  isColor,
  listCommentThreads,
  normalizeColor,
  sanitizeComments,
} from './data';
export type {
  CommentAuthor,
  CommentColor,
  CommentEntry,
  CommentThread,
  CommentThreadSummary,
  PresetColor,
} from './data';

/** A thread with where it is in the document. */
export interface CommentThreadInfo extends CommentThread {
  /** The commented text. */
  quote: string;
  /** Document positions of the commented ranges, in order. */
  ranges: { from: number; to: number }[];
}

const MAX_TEXT = 10_000;
const MAX_COMMENTS = 500;

const commentType = (state: EditorState): MarkType | undefined => state.schema.marks['comment'];

const threadOf = (mark: Mark): CommentThread => ({
  id: mark.attrs['id'] as string,
  color: normalizeColor(mark.attrs['color']),
  fill: mark.attrs['fill'] !== false,
  resolved: mark.attrs['resolved'] === true,
  comments: mark.attrs['comments'] as CommentEntry[],
});

const markAttrs = (thread: CommentThread): Record<string, unknown> => ({
  id: thread.id,
  color: thread.color,
  fill: thread.fill,
  resolved: thread.resolved,
  comments: thread.comments,
});

/** Every thread in the document, in reading order. */
export function getCommentThreads(doc: PMNode): CommentThreadInfo[] {
  const byId = new Map<string, CommentThreadInfo>();
  doc.descendants((node, pos) => {
    if (!node.isInline) return true;
    for (const mark of node.marks) {
      if (mark.type.name !== 'comment') continue;
      const id = mark.attrs['id'] as string;
      const from = pos;
      const to = pos + node.nodeSize;
      const text = node.isText ? (node.text ?? '') : '';
      const info = byId.get(id);
      if (!info) {
        byId.set(id, { ...threadOf(mark), quote: text, ranges: [{ from, to }] });
        continue;
      }
      const last = info.ranges[info.ranges.length - 1];
      if (last && last.to === from) {
        last.to = to;
        info.quote += text;
      } else {
        info.ranges.push({ from, to });
        info.quote += ` ${text}`;
      }
    }
    return false;
  });
  return [...byId.values()];
}

/** The thread with this id, or null. */
export const getCommentThread = (doc: PMNode, id: string): CommentThreadInfo | null =>
  getCommentThreads(doc).find((t) => t.id === id) ?? null;

/** Threads at a document position (innermost last). */
export function commentThreadsAt(state: EditorState, pos: number): CommentThread[] {
  const $pos = state.doc.resolve(pos);
  const marks = [...($pos.nodeAfter?.marks ?? []), ...($pos.nodeBefore?.marks ?? [])];
  const seen = new Set<string>();
  const out: CommentThread[] = [];
  for (const mark of marks) {
    if (mark.type.name !== 'comment') continue;
    const id = mark.attrs['id'] as string;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(threadOf(mark));
  }
  return out;
}

/** Rewrites (or with null, removes) one thread everywhere it appears. */
function updateThread(
  state: EditorState,
  id: string,
  change: (thread: CommentThread) => CommentThread | null,
): Transaction | null {
  const type = commentType(state);
  if (!type) return null;
  const found: { from: number; to: number; mark: Mark }[] = [];
  state.doc.descendants((node, pos) => {
    if (!node.isInline) return true;
    for (const mark of node.marks) {
      if (mark.type === type && mark.attrs['id'] === id) {
        found.push({ from: pos, to: pos + node.nodeSize, mark });
      }
    }
    return false;
  });
  const first = found[0];
  if (!first) return null;
  const next = change(threadOf(first.mark));
  const tr = state.tr;
  for (const { from, to, mark } of found) {
    tr.removeMark(from, to, mark);
    if (next) tr.addMark(from, to, type.create(markAttrs(next)));
  }
  return tr;
}

export interface AddCommentOptions {
  text: string;
  author: CommentAuthor;
  /** A preset name or any `#rrggbb` colour. Default: yellow. */
  color?: CommentColor;
  /** Colour the background (default), or only underline the text. */
  fill?: boolean;
  /** Use your own id (e.g. from your database); one is made otherwise. */
  id?: string;
  time?: number;
}

/** Starts a thread on the selected text. Returns false without a selection. */
export const addComment =
  (options: AddCommentOptions): EditorCommand =>
  (state, dispatch) => {
    const type = commentType(state);
    const { from, to, empty } = state.selection;
    const text = options.text.trim();
    if (!type || empty || !text) return false;
    if (!dispatch) return true;
    const time = options.time ?? Date.now();
    const thread: CommentThread = {
      id: options.id ?? createId(),
      color: normalizeColor(options.color),
      fill: options.fill !== false,
      resolved: false,
      comments: [
        {
          id: createId(),
          author: options.author.name,
          ...(options.author.id ? { authorId: options.author.id } : {}),
          text: text.slice(0, MAX_TEXT),
          time,
        },
      ],
    };
    dispatch(
      state.tr
        .addMark(from, to, type.create(markAttrs(thread)))
        .setMeta('axCommentAdded', thread.id),
    );
    return true;
  };

/** Adds a reply to a thread. */
export const replyToComment =
  (threadId: string, text: string, author: CommentAuthor, time = Date.now()): EditorCommand =>
  (state, dispatch) => {
    const body = text.trim();
    if (!body) return false;
    const tr = updateThread(state, threadId, (thread) =>
      thread.comments.length >= MAX_COMMENTS
        ? thread
        : {
            ...thread,
            resolved: false,
            comments: [
              ...thread.comments,
              {
                id: createId(),
                author: author.name,
                ...(author.id ? { authorId: author.id } : {}),
                text: body.slice(0, MAX_TEXT),
                time,
              },
            ],
          },
    );
    if (!tr) return false;
    dispatch?.(tr);
    return true;
  };

/** Changes the text of one message. */
export const editComment =
  (threadId: string, commentId: string, text: string, time = Date.now()): EditorCommand =>
  (state, dispatch) => {
    const body = text.trim();
    if (!body) return false;
    let found = false;
    const tr = updateThread(state, threadId, (thread) => ({
      ...thread,
      comments: thread.comments.map((c) => {
        if (c.id !== commentId) return c;
        found = true;
        return { ...c, text: body.slice(0, MAX_TEXT), edited: time };
      }),
    }));
    if (!tr || !found) return false;
    dispatch?.(tr);
    return true;
  };

/** Deletes one message; deleting the first message deletes the whole thread. */
export const deleteComment =
  (threadId: string, commentId: string): EditorCommand =>
  (state, dispatch) => {
    const tr = updateThread(state, threadId, (thread) => {
      if (thread.comments[0]?.id === commentId) return null;
      return { ...thread, comments: thread.comments.filter((c) => c.id !== commentId) };
    });
    if (!tr) return false;
    dispatch?.(tr);
    return true;
  };

/** Removes a thread and its highlight (the text stays). */
export const deleteCommentThread =
  (threadId: string): EditorCommand =>
  (state, dispatch) => {
    const tr = updateThread(state, threadId, () => null);
    if (!tr) return false;
    dispatch?.(tr);
    return true;
  };

/** Resolves (or with false, reopens) a thread. */
export const resolveComment =
  (threadId: string, resolved = true): EditorCommand =>
  (state, dispatch) => {
    const tr = updateThread(state, threadId, (thread) => ({ ...thread, resolved }));
    if (!tr) return false;
    dispatch?.(tr);
    return true;
  };

/** Changes a thread's highlight colour (a preset name or any `#rrggbb`). */
export const setCommentColor =
  (threadId: string, color: CommentColor): EditorCommand =>
  (state, dispatch) => {
    if (!isColor(color) && !/^#[0-9a-f]{3}$/i.test(String(color))) return false;
    const tr = updateThread(state, threadId, (thread) => ({
      ...thread,
      color: normalizeColor(color),
    }));
    if (!tr) return false;
    dispatch?.(tr);
    return true;
  };

/** Colours the background of a thread's text (true) or only underlines it (false). */
export const setCommentFill =
  (threadId: string, fill: boolean): EditorCommand =>
  (state, dispatch) => {
    const tr = updateThread(state, threadId, (thread) => ({ ...thread, fill }));
    if (!tr) return false;
    dispatch?.(tr);
    return true;
  };

/** Selects a thread's text and scrolls to it. */
export const selectComment =
  (threadId: string): EditorCommand =>
  (state, dispatch) => {
    const thread = getCommentThread(state.doc, threadId);
    const range = thread?.ranges[0];
    if (!range) return false;
    dispatch?.(
      state.tr.setSelection(TextSelection.create(state.doc, range.from, range.to)).scrollIntoView(),
    );
    return true;
  };

const activeKey = new PluginKey<readonly string[]>('axCommentActive');

/**
 * Marks threads as active (the one being read): their text gets the `ax-comment-active`
 * class through a decoration, without touching the document. Pass [] to clear.
 */
export const setActiveComments =
  (ids: readonly string[]): EditorCommand =>
  (state, dispatch) => {
    dispatch?.(state.tr.setMeta(activeKey, [...ids]).setMeta('addToHistory', false));
    return true;
  };

/** COL-001…006: comment threads on text, saved in the document. */
export const Comments = definePlugin({
  name: 'comments',
  marks: {
    comment: {
      attrs: {
        id: { validate: 'string' },
        color: { default: 'yellow' },
        fill: { default: true },
        resolved: { default: false },
        comments: { default: [] },
      },
      inclusive: false,
      excludes: '',
      parseDOM: [
        {
          tag: 'mark[data-comment-id]',
          getAttrs: (dom) => {
            const el = dom as HTMLElement;
            const id = el.getAttribute('data-comment-id') ?? '';
            if (!/^[\w-]{1,64}$/.test(id)) return false;
            let comments: CommentEntry[];
            try {
              comments = sanitizeComments(JSON.parse(el.getAttribute('data-thread') ?? '[]'));
            } catch {
              comments = [];
            }
            if (!comments.length) return false;
            const color = normalizeColor(
              el.getAttribute('data-color') === 'custom'
                ? el.getAttribute('data-color-value')
                : el.getAttribute('data-color'),
            );
            return {
              id,
              color,
              fill: el.getAttribute('data-fill') !== 'false',
              resolved: el.getAttribute('data-resolved') === 'true',
              comments,
            };
          },
        },
      ],
      toDOM: (mark) => {
        const color = normalizeColor(mark.attrs['color']);
        const style = colorStyle(color);
        return [
          'mark',
          {
            class: 'ax-comment',
            'data-comment-id': mark.attrs['id'] as string,
            'data-color': isPreset(color) ? color : 'custom',
            ...(style ? { 'data-color-value': color, style } : {}),
            ...(mark.attrs['fill'] === false ? { 'data-fill': 'false' } : {}),
            ...(mark.attrs['resolved'] === true ? { 'data-resolved': 'true' } : {}),
            'data-thread': JSON.stringify(sanitizeComments(mark.attrs['comments'])),
          },
          0,
        ];
      },
    },
  },
  commands: {
    addComment,
    replyToComment,
    editComment,
    deleteComment,
    deleteCommentThread,
    resolveComment,
    setCommentColor,
    setCommentFill,
    selectComment,
    setActiveComments,
  },
  enginePlugins: () => [
    new Plugin<readonly string[]>({
      key: activeKey,
      state: {
        init: () => [],
        apply: (tr, value) => tr.getMeta(activeKey) ?? value,
      },
      props: {
        decorations(state) {
          const ids = activeKey.getState(state) ?? [];
          if (!ids.length) return null;
          const decorations = getCommentThreads(state.doc)
            .filter((thread) => ids.includes(thread.id))
            .flatMap((thread) =>
              thread.ranges.map((r) =>
                Decoration.inline(r.from, r.to, { class: 'ax-comment-active' }),
              ),
            );
          return DecorationSet.create(state.doc, decorations);
        },
      },
    }),
  ],
  messages: {
    en: { 'comments.add': 'Comment' },
  },
});

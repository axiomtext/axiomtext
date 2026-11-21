/**
 * Marked books: named mark types the app defines (Important, Marked, Past exam question…), with
 * app data, a tap event and badges, plus page-number blocks.
 *
 * Marks are saved inside the document as a `marker` mark `{ type, id, data, badge }`, so they
 * survive copy and paste, undo, HTML and the Flutter SDK. The app's mark types (label, colour,
 * style) come from the editor's `config.marks.types`.
 */
import { definePlugin, getPluginConfig } from '@axiomtext/core';
import type { EditorCommand, EngineSchema } from '@axiomtext/core';
import { getLanguage, t } from '@axiomtext/i18n';
import type { Mark, MarkType, Node as PMNode } from 'prosemirror-model';
import { NodeSelection, Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import type { EditorState, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { EditorView } from 'prosemirror-view';

import {
  createMarkId,
  isMarkId,
  localizeNumber,
  markColorStyle,
  normalizeMarkTypes,
  parseMarkData,
  sanitizeBadge,
  sanitizeMarkData,
} from './data';
import type { MarkData, MarkTypeDef } from './data';

export * from './data';

/** What `onClick` receives when a reader clicks or taps a mark. */
export interface MarkClickEvent {
  id: string;
  type: string;
  /** The marked text. */
  text: string;
  data: MarkData | null;
  badge: string | null;
  /** Number of the page block before it, or null. */
  page: number | null;
  /** Where it is on screen, for placing your own popup. */
  rect: { top: number; bottom: number; left: number; right: number };
}

/**
 * Which marks to show while reading: `'all'`, `'marked'` (only paragraphs with a mark), or a list
 * of mark type ids. Paragraphs without a shown mark fold into "… 3 paragraphs".
 */
export type MarkFilter = 'all' | 'marked' | readonly string[];

/** `config.marks` of an editor. */
export interface MarksConfig {
  types?: readonly MarkTypeDef[];
  /** Called when a mark is clicked or tapped while reading (not while editing). */
  onClick?: (event: MarkClickEvent) => void;
  /** Starting filter for reading. Default: `'all'`. */
  filter?: MarkFilter;
}

const configOf = (schema: EngineSchema): MarksConfig =>
  getPluginConfig<MarksConfig>(schema, 'marks') ?? {};

const typesOf = (schema: EngineSchema): Required<MarkTypeDef>[] =>
  normalizeMarkTypes(configOf(schema).types);

const markerType = (state: EditorState): MarkType | undefined => state.schema.marks['marker'];

/** A mark's ranges in the document. */
function rangesOf(doc: PMNode, id: string): { from: number; to: number; mark: Mark }[] {
  const found: { from: number; to: number; mark: Mark }[] = [];
  doc.descendants((node, pos) => {
    if (!node.isInline) return true;
    for (const mark of node.marks) {
      if (mark.type.name === 'marker' && mark.attrs['id'] === id) {
        const last = found[found.length - 1];
        if (last && last.to === pos) last.to = pos + node.nodeSize;
        else found.push({ from: pos, to: pos + node.nodeSize, mark });
      }
    }
    return false;
  });
  return found;
}

/** The page number in force at a position (the last page block before it), or null. */
function pageAt(doc: PMNode, pos: number): number | null {
  let page: number | null = null;
  doc.nodesBetween(0, Math.min(pos, doc.content.size), (node, at) => {
    if (node.type.name === 'page' && at < pos) page = Number(node.attrs['number']);
    return node.isBlock && !node.isTextblock;
  });
  return page;
}

function updateMark(
  state: EditorState,
  id: string,
  change: (attrs: Record<string, unknown>) => Record<string, unknown> | null,
): Transaction | null {
  const type = markerType(state);
  const ranges = rangesOf(state.doc, id);
  const first = ranges[0];
  if (!type || !first) return null;
  const next = change({ ...first.mark.attrs });
  const tr = state.tr;
  for (const { from, to, mark } of ranges) {
    tr.removeMark(from, to, mark);
    if (next) tr.addMark(from, to, type.create(next));
  }
  return tr;
}

export interface SetMarkOptions {
  /** Use your own id; one is made otherwise. */
  id?: string;
  data?: MarkData;
  badge?: string | number;
}

/**
 * Marks the selected text with a mark type (replacing any mark there). Returns false without a
 * selection, or for a type the editor doesn't know.
 */
export const setMark =
  (typeId: string, options: SetMarkOptions = {}): EditorCommand =>
  (state, dispatch) => {
    const type = markerType(state);
    const { from, to, empty } = state.selection;
    const known = typesOf(state.schema);
    if (!type || empty || !isMarkId(typeId)) return false;
    if (known.length && !known.some((k) => k.id === typeId)) return false;
    if (!dispatch) return true;
    const id = isMarkId(options.id) ? options.id : createMarkId();
    dispatch(
      state.tr
        .removeMark(from, to, type)
        .addMark(
          from,
          to,
          type.create({
            type: typeId,
            id,
            data: sanitizeMarkData(options.data),
            badge: sanitizeBadge(options.badge),
          }),
        )
        .setMeta('axMarkAdded', id),
    );
    return true;
  };

/**
 * Removes a mark. With an id: that mark everywhere. Without: marks in the selection, or the
 * whole mark under the cursor.
 */
export const removeMark =
  (id?: string): EditorCommand =>
  (state, dispatch) => {
    const type = markerType(state);
    if (!type) return false;
    if (id !== undefined) {
      const tr = updateMark(state, id, () => null);
      if (!tr) return false;
      dispatch?.(tr);
      return true;
    }
    const { from, to, empty, $from } = state.selection;
    if (empty) {
      const mark = type.isInSet([
        ...($from.nodeAfter?.marks ?? []),
        ...($from.nodeBefore?.marks ?? []),
      ]);
      const markId = mark?.attrs['id'];
      if (typeof markId !== 'string') return false;
      const tr = updateMark(state, markId, () => null);
      if (!tr) return false;
      dispatch?.(tr);
      return true;
    }
    if (!state.doc.rangeHasMark(from, to, type)) return false;
    dispatch?.(state.tr.removeMark(from, to, type));
    return true;
  };

/** Replaces a mark's app data (any JSON object; null clears it). */
export const setMarkData =
  (id: string, data: MarkData | null): EditorCommand =>
  (state, dispatch) => {
    const tr = updateMark(state, id, (attrs) => ({ ...attrs, data: sanitizeMarkData(data) }));
    if (!tr) return false;
    dispatch?.(tr);
    return true;
  };

/** Shows a small badge on a mark, e.g. a question count (null removes it). */
export const setMarkBadge =
  (id: string, badge: string | number | null): EditorCommand =>
  (state, dispatch) => {
    const tr = updateMark(state, id, (attrs) => ({ ...attrs, badge: sanitizeBadge(badge) }));
    if (!tr) return false;
    dispatch?.(tr.setMeta('addToHistory', false));
    return true;
  };

/** Changes a mark's type. */
export const setMarkType =
  (id: string, typeId: string): EditorCommand =>
  (state, dispatch) => {
    if (!isMarkId(typeId)) return false;
    const tr = updateMark(state, id, (attrs) => ({ ...attrs, type: typeId }));
    if (!tr) return false;
    dispatch?.(tr);
    return true;
  };

/** Selects a mark's text and scrolls to it. */
export const selectMark =
  (id: string): EditorCommand =>
  (state, dispatch) => {
    const range = rangesOf(state.doc, id)[0];
    if (!range) return false;
    dispatch?.(
      state.tr.setSelection(TextSelection.create(state.doc, range.from, range.to)).scrollIntoView(),
    );
    return true;
  };

// ── Pages ───────────────────────────────────────────────────────

/** The label of a page block in the interface language ("Page 23", "পৃষ্ঠা ২৩"). */
export const pageLabel = (n: number, locale = getLanguage().locale): string =>
  t('Page {number}', { number: localizeNumber(n, locale) });

/**
 * Inserts a page-number block before the current paragraph. Without a number it continues from
 * the page before (or starts at 1).
 */
export const insertPage =
  (number?: number): EditorCommand =>
  (state, dispatch) => {
    const type = state.schema.nodes['page'];
    if (!type) return false;
    const { $from } = state.selection;
    const before = pageAt(state.doc, $from.pos);
    const n = Number.isFinite(number)
      ? Math.max(0, Math.round(number as number))
      : (before ?? 0) + 1;
    if (!dispatch) return true;
    // Before the top-level block holding the cursor.
    const at = $from.depth > 0 ? $from.before(1) : $from.pos;
    const tr = state.tr.insert(at, type.create({ number: n }));
    dispatch(tr.setSelection(NodeSelection.create(tr.doc, at)).scrollIntoView());
    return true;
  };

/** Changes the number of the selected page block (or the one at `pos`). */
export const setPageNumber =
  (number: number, pos?: number): EditorCommand =>
  (state, dispatch) => {
    const at = pos ?? (state.selection instanceof NodeSelection ? state.selection.from : -1);
    const node = at >= 0 ? state.doc.nodeAt(at) : null;
    if (!node || node.type.name !== 'page' || !Number.isFinite(number)) return false;
    dispatch?.(state.tr.setNodeMarkup(at, undefined, { number: Math.max(0, Math.round(number)) }));
    return true;
  };

/** Scrolls to a page block (the first one with that number). */
export const scrollToPage =
  (number: number): EditorCommand =>
  (state, _dispatch, view) => {
    let found = -1;
    state.doc.descendants((node, pos) => {
      if (found >= 0) return false;
      if (node.type.name === 'page' && Number(node.attrs['number']) === number) found = pos;
      return node.isBlock && !node.isTextblock;
    });
    if (found < 0) return false;
    const dom = view?.nodeDOM(found);
    if (dom instanceof HTMLElement) dom.scrollIntoView({ block: 'start', behavior: 'smooth' });
    return true;
  };

// ── Reading: filters, badges and taps ───────────────────────────

const filterKey = new PluginKey<{ filter: MarkFilter; open: readonly number[] }>('axMarkFilter');

/** Which marks to show while reading; other paragraphs fold away. */
export const setMarkFilter =
  (filter: MarkFilter): EditorCommand =>
  (state, dispatch) => {
    dispatch?.(state.tr.setMeta(filterKey, { filter, open: [] }).setMeta('addToHistory', false));
    return true;
  };

const blockHasShownMark = (node: PMNode, filter: MarkFilter): boolean => {
  if (node.type.name === 'page') return true;
  let found = false;
  node.descendants((child) => {
    if (found) return false;
    for (const mark of child.marks) {
      if (
        mark.type.name === 'marker' &&
        (filter === 'marked' || filter === 'all' || filter.includes(String(mark.attrs['type'])))
      ) {
        found = true;
      }
    }
    return !found;
  });
  return found;
};

function filterDecorations(doc: PMNode, filter: MarkFilter, open: readonly number[]): Decoration[] {
  if (filter === 'all') return [];
  const out: Decoration[] = [];
  let run: { from: number; count: number; positions: { from: number; to: number }[] } | null = null;
  const flush = (): void => {
    if (!run) return;
    const group = run;
    if (open.includes(group.from)) {
      // Just expanded: fade the paragraphs in.
      for (const p of group.positions)
        out.push(Decoration.node(p.from, p.to, { class: 'ax-unfolded' }));
    } else {
      for (const p of group.positions)
        out.push(Decoration.node(p.from, p.to, { class: 'ax-folded' }));
      out.push(
        Decoration.widget(
          group.from,
          () => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'ax-fold';
            button.dataset['fold'] = String(group.from);
            button.contentEditable = 'false';
            button.textContent = t(
              group.count === 1 ? '… {count} paragraph' : '… {count} paragraphs',
              {
                count: localizeNumber(group.count, getLanguage().locale),
              },
            );
            return button;
          },
          { side: -1, key: `fold-${group.from}-${group.count}`, ignoreSelection: true },
        ),
      );
    }
    run = null;
  };
  doc.forEach((node, offset) => {
    if (blockHasShownMark(node, filter)) {
      flush();
      return;
    }
    run ??= { from: offset, count: 0, positions: [] };
    run.count++;
    run.positions.push({ from: offset, to: offset + node.nodeSize });
  });
  flush();
  return out;
}

function badgeDecorations(doc: PMNode, schema: EngineSchema): Decoration[] {
  const types = typesOf(schema);
  const last = new Map<string, { to: number; badge: string; type: string }>();
  doc.descendants((node, pos) => {
    if (!node.isInline) return true;
    for (const mark of node.marks) {
      if (mark.type.name !== 'marker') continue;
      const badge = sanitizeBadge(mark.attrs['badge']);
      if (badge) {
        last.set(String(mark.attrs['id']), {
          to: pos + node.nodeSize,
          badge,
          type: String(mark.attrs['type']),
        });
      }
    }
    return false;
  });
  return [...last.entries()].map(([id, { to, badge, type }]) =>
    Decoration.widget(
      to,
      () => {
        const el = document.createElement('span');
        el.className = 'ax-mark-badge';
        el.dataset['markId'] = id;
        el.setAttribute('aria-hidden', 'true');
        const color = types.find((k) => k.id === type)?.color;
        if (color) el.setAttribute('style', markColorStyle(color));
        el.textContent = badge;
        return el;
      },
      { side: -1, key: `badge-${id}-${badge}-${type}`, ignoreSelection: true, marks: [] },
    ),
  );
}

function clickEvent(view: EditorView, el: HTMLElement): MarkClickEvent | null {
  const id = el.getAttribute('data-mark-id');
  if (!id) return null;
  const ranges = rangesOf(view.state.doc, id);
  const first = ranges[0];
  if (!first) return null;
  const text = ranges.map((r) => view.state.doc.textBetween(r.from, r.to, ' ')).join(' ');
  const rect = el.getBoundingClientRect();
  return {
    id,
    type: String(first.mark.attrs['type']),
    text,
    data: sanitizeMarkData(first.mark.attrs['data']),
    badge: sanitizeBadge(first.mark.attrs['badge']),
    page: pageAt(view.state.doc, first.from),
    rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
  };
}

/** Named mark types with app data, badges and taps (marked books). */
export const Marks = definePlugin({
  name: 'marks',
  marks: {
    marker: {
      attrs: {
        type: { default: '' },
        id: { default: '' },
        data: { default: null },
        badge: { default: null },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: 'mark[data-mark-id]',
          getAttrs: (dom) => {
            const el = dom as HTMLElement;
            const id = el.getAttribute('data-mark-id');
            const type = el.getAttribute('data-mark-type');
            if (!isMarkId(id) || !isMarkId(type)) return false;
            return {
              type,
              id,
              data: parseMarkData(el.getAttribute('data-mark')),
              badge: sanitizeBadge(el.getAttribute('data-badge')),
            };
          },
        },
      ],
      toDOM: (mark) => {
        const typeId = String(mark.attrs['type']);
        const def = typesOf(mark.type.schema).find((k) => k.id === typeId);
        const data = sanitizeMarkData(mark.attrs['data']);
        const badge = sanitizeBadge(mark.attrs['badge']);
        return [
          'mark',
          {
            class: 'ax-mark',
            'data-mark-type': typeId,
            'data-mark-id': String(mark.attrs['id']),
            'data-mark-style': def?.style ?? 'fill',
            ...(def ? { style: markColorStyle(def.color), title: def.label } : {}),
            ...(data ? { 'data-mark': JSON.stringify(data) } : {}),
            ...(badge ? { 'data-badge': badge } : {}),
          },
          0,
        ];
      },
    },
  },
  commands: {
    setMark,
    removeMark,
    setMarkData,
    setMarkBadge,
    setMarkType,
    selectMark,
    setMarkFilter,
  },
  keymap: (schema) => {
    const keys: Record<string, EditorCommand> = { 'Alt-0': removeMark() };
    typesOf(schema)
      .slice(0, 9)
      .forEach((type, i) => {
        keys[`Alt-${i + 1}`] = setMark(type.id);
      });
    return keys;
  },
  enginePlugins: (schema) => [
    new Plugin<{ filter: MarkFilter; open: readonly number[] }>({
      key: filterKey,
      state: {
        init: () => ({ filter: configOf(schema).filter ?? 'all', open: [] }),
        apply: (tr, value) => {
          const next = tr.getMeta(filterKey) as typeof value | undefined;
          if (next) return next;
          if (!tr.docChanged || !value.open.length) return value;
          return { ...value, open: value.open.map((p) => tr.mapping.map(p)) };
        },
      },
      props: {
        decorations(state) {
          const value = filterKey.getState(state);
          const decorations = [
            ...badgeDecorations(state.doc, schema),
            ...(value ? filterDecorations(state.doc, value.filter, value.open) : []),
          ];
          return decorations.length ? DecorationSet.create(state.doc, decorations) : null;
        },
        handleDOMEvents: {
          click(view, event) {
            const target = event.target instanceof Element ? event.target : null;
            const fold = target?.closest<HTMLElement>('.ax-fold');
            if (fold && view.dom.contains(fold)) {
              event.preventDefault();
              const value = filterKey.getState(view.state);
              const from = Number(fold.dataset['fold']);
              if (value && Number.isFinite(from)) {
                view.dispatch(
                  view.state.tr
                    .setMeta(filterKey, { ...value, open: [...value.open, from] })
                    .setMeta('addToHistory', false),
                );
              }
              return true;
            }
            if (view.editable) return false;
            const mark = target?.closest<HTMLElement>('mark.ax-mark');
            const onClick = configOf(schema).onClick;
            if (!mark || !onClick || !view.dom.contains(mark)) return false;
            const info = clickEvent(view, mark);
            if (!info) return false;
            onClick(info);
            return false;
          },
        },
      },
    }),
  ],
  messages: {
    en: { 'marks.mark': 'Mark' },
  },
});

/** Page-number blocks ("Page 23"), for books and chapters. */
export const Pages = definePlugin({
  name: 'pages',
  nodes: {
    page: {
      group: 'block',
      atom: true,
      selectable: true,
      draggable: false,
      attrs: { number: { default: 1 } },
      parseDOM: [
        {
          tag: 'div[data-page]',
          getAttrs: (dom) => {
            const n = Number((dom as HTMLElement).getAttribute('data-page'));
            return Number.isFinite(n) ? { number: Math.max(0, Math.round(n)) } : false;
          },
        },
      ],
      toDOM: (node) => {
        const n = Number(node.attrs['number']);
        const label = pageLabel(n);
        // The label is drawn by CSS from data-label, so it isn't part of the text (copying,
        // search and highlight anchors only see the content).
        return [
          'div',
          {
            class: 'ax-page',
            'data-page': String(n),
            'data-label': label,
            role: 'separator',
            'aria-label': label,
          },
        ];
      },
    },
  },
  commands: { insertPage, setPageNumber, scrollToPage },
});

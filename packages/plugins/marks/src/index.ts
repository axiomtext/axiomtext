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
import {
  AddMarkStep,
  Mapping,
  RemoveMarkStep,
  ReplaceAroundStep,
  ReplaceStep,
} from 'prosemirror-transform';
import type { Step } from 'prosemirror-transform';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { EditorView } from 'prosemirror-view';

import {
  combinedBadge,
  createMarkId,
  isMarkId,
  listMarks,
  listPages,
  localizeNumber,
  markMatches,
  markColorStyle,
  normalizeMarkTypes,
  parseMarkData,
  sanitizeBadge,
  sanitizeMarkData,
} from './data';
import type { MarkData, MarkFilter, MarkStateStyle, MarkTypeDef } from './data';

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

/** `config.marks` of an editor. */
export interface MarksConfig {
  types?: readonly MarkTypeDef[];
  /** Called when a mark is clicked or tapped while reading (not while editing). */
  onClick?: (event: MarkClickEvent) => void;
  /** Starting filter for reading. Default: `'all'`. */
  filter?: MarkFilter;
  /** How reader states look, e.g. `{ learned: { fade: true, badge: '✓' } }`. */
  states?: Record<string, MarkStateStyle>;
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
    // Re-marking or extending a mark keeps it (its id, data and badge); joining marks keeps the
    // first one.
    let existing: Mark | undefined;
    state.doc.nodesBetween(from, to, (node) => {
      existing ??= type.isInSet(node.marks);
      return !existing;
    });
    const reused: unknown = existing?.attrs['id'];
    const id = isMarkId(options.id) ? options.id : isMarkId(reused) ? reused : createMarkId();
    dispatch(
      state.tr
        .removeMark(from, to, type)
        .addMark(
          from,
          to,
          type.create({
            type: typeId,
            id,
            data:
              options.data !== undefined
                ? sanitizeMarkData(options.data)
                : sanitizeMarkData(existing?.attrs['data']),
            badge:
              options.badge !== undefined
                ? sanitizeBadge(options.badge)
                : sanitizeBadge(existing?.attrs['badge']),
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

interface ReadingState {
  filter: MarkFilter;
  /** Folded groups the reader opened. */
  open: readonly number[];
  /** Reader states by mark id, e.g. `learned`. */
  states: ReadonlyMap<string, string>;
}

const filterKey = new PluginKey<ReadingState>('axMarkFilter');

const reading = (state: EditorState): ReadingState =>
  filterKey.getState(state) ?? { filter: 'all', open: [], states: new Map() };

/** Which marks to show while reading; other paragraphs fold away. */
export const setMarkFilter =
  (filter: MarkFilter): EditorCommand =>
  (state, dispatch) => {
    dispatch?.(
      state.tr
        .setMeta(filterKey, { ...reading(state), filter, open: [] })
        .setMeta('addToHistory', false),
    );
    return true;
  };

/**
 * Sets readers' states on marks, e.g. `{ m42: 'learned' }` (null clears one). With `replace`,
 * marks not listed lose their state. States aren't saved in the document: they belong to the
 * reader, so keep them in your app. They're shown with `config.marks.states` styles, a
 * `data-mark-state` attribute for your CSS, and the `states` / `excludeStates` filters.
 */
export const setMarkStates =
  (states: Readonly<Record<string, string | null>>, replace = false): EditorCommand =>
  (state, dispatch) => {
    const value = reading(state);
    const next = new Map(replace ? [] : value.states);
    for (const [id, markState] of Object.entries(states)) {
      if (typeof markState === 'string' && markState) next.set(id, markState.slice(0, 64));
      else next.delete(id);
    }
    dispatch?.(
      state.tr.setMeta(filterKey, { ...value, states: next }).setMeta('addToHistory', false),
    );
    return true;
  };

/** Sets one reader state, e.g. `setMarkState('m42', 'learned')` (null clears it). */
export const setMarkState = (id: string, markState: string | null): EditorCommand =>
  setMarkStates({ [id]: markState });

const blockHasShownMark = (node: PMNode, value: ReadingState): boolean => {
  if (node.type.name === 'page') return true;
  let found = false;
  node.descendants((child) => {
    if (found) return false;
    for (const mark of child.marks) {
      if (
        mark.type.name === 'marker' &&
        markMatches(
          value.filter,
          String(mark.attrs['type']),
          value.states.get(String(mark.attrs['id'])) ?? null,
        )
      ) {
        found = true;
      }
    }
    return !found;
  });
  return found;
};

function filterDecorations(doc: PMNode, value: ReadingState): Decoration[] {
  const { filter, open } = value;
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
    if (blockHasShownMark(node, value)) {
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

/** Reader states: `data-mark-state` on the marked text, faded when its style says so. */
function stateDecorations(
  doc: PMNode,
  value: ReadingState,
  styles: Readonly<Record<string, MarkStateStyle>> | undefined,
): Decoration[] {
  if (!value.states.size) return [];
  const out: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isInline) return true;
    for (const mark of node.marks) {
      if (mark.type.name !== 'marker') continue;
      const markState = value.states.get(String(mark.attrs['id']));
      if (!markState) continue;
      out.push(
        Decoration.inline(pos, pos + node.nodeSize, {
          class: styles?.[markState]?.fade ? 'ax-mark-state ax-mark-faded' : 'ax-mark-state',
          'data-mark-state': markState,
        }),
      );
    }
    return false;
  });
  return out;
}

function badgeDecorations(doc: PMNode, schema: EngineSchema, value: ReadingState): Decoration[] {
  const types = typesOf(schema);
  const styles = configOf(schema).states;
  const last = new Map<string, { to: number; badge: string; type: string }>();
  doc.descendants((node, pos) => {
    if (!node.isInline) return true;
    for (const mark of node.marks) {
      if (mark.type.name !== 'marker') continue;
      const badge = combinedBadge(
        sanitizeBadge(mark.attrs['badge']),
        value.states.get(String(mark.attrs['id'])) ?? null,
        styles,
      );
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

// ── Unique, stable mark ids ─────────────────────────────────────
//
// A mark keeps its id while its text is edited, through undo and redo, and when it's re-marked,
// extended or retyped as a whole. Only one part keeps an id: a pasted copy, or the second half of
// a mark split in two, gets a new id (without the app data and badge, which belong to the
// original). Joining marks with `setMark` keeps the first one's id.

const uniqueKey = new PluginKey<null>('axMarkIds');

type Range = { from: number; to: number };

/** Whether a step can copy, split or join marks. */
function touchesMarks(step: Step, marker: MarkType): boolean {
  if (step instanceof AddMarkStep || step instanceof RemoveMarkStep)
    return step.mark.type === marker;
  if (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) {
    let found = false;
    step.slice.content.descendants((node) => {
      found ||= !!marker.isInSet(node.marks);
      return !found;
    });
    return found;
  }
  return false;
}

/** Ranges of the final document that these transactions inserted. */
function insertedRanges(trs: readonly Transaction[]): Range[] {
  const maps = trs.flatMap((tr) => tr.mapping.maps);
  const out: Range[] = [];
  maps.forEach((map, i) => {
    const rest = new Mapping(maps.slice(i + 1));
    map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
      if (newEnd <= newStart) return;
      const from = rest.map(newStart, 1);
      const to = rest.map(newEnd, -1);
      if (to > from) out.push({ from, to });
    });
  });
  return out;
}

interface Segment {
  type: string;
  /** Text offset where it ends (text and inline nodes counted, block boundaries not). */
  end: number;
  pieces: (Range & { mark: Mark })[];
  /** Has text that was there before these transactions. */
  old: boolean;
}

/**
 * Pieces of the document that must get a new id: every part of an id except one (the first part
 * that existed before, else the first part). A part is a run of text with the same id and type
 * and nothing else in between.
 */
export function duplicateMarkParts(
  doc: PMNode,
  marker: MarkType,
  inserted: readonly Range[] = [],
): Segment[] {
  const byId = new Map<string, Segment[]>();
  let offset = 0;
  doc.descendants((node, pos) => {
    if (!node.isInline) return true;
    const start = offset;
    offset += node.isText ? node.nodeSize : 1;
    const mark = marker.isInSet(node.marks);
    if (!mark) return false;
    const id = String(mark.attrs['id']);
    const type = String(mark.attrs['type']);
    const piece = { from: pos, to: pos + node.nodeSize, mark };
    const old = !inserted.some((r) => r.from <= piece.from && r.to >= piece.to);
    let list = byId.get(id);
    if (!list) byId.set(id, (list = []));
    const last = list[list.length - 1];
    if (last && last.end === start && last.type === type) {
      last.pieces.push(piece);
      last.end = offset;
      last.old ||= old;
    } else {
      list.push({ type, end: offset, pieces: [piece], old });
    }
    return false;
  });
  const out: Segment[] = [];
  for (const list of byId.values()) {
    if (list.length < 2) continue;
    const keep = list.find((segment) => segment.old) ?? list[0];
    out.push(...list.filter((segment) => segment !== keep));
  }
  return out;
}

const uniqueIdsPlugin = new Plugin({
  key: uniqueKey,
  appendTransaction(trs, _oldState, state) {
    const marker = markerType(state);
    if (!marker || trs.some((tr) => tr.getMeta(uniqueKey))) return null;
    if (!trs.some((tr) => tr.steps.some((step) => touchesMarks(step, marker)))) return null;
    const parts = duplicateMarkParts(state.doc, marker, insertedRanges(trs));
    if (!parts.length) return null;
    const tr = state.tr;
    for (const part of parts) {
      const mark = marker.create({ type: part.type, id: createMarkId(), data: null, badge: null });
      for (const { from, to, mark: old } of part.pieces)
        tr.removeMark(from, to, old).addMark(from, to, mark);
    }
    return tr.setMeta(uniqueKey, true);
  },
});

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
    setMarkState,
    setMarkStates,
  },
  readers: { marks: listMarks },
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
    uniqueIdsPlugin,
    new Plugin<ReadingState>({
      key: filterKey,
      state: {
        init: () => ({ filter: configOf(schema).filter ?? 'all', open: [], states: new Map() }),
        apply: (tr, value) => {
          const next = tr.getMeta(filterKey) as typeof value | undefined;
          if (next) return next;
          if (!tr.docChanged || !value.open.length) return value;
          return { ...value, open: value.open.map((p) => tr.mapping.map(p)) };
        },
      },
      props: {
        decorations(state) {
          const value = reading(state);
          const decorations = [
            ...stateDecorations(state.doc, value, configOf(schema).states),
            ...badgeDecorations(state.doc, schema, value),
            ...filterDecorations(state.doc, value),
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
  readers: { pages: listPages },
});

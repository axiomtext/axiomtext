import { definePlugin } from '@axiomtext/core';
import type { AxiomPlugin, EditorCommand } from '@axiomtext/core';
import { Fragment } from 'prosemirror-model';
import type { Node as PMNode } from 'prosemirror-model';
import { Plugin, TextSelection } from 'prosemirror-state';
import type { EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

/**
 * `equal` — ordinary columns (BLK-006).
 * `image-center` — text | centered image | text ("text on both sides" of an image).
 */
export type ColumnsLayout = 'equal' | 'image-center';
export const COLUMNS_LAYOUTS: readonly ColumnsLayout[] = ['equal', 'image-center'];

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 3;

/** Clamps column widths (percent) to 5–90 each and rescales them to add up to 100. */
export function sanitizeWidths(widths: unknown, count: number): number[] | null {
  if (!Array.isArray(widths) || widths.length !== count) return null;
  const nums = widths.map((w) => (typeof w === 'number' ? w : Number.parseFloat(String(w))));
  if (nums.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  const clamped = nums.map((n) => Math.max(5, Math.min(90, n)));
  const total = clamped.reduce((a, b) => a + b, 0);
  return clamped.map((n) => Math.round((n / total) * 1000) / 10);
}

/** Widths for an image-center layout whose middle column is `center` percent wide. */
export const centerWidths = (center: number): number[] => {
  const mid = Math.max(10, Math.min(80, Math.round(center)));
  const side = (100 - mid) / 2;
  return [side, mid, side];
};

const parseWidths = (dom: HTMLElement, count: number): number[] | null => {
  const raw = dom.style.gridTemplateColumns;
  if (!raw) return null;
  const parts = raw.trim().split(/\s+/);
  if (!parts.every((p) => /^\d+(?:\.\d+)?fr$/.test(p))) return null;
  return sanitizeWidths(
    parts.map((p) => Number.parseFloat(p)),
    count,
  );
};

/** The closest column layout around the selection (or around `pos`). */
export function findColumns(
  state: EditorState,
  pos = state.selection.from,
): { node: PMNode; pos: number } | null {
  const $pos = state.doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === 'columns') return { node, pos: $pos.before(depth) };
  }
  return null;
}

// ───────────────────────── Commands ─────────────────────────

/** Inserts 2 or 3 empty columns after the current block (or in place of an empty line). */
export const insertColumns =
  (count = 2): EditorCommand =>
  (state, dispatch) => {
    const { columns, column, paragraph } = state.schema.nodes;
    if (!columns || !column || !paragraph) return false;
    const n = Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, Math.round(count)));
    if (findColumns(state)) return false; // no columns inside columns
    const node = columns.create(
      { layout: 'equal' },
      Array.from({ length: n }, () => column.create(null, paragraph.create())),
    );
    if (dispatch) {
      const { $from } = state.selection;
      const empty = $from.parent.isTextblock && $from.parent.content.size === 0;
      const tr = empty
        ? state.tr.replaceWith($from.before(), $from.after(), node)
        : state.tr.insert($from.after(), node);
      const start = empty ? $from.before() : $from.after();
      tr.setSelection(TextSelection.create(tr.doc, start + 3)); // inside first paragraph
      dispatch(tr.scrollIntoView());
    }
    return true;
  };

/** Sets the column widths (percent) of the layout around the cursor. */
export const setColumnWidths =
  (widths: readonly number[]): EditorCommand =>
  (state, dispatch) => {
    const found = findColumns(state);
    if (!found) return false;
    const safe = sanitizeWidths([...widths], found.node.childCount);
    if (!safe) return false;
    dispatch?.(state.tr.setNodeMarkup(found.pos, undefined, { ...found.node.attrs, widths: safe }));
    return true;
  };

/** Removes the layout around the cursor, keeping every column's content in order. */
export const removeColumns = (): EditorCommand => (state, dispatch) => {
  const found = findColumns(state);
  if (!found) return false;
  if (dispatch) {
    const blocks: PMNode[] = [];
    found.node.forEach((col) => col.forEach((block) => blocks.push(block)));
    dispatch(
      state.tr
        .replaceWith(found.pos, found.pos + found.node.nodeSize, Fragment.from(blocks))
        .scrollIntoView(),
    );
  }
  return true;
};

// ───────────────────────── Plugin ─────────────────────────

export interface ColumnsPluginOptions {
  /** Hint shown in an empty column. Default "Type here…". */
  placeholder?: string;
}

/** Placeholder hints for empty columns, so each side is easy to find and click. */
const placeholderPlugin = (text: string): Plugin =>
  new Plugin({
    props: {
      decorations: (state) => {
        const decos: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (node.type.name !== 'column') return node.isBlock && !node.isTextblock;
          const only = node.childCount === 1 ? node.firstChild : null;
          if (only?.isTextblock && only.content.size === 0) {
            decos.push(
              Decoration.node(pos + 1, pos + 1 + only.nodeSize, {
                class: 'ax-column__empty',
                'data-placeholder': text,
              }),
            );
          }
          return false;
        });
        return DecorationSet.create(state.doc, decos);
      },
    },
  });

/** Creates the columns plugin (BLK-006). */
export function createColumnsPlugin(options: ColumnsPluginOptions = {}): AxiomPlugin {
  return definePlugin({
    name: 'columns',
    nodes: {
      columns: {
        group: 'block',
        content: `column{${MIN_COLUMNS},${MAX_COLUMNS}}`,
        attrs: {
          layout: { default: 'equal', validate: 'string' },
          widths: { default: null },
        },
        parseDOM: [
          {
            tag: 'div.ax-columns',
            getAttrs: (dom) => {
              const el = dom as HTMLElement;
              const layout = el.getAttribute('data-layout');
              const count = el.querySelectorAll(':scope > .ax-column').length;
              return {
                layout: (COLUMNS_LAYOUTS as readonly string[]).includes(layout ?? '')
                  ? layout
                  : 'equal',
                widths: parseWidths(el, count),
              };
            },
          },
        ],
        toDOM: (node) => {
          const widths = sanitizeWidths(node.attrs['widths'], node.childCount);
          return [
            'div',
            {
              class: 'ax-columns',
              'data-layout': node.attrs['layout'] as string,
              ...(widths
                ? { style: `grid-template-columns: ${widths.map((w) => `${w}fr`).join(' ')};` }
                : {}),
            },
            0,
          ];
        },
      },
      column: {
        content: 'block+',
        // Backspace / Delete never merge one column into the next.
        isolating: true,
        parseDOM: [{ tag: 'div.ax-column' }],
        toDOM: () => ['div', { class: 'ax-column' }, 0],
      },
    },
    commands: { insertColumns, setColumnWidths, removeColumns },
    enginePlugins: () => [placeholderPlugin(options.placeholder ?? 'Type here…')],
    messages: {
      en: {
        'columns.insert2': 'Two columns',
        'columns.insert3': 'Three columns',
        'columns.remove': 'Remove columns',
      },
    },
  });
}

/** Columns plugin with default options. */
export const Columns = createColumnsPlugin();

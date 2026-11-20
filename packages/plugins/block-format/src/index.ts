import { definePlugin } from '@axiomtext/core';
import type { EditorCommand } from '@axiomtext/core';
import type { EditorState, Transaction } from 'prosemirror-state';

/** Block types that can be aligned and indented. */
export const FORMATTABLE_BLOCKS = ['paragraph', 'heading'] as const;

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
const ALIGNMENTS: readonly TextAlign[] = ['left', 'center', 'right', 'justify'];
const MAX_INDENT = 8;
const INDENT_STEP_EM = 2;

/** Applies an attribute to every alignable block touched by the selection. */
function updateBlocks(
  state: EditorState,
  update: (attrs: Record<string, unknown>) => Record<string, unknown> | null,
): Transaction | null {
  const { from, to } = state.selection;
  const tr = state.tr;
  let changed = false;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!(FORMATTABLE_BLOCKS as readonly string[]).includes(node.type.name)) return true;
    const next = update(node.attrs);
    if (next) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...next });
      changed = true;
    }
    return false;
  });
  return changed ? tr : null;
}

/** Sets the alignment of the selected paragraphs/headings (`null` or `left` resets). */
export const setTextAlign =
  (align: TextAlign | null): EditorCommand =>
  (state, dispatch) => {
    const value = align === 'left' ? null : align;
    if (value !== null && !ALIGNMENTS.includes(value)) return false;
    const tr = updateBlocks(state, (attrs) =>
      attrs['textAlign'] === value ? null : { textAlign: value },
    );
    if (!tr) return false; // already aligned that way
    dispatch?.(tr.scrollIntoView());
    return true;
  };

/** Current alignment at the selection (for toolbar state). */
export function getTextAlign(state: EditorState): TextAlign {
  const value = state.selection.$from.parent.attrs['textAlign'];
  return typeof value === 'string' && (ALIGNMENTS as readonly string[]).includes(value)
    ? (value as TextAlign)
    : 'left';
}

const changeIndent =
  (delta: 1 | -1): (() => EditorCommand) =>
  () =>
  (state, dispatch) => {
    const tr = updateBlocks(state, (attrs) => {
      const current = typeof attrs['indent'] === 'number' ? attrs['indent'] : 0;
      const next = Math.max(0, Math.min(MAX_INDENT, current + delta));
      return next === current ? null : { indent: next === 0 ? null : next };
    });
    if (!tr) return false;
    dispatch?.(tr.scrollIntoView());
    return true;
  };

/** Indents the selected blocks one step (lists use their own nesting). */
export const indentBlock = changeIndent(1);
/** Outdents the selected blocks one step. */
export const outdentBlock = changeIndent(-1);

/** CORE-007: left / center / right / justify for paragraphs and headings. */
export const TextAlignment = definePlugin({
  name: 'text-align',
  globalAttributes: [
    {
      types: FORMATTABLE_BLOCKS,
      attributes: {
        textAlign: {
          default: null,
          parseHTML: (el) => {
            const value = el.style.textAlign || el.getAttribute('align') || '';
            const normalized = value === 'start' ? 'left' : value === 'end' ? 'right' : value;
            return (ALIGNMENTS as readonly string[]).includes(normalized) && normalized !== 'left'
              ? normalized
              : null;
          },
          renderHTML: (value) =>
            typeof value === 'string' && (ALIGNMENTS as readonly string[]).includes(value)
              ? { style: `text-align: ${value};` }
              : null,
        },
      },
    },
  ],
  commands: { setTextAlign },
  keymap: () => ({
    'Mod-Shift-l': setTextAlign('left'),
    'Mod-Shift-e': setTextAlign('center'),
    'Mod-Shift-r': setTextAlign('right'),
    'Mod-Shift-j': setTextAlign('justify'),
  }),
  messages: {
    en: {
      'align.left': 'Align left',
      'align.center': 'Align center',
      'align.right': 'Align right',
      'align.justify': 'Justify',
    },
  },
});

/** CORE-008: block indentation (in steps of 2em, up to 8 levels). */
export const Indent = definePlugin({
  name: 'indent',
  globalAttributes: [
    {
      types: FORMATTABLE_BLOCKS,
      attributes: {
        indent: {
          default: null,
          parseHTML: (el) => {
            const match = /^(\d+(?:\.\d+)?)(em|px)$/.exec(
              el.style.marginLeft || el.style.paddingLeft || '',
            );
            if (!match) return null;
            const amount =
              Number(match[1]) / (match[2] === 'px' ? 16 * INDENT_STEP_EM : INDENT_STEP_EM);
            const level = Math.round(amount);
            return level > 0 ? Math.min(level, MAX_INDENT) : null;
          },
          renderHTML: (value) =>
            typeof value === 'number' && value > 0
              ? { style: `margin-left: ${Math.min(value, MAX_INDENT) * INDENT_STEP_EM}em;` }
              : null,
        },
      },
    },
  ],
  commands: { indentBlock, outdentBlock },
  keymap: () => ({ 'Mod-]': indentBlock(), 'Mod-[': outdentBlock() }),
  messages: { en: { 'indent.increase': 'Increase indent', 'indent.decrease': 'Decrease indent' } },
});

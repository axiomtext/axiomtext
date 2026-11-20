import { definePlugin } from '@axiomtext/core';
import type { EditorCommand } from '@axiomtext/core';
import { lift, wrapIn } from 'prosemirror-commands';
import { InputRule, inputRules, wrappingInputRule } from 'prosemirror-inputrules';

/** Wraps the selection in a quote, or removes the quote if already inside one. */
export const toggleBlockquote = (): EditorCommand => (state, dispatch, view) => {
  const type = state.schema.nodes['blockquote'];
  if (!type) return false;
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type === type) return lift(state, dispatch, view);
  }
  return wrapIn(type)(state, dispatch, view);
};

/** Inserts a horizontal line after the current block (CORE-021). */
export const insertHorizontalRule = (): EditorCommand => (state, dispatch) => {
  const type = state.schema.nodes['horizontal_rule'];
  if (!type) return false;
  dispatch?.(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
  return true;
};

/** BLK-002 (blockquote), CORE-021 (horizontal line); markdown `> ` and `---`. */
export const Blockquote = definePlugin({
  name: 'blockquote',
  nodes: {
    blockquote: {
      content: 'block+',
      group: 'block',
      defining: true,
      parseDOM: [{ tag: 'blockquote' }],
      toDOM: () => ['blockquote', 0],
    },
    horizontal_rule: {
      group: 'block',
      parseDOM: [{ tag: 'hr' }],
      toDOM: () => ['hr'],
    },
  },
  commands: { toggleBlockquote, insertHorizontalRule },
  keymap: () => ({ 'Mod-Shift-.': toggleBlockquote() }),
  enginePlugins: (schema) => {
    const rules = [];
    const quote = schema.nodes['blockquote'];
    const hr = schema.nodes['horizontal_rule'];
    if (quote) rules.push(wrappingInputRule(/^\s*>\s$/, quote));
    if (hr) {
      rules.push(
        new InputRule(/^(?:---|___|\*\*\*)$/, (state, _match, start, end) => {
          const $start = state.doc.resolve(start);
          // Replace the whole (now empty) paragraph with a rule followed by a fresh paragraph.
          const blockStart = $start.before();
          const blockEnd = $start.after();
          const paragraph = state.schema.nodes['paragraph'];
          if (!paragraph || $start.parent.content.size !== end - start) return null;
          return state.tr.replaceWith(blockStart, blockEnd, [hr.create(), paragraph.create()]);
        }),
      );
    }
    return [inputRules({ rules })];
  },
  messages: { en: { 'blockquote.quote': 'Quote', 'blockquote.hr': 'Horizontal line' } },
});

/** Inserts a page break (CORE-021); shown as a dashed line, starts a new page when printing. */
export const insertPageBreak = (): EditorCommand => (state, dispatch) => {
  const type = state.schema.nodes['page_break'];
  if (!type) return false;
  dispatch?.(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
  return true;
};

/** CORE-021: page breaks (`Mod-Enter`). */
export const PageBreak = definePlugin({
  name: 'page-break',
  nodes: {
    page_break: {
      group: 'block',
      atom: true,
      selectable: true,
      parseDOM: [
        { tag: 'div[data-type="page-break"]' },
        {
          tag: 'div',
          getAttrs: (dom) =>
            ((dom as HTMLElement).style.pageBreakAfter === 'always' ||
              (dom as HTMLElement).style.breakAfter === 'page') &&
            null,
        },
      ],
      toDOM: () => [
        'div',
        {
          'data-type': 'page-break',
          class: 'ax-page-break',
          style: 'break-after: page; page-break-after: always;',
        },
      ],
    },
  },
  commands: { insertPageBreak },
  keymap: () => ({ 'Mod-Enter': insertPageBreak() }),
  messages: { en: { 'page-break.insert': 'Page break' } },
});

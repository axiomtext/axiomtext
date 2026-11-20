import { definePlugin, markInputRule } from '@axiomtext/core';
import type { EditorCommand, MarkDefinition } from '@axiomtext/core';
import { toggleMark } from 'prosemirror-commands';
import { inputRules } from 'prosemirror-inputrules';

const marks: Record<string, MarkDefinition> = {
  bold: {
    parseDOM: [
      { tag: 'strong' },
      // Google Docs wraps content in <b style="font-weight:normal">; ignore that.
      { tag: 'b', getAttrs: (node) => (node as HTMLElement).style.fontWeight !== 'normal' && null },
      {
        style: 'font-weight',
        getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
      },
    ],
    toDOM: () => ['strong', 0],
  },
  italic: {
    parseDOM: [{ tag: 'i' }, { tag: 'em' }, { style: 'font-style=italic' }],
    toDOM: () => ['em', 0],
  },
  underline: {
    parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }],
    toDOM: () => ['u', 0],
  },
  strikethrough: {
    parseDOM: [
      { tag: 's' },
      { tag: 'del' },
      { tag: 'strike' },
      { style: 'text-decoration=line-through' },
    ],
    toDOM: () => ['s', 0],
  },
  subscript: {
    excludes: 'superscript',
    parseDOM: [{ tag: 'sub' }, { style: 'vertical-align=sub' }],
    toDOM: () => ['sub', 0],
  },
  superscript: {
    excludes: 'subscript',
    parseDOM: [{ tag: 'sup' }, { style: 'vertical-align=super' }],
    toDOM: () => ['sup', 0],
  },
  code: {
    excludes: '_',
    code: true,
    parseDOM: [{ tag: 'code' }],
    toDOM: () => ['code', 0],
  },
};

function toggle(markName: string): () => EditorCommand {
  return () => (state, dispatch, view) => {
    const type = state.schema.marks[markName];
    return type ? toggleMark(type)(state, dispatch, view) : false;
  };
}

export const toggleBold = toggle('bold');
export const toggleItalic = toggle('italic');
export const toggleUnderline = toggle('underline');
export const toggleStrikethrough = toggle('strikethrough');
export const toggleSubscript = toggle('subscript');
export const toggleSuperscript = toggle('superscript');
export const toggleCode = toggle('code');

/** Removes all inline formatting (marks) from the selection (CORE-011). */
export const clearFormatting = (): EditorCommand => (state, dispatch) => {
  const { from, to, empty } = state.selection;
  if (empty) {
    if (!state.storedMarks?.length && !state.selection.$from.marks().length) return false;
    dispatch?.(state.tr.setStoredMarks([]));
    return true;
  }
  let hasMarks = false;
  state.doc.nodesBetween(from, to, (node) => {
    if (node.marks.length) hasMarks = true;
  });
  if (!hasMarks) return false;
  if (dispatch) {
    const tr = state.tr;
    for (const type of Object.values(state.schema.marks)) tr.removeMark(from, to, type);
    dispatch(tr.scrollIntoView());
  }
  return true;
};

/** CORE-001, CORE-002, CORE-011, CORE-015 (markdown shortcuts for inline styles). */
export const BasicStyles = definePlugin({
  name: 'basic-styles',
  marks,
  commands: {
    toggleBold,
    toggleItalic,
    toggleUnderline,
    toggleStrikethrough,
    toggleSubscript,
    toggleSuperscript,
    toggleCode,
    clearFormatting,
  },
  keymap: () => ({
    'Mod-b': toggleBold(),
    'Mod-i': toggleItalic(),
    'Mod-u': toggleUnderline(),
    'Mod-Shift-x': toggleStrikethrough(),
    'Mod-,': toggleSubscript(),
    'Mod-.': toggleSuperscript(),
    'Mod-e': toggleCode(),
    'Mod-\\': clearFormatting(),
  }),
  enginePlugins: (schema) => {
    const m = schema.marks;
    const rules = [];
    if (m['bold']) {
      rules.push(markInputRule(/(?<![*\w])\*\*([^*\s](?:[^*]*[^*\s])?)\*\*$/, m['bold']));
      rules.push(markInputRule(/(?<![_\w])__([^_\s](?:[^_]*[^_\s])?)__$/, m['bold']));
    }
    if (m['italic']) {
      rules.push(markInputRule(/(?<![*\w])\*([^*\s](?:[^*]*[^*\s])?)\*$/, m['italic']));
      rules.push(markInputRule(/(?<![_\w])_([^_\s](?:[^_]*[^_\s])?)_$/, m['italic']));
    }
    if (m['strikethrough'])
      rules.push(markInputRule(/(?<!~)~~([^~\s](?:[^~]*[^~\s])?)~~$/, m['strikethrough']));
    if (m['code']) rules.push(markInputRule(/(?<!`)`([^`]+)`$/, m['code']));
    return [inputRules({ rules })];
  },
  messages: {
    en: {
      'basic-styles.bold': 'Bold',
      'basic-styles.italic': 'Italic',
      'basic-styles.underline': 'Underline',
      'basic-styles.strikethrough': 'Strikethrough',
      'basic-styles.subscript': 'Subscript',
      'basic-styles.superscript': 'Superscript',
      'basic-styles.code': 'Code',
      'basic-styles.clear': 'Clear formatting',
    },
  },
});

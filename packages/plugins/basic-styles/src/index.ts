import { definePlugin } from '@axiomtext/core';
import type { EditorCommand, MarkDefinition } from '@axiomtext/core';
import { toggleMark } from 'prosemirror-commands';

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
export const toggleCode = toggle('code');

/** CORE-001, CORE-002 (code). */
export const BasicStyles = definePlugin({
  name: 'basic-styles',
  marks,
  commands: { toggleBold, toggleItalic, toggleUnderline, toggleStrikethrough, toggleCode },
  keymap: () => ({
    'Mod-b': toggleBold(),
    'Mod-i': toggleItalic(),
    'Mod-u': toggleUnderline(),
    'Mod-Shift-x': toggleStrikethrough(),
    'Mod-e': toggleCode(),
  }),
  messages: {
    en: {
      'basic-styles.bold': 'Bold',
      'basic-styles.italic': 'Italic',
      'basic-styles.underline': 'Underline',
      'basic-styles.strikethrough': 'Strikethrough',
      'basic-styles.code': 'Code',
    },
  },
});

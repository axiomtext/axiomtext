import { definePlugin, sanitizeColor, sanitizeFontFamily, sanitizeFontSize } from '@axiomtext/core';
import type { EditorCommand } from '@axiomtext/core';
import type { MarkType } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';

/** Sets (or with `null`, removes) a mark with a single attribute on the selection. */
function setStyleMark(
  markName: string,
  attr: string,
  value: string | null,
  sanitize: (v: string) => string | null,
): EditorCommand {
  return (state, dispatch) => {
    const type: MarkType | undefined = state.schema.marks[markName];
    if (!type) return false;
    const safe = value === null ? null : sanitize(value);
    if (value !== null && !safe) return false;
    if (!dispatch) return true;
    const { from, to, empty } = state.selection;
    const tr = state.tr;
    if (empty) {
      tr.removeStoredMark(type);
      if (safe) tr.addStoredMark(type.create({ [attr]: safe }));
    } else {
      tr.removeMark(from, to, type);
      if (safe) tr.addMark(from, to, type.create({ [attr]: safe }));
    }
    dispatch(tr.scrollIntoView());
    return true;
  };
}

/** Value of a style mark at the selection, or null. */
export function getStyleValue(state: EditorState, markName: string, attr: string): string | null {
  const type = state.schema.marks[markName];
  if (!type) return null;
  const { from, to, empty, $from } = state.selection;
  if (empty) {
    const mark = type.isInSet(state.storedMarks ?? $from.marks());
    return mark ? (mark.attrs[attr] as string) : null;
  }
  let found: string | null = null;
  state.doc.nodesBetween(from, to, (node) => {
    const mark = type.isInSet(node.marks);
    if (mark && found === null) found = mark.attrs[attr] as string;
  });
  return found;
}

export const setFontFamily = (family: string | null): EditorCommand =>
  setStyleMark('font_family', 'family', family, sanitizeFontFamily);
export const setFontSize = (size: string | null): EditorCommand =>
  setStyleMark('font_size', 'size', size, sanitizeFontSize);
export const setTextColor = (color: string | null): EditorCommand =>
  setStyleMark('text_color', 'color', color, sanitizeColor);
export const setHighlight = (color: string | null): EditorCommand =>
  setStyleMark('highlight', 'color', color, sanitizeColor);

/** CORE-003 */
export const FontFamily = definePlugin({
  name: 'font-family',
  marks: {
    font_family: {
      attrs: { family: { validate: 'string' } },
      parseDOM: [
        {
          style: 'font-family',
          getAttrs: (value) => {
            const family = sanitizeFontFamily(value as string);
            return family ? { family } : false;
          },
        },
      ],
      toDOM: (mark) => [
        'span',
        {
          style: `font-family: ${sanitizeFontFamily(mark.attrs['family'] as string) ?? 'inherit'};`,
        },
        0,
      ],
    },
  },
  commands: { setFontFamily },
});

/** CORE-004 */
export const FontSize = definePlugin({
  name: 'font-size',
  marks: {
    font_size: {
      attrs: { size: { validate: 'string' } },
      parseDOM: [
        {
          style: 'font-size',
          getAttrs: (value) => {
            const size = sanitizeFontSize(value as string);
            return size ? { size } : false;
          },
        },
      ],
      toDOM: (mark) => [
        'span',
        { style: `font-size: ${sanitizeFontSize(mark.attrs['size'] as string) ?? 'inherit'};` },
        0,
      ],
    },
  },
  commands: { setFontSize },
});

/** CORE-005 (text color) */
export const TextColor = definePlugin({
  name: 'text-color',
  marks: {
    text_color: {
      attrs: { color: { validate: 'string' } },
      parseDOM: [
        {
          style: 'color',
          getAttrs: (value) => {
            const color = sanitizeColor(value as string);
            return color ? { color } : false;
          },
        },
      ],
      toDOM: (mark) => [
        'span',
        { style: `color: ${sanitizeColor(mark.attrs['color'] as string) ?? 'inherit'};` },
        0,
      ],
    },
  },
  commands: { setTextColor },
});

/** CORE-005 (background highlight) */
export const Highlight = definePlugin({
  name: 'highlight',
  marks: {
    highlight: {
      attrs: { color: { validate: 'string' } },
      parseDOM: [
        {
          tag: 'mark',
          getAttrs: (dom) => ({
            color: sanitizeColor((dom as HTMLElement).style.backgroundColor) ?? '#fef08a',
          }),
        },
        {
          style: 'background-color',
          getAttrs: (value) => {
            const color = sanitizeColor(value as string);
            return color && color !== 'transparent' ? { color } : false;
          },
        },
      ],
      toDOM: (mark) => [
        'mark',
        {
          style: `background-color: ${sanitizeColor(mark.attrs['color'] as string) ?? '#fef08a'};`,
        },
        0,
      ],
    },
  },
  commands: { setHighlight },
  keymap: () => ({ 'Mod-Shift-h': setHighlight('#fef08a') }),
});

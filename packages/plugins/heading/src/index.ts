import { definePlugin } from '@axiomtext/core';
import type { EditorCommand } from '@axiomtext/core';
import { setBlockType } from 'prosemirror-commands';
import { inputRules, textblockTypeInputRule } from 'prosemirror-inputrules';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
const LEVELS: readonly HeadingLevel[] = [1, 2, 3, 4, 5, 6];

/** Turns the current block into a heading of the given level. */
export const setHeading =
  (level: HeadingLevel): EditorCommand =>
  (state, dispatch, view) => {
    const type = state.schema.nodes['heading'];
    return type ? setBlockType(type, { level })(state, dispatch, view) : false;
  };

/** Turns the current block back into a paragraph. */
export const setParagraph = (): EditorCommand => (state, dispatch, view) => {
  const type = state.schema.nodes['paragraph'];
  return type ? setBlockType(type)(state, dispatch, view) : false;
};

/** BLK-001. */
export const Heading = definePlugin({
  name: 'heading',
  nodes: {
    heading: {
      attrs: { level: { default: 1, validate: 'number' } },
      content: 'inline*',
      group: 'block',
      defining: true,
      parseDOM: LEVELS.map((level) => ({ tag: `h${level}`, attrs: { level } })),
      toDOM: (node) => [`h${node.attrs['level'] as HeadingLevel}`, 0],
    },
  },
  commands: { setHeading, setParagraph },
  keymap: () => {
    const keys: Record<string, EditorCommand> = { 'Mod-Alt-0': setParagraph() };
    for (const level of LEVELS) keys[`Mod-Alt-${level}`] = setHeading(level);
    return keys;
  },
  // "# " → Heading 1 … "###### " → Heading 6 (CORE-015)
  enginePlugins: (schema) => {
    const type = schema.nodes['heading'];
    if (!type) return [];
    return [
      inputRules({
        rules: [
          textblockTypeInputRule(/^(#{1,6})\s$/, type, (m) => ({ level: m[1]?.length ?? 1 })),
        ],
      }),
    ];
  },
  messages: {
    en: Object.fromEntries(LEVELS.map((l) => [`heading.h${l}`, `Heading ${l}`])),
  },
});

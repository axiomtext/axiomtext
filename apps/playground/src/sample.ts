import type { DocumentJSON, NodeJSON } from '@axiomtext/core';

const t = (text: string, ...marks: string[]): NodeJSON =>
  marks.length
    ? { type: 'text', text, marks: marks.map((type) => ({ type })) }
    : { type: 'text', text };
const p = (...content: NodeJSON[]): NodeJSON => ({ type: 'paragraph', content });
const h = (level: number, text: string): NodeJSON => ({
  type: 'heading',
  attrs: { level },
  content: [t(text)],
});

export const sampleDocument: DocumentJSON = {
  version: 1,
  doc: {
    type: 'doc',
    content: [
      h(1, 'Welcome to AxiomText'),
      p(
        t('A '),
        t('free', 'bold'),
        t(', open-source rich text editor with a '),
        t('built-in math editor', 'italic'),
        t('. Everything runs in your browser — no server, no license key, no limits.'),
      ),
      h(2, 'Try it'),
      p(
        t('Select some text and press '),
        t('⌘B', 'code'),
        t(' / '),
        t('Ctrl+B', 'code'),
        t(', or use the toolbar. Change this line into a heading with the '),
        t('Text style', 'bold'),
        t(' menu.'),
      ),
      p(t('বাংলায় লিখুন — Bangla, Arabic and other complex scripts are first-class citizens.')),
      h(2, 'Coming next'),
      p(
        t('Lists, links, tables, images and the math equation editor are on the way. '),
        t('Old ideas get crossed out', 'strikethrough'),
        t(', important ones get '),
        t('underlined', 'underline'),
        t('.'),
      ),
    ],
  },
};

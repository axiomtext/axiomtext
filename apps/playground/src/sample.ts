import type { DocumentJSON, NodeJSON } from '@axiomtext/core';

const t = (text: string, ...marks: string[]): NodeJSON =>
  marks.length
    ? { type: 'text', text, marks: marks.map((type) => ({ type })) }
    : { type: 'text', text };
const link = (text: string, href: string): NodeJSON => ({
  type: 'text',
  text,
  marks: [{ type: 'link', attrs: { href } }],
});
const p = (...content: NodeJSON[]): NodeJSON => ({ type: 'paragraph', content });
const h = (level: number, text: string): NodeJSON => ({
  type: 'heading',
  attrs: { level },
  content: [t(text)],
});
const m = (latex: string): NodeJSON => ({ type: 'math_inline', attrs: { latex } });
const mb = (latex: string): NodeJSON => ({ type: 'math_block', attrs: { latex } });
const li = (...content: NodeJSON[]): NodeJSON => ({ type: 'list_item', content: [p(...content)] });
const task = (checked: boolean, text: string): NodeJSON => ({
  type: 'task_item',
  attrs: { checked },
  content: [p(t(text))],
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
        t(
          '. Everything runs in your browser — no server, no license key, no limits. Learn more at ',
        ),
        link('axiomtext.dev', 'https://axiomtext.dev'),
        t('.'),
      ),
      h(2, 'Math, right in your text'),
      p(
        t('Type '),
        t('$x^2$', 'code'),
        t(' to get '),
        m('x^2'),
        t(', or click an equation to edit it. Euler’s identity '),
        m('e^{i\\pi} + 1 = 0'),
        t(' looks great inline.'),
      ),
      mb('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'),
      h(2, 'Markdown shortcuts'),
      {
        type: 'bullet_list',
        content: [
          li(
            t('- ', 'code'),
            t(' bulleted list, '),
            t('1. ', 'code'),
            t(' numbered list, '),
            t('[ ] ', 'code'),
            t(' to-do list'),
          ),
          li(
            t('# ', 'code'),
            t(' heading, '),
            t('> ', 'code'),
            t(' quote, '),
            t('---', 'code'),
            t(' horizontal line'),
          ),
          li(
            t('**bold**', 'code'),
            t(', '),
            t('*italic*', 'code'),
            t(', '),
            t('~~strike~~', 'code'),
            t(', '),
            t('`code`', 'code'),
            t(', '),
            t('$$ ', 'code'),
            t(' block equation'),
          ),
        ],
      },
      {
        type: 'task_list',
        content: [
          task(true, 'Lists, quotes and links'),
          task(true, 'Inline and block equations'),
          task(false, 'Tables and images (next)'),
        ],
      },
      {
        type: 'blockquote',
        content: [
          p(t('বাংলায় লিখুন — Bangla, Arabic and other complex scripts are first-class citizens.')),
        ],
      },
    ],
  },
};

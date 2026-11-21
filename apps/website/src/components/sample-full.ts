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
const cell = (type: 'table_cell' | 'table_header', ...content: NodeJSON[]): NodeJSON => ({
  type,
  content: [p(...content)],
});
const row = (type: 'table_cell' | 'table_header', ...cells: NodeJSON[][]): NodeJSON => ({
  type: 'table_row',
  content: cells.map((c) => cell(type, ...c)),
});
const styled = (text: string, type: string, attrs: Record<string, unknown>): NodeJSON => ({
  type: 'text',
  text,
  marks: [{ type, attrs }],
});
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
      h(2, 'Tables & images'),
      p(
        t('Insert a table from the toolbar, press '),
        t('Tab', 'code'),
        t(
          ' to move between cells, and use the table bar to add rows, merge cells and more. Text can be ',
        ),
        styled('colored', 'text_color', { color: '#4f46e5' }),
        t(', '),
        styled('highlighted', 'highlight', { color: '#fef08a' }),
        t(' or set in '),
        styled('Georgia', 'font_family', { family: 'Georgia, serif' }),
        t('.'),
      ),
      {
        type: 'table',
        content: [
          row('table_header', [t('Feature')], [t('Typical editors')], [t('AxiomText')]),
          row('table_cell', [t('License')], [t('GPL or paid')], [t('MIT — free', 'bold')]),
          row('table_cell', [t('Math editor')], [t('Paid add-on')], [t('Built in, visual')]),
          row('table_cell', [t('Server needed')], [t('Often')], [t('Never')]),
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'image',
            attrs: {
              src: '/sample-image.png',
              alt: 'Abstract indigo and purple gradient',
              width: 42,
              wrap: 'right',
              caption: 'Wrap text: the image sits on the right.',
            },
          },
          t('Click the image to choose how text flows around it: '),
          t('in line with text', 'bold'),
          t(' (it sits inside the sentence), '),
          t('wrap text', 'bold'),
          t(
            ' on the left or right (the text runs down beside it for as many lines as the image is tall), or ',
          ),
          t('break text', 'bold'),
          t(
            ' (the image gets its own line). Drag the round handle to resize it, and add a caption or alt text from the image bar. ',
          ),
          t(
            'You can always click before or after an image and keep typing — it behaves like a very large character in your paragraph. ',
          ),
          t(
            'This paragraph keeps going so you can see the text wrap neatly beside the picture, line after line, just like in a word processor.',
          ),
        ],
      },
      p(
        t('Small images can also sit in line with text '),
        {
          type: 'image',
          attrs: {
            src: '/sample-image.png',
            alt: 'Small gradient',
            width: 8,
            wrap: 'inline',
            caption: '',
          },
        },
        t(' like this, right inside a sentence.'),
      ),
      {
        type: 'columns',
        attrs: { layout: 'image-center', widths: [32, 36, 32] },
        content: [
          {
            type: 'column',
            content: [
              p(
                t('Text on both sides', 'bold'),
                t(
                  ': choose this from the image bar and the text before the image stays on the left, the text after it moves to the right. Keep typing on either side — each side grows as tall as you need.',
                ),
              ),
            ],
          },
          {
            type: 'column',
            content: [
              p({
                type: 'image',
                attrs: {
                  src: '/sample-image.png',
                  alt: 'Gradient between two text columns',
                  width: null,
                  wrap: 'both',
                  caption: 'Drag the handle to resize the middle.',
                },
              }),
            ],
          },
          {
            type: 'column',
            content: [
              p(
                t(
                  'It is saved as plain HTML with CSS grid, so your website shows exactly this layout with content.css. On a phone the three parts stack: text, image, text.',
                ),
              ),
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: [t('This paragraph is centered.', 'italic')],
      },
    ],
  },
};

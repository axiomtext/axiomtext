import { describe, expect, it } from 'vitest';
import type { DocumentJSON, NodeJSON } from '@axiomtext/core';
import { createEditor } from '@axiomtext/view';
import { MathPlugin } from '@axiomtext/math';
import { BasicStyles } from '@axiomtext/plugin-basic-styles';
import { Heading } from '@axiomtext/plugin-heading';
import { List } from '@axiomtext/plugin-list';
import { Blockquote, PageBreak } from '@axiomtext/plugin-blockquote';
import { Link } from '@axiomtext/plugin-link';
import { Table } from '@axiomtext/plugin-table';
import { Image } from '@axiomtext/plugin-image';
import { Columns } from '@axiomtext/plugin-columns';
import { fromMarkdown, toMarkdown } from '../src';

const t = (text: string, ...marks: string[]): NodeJSON =>
  marks.length
    ? { type: 'text', text, marks: marks.map((type) => ({ type })) }
    : { type: 'text', text };
const doc = (...content: NodeJSON[]): DocumentJSON => ({
  version: 1,
  doc: { type: 'doc', content },
});
const p = (...content: NodeJSON[]): NodeJSON => ({ type: 'paragraph', content });

const plugins = [
  BasicStyles,
  Heading,
  List,
  Blockquote,
  PageBreak,
  Link,
  Table,
  Image,
  MathPlugin,
  Columns,
];
/** Loads JSON into a real editor: throws if it doesn't fit the schema. */
const load = (json: DocumentJSON): DocumentJSON => {
  const element = document.createElement('div');
  const editor = createEditor({ element, plugins, content: json });
  const out = editor.getJSON();
  editor.destroy();
  return out;
};

describe('toMarkdown', () => {
  it('writes headings, marks, links, math and escapes', () => {
    const md = toMarkdown(
      doc(
        { type: 'heading', attrs: { level: 2 }, content: [t('Title')] },
        p(
          t('Plain '),
          t('bold', 'bold'),
          t(' and ', 'bold', 'italic'),
          t('code', 'code'),
          t(' * star'),
          {
            type: 'text',
            text: 'site',
            marks: [{ type: 'link', attrs: { href: 'https://axiomtext.dev' } }],
          },
          t(' '),
          { type: 'math_inline', attrs: { latex: 'x^2' } },
        ),
        { type: 'math_block', attrs: { latex: 'E = mc^2' } },
      ),
    );
    expect(md).toBe(
      '## Title\n\nPlain **bold *and*** `code` \\* star[site](https://axiomtext.dev) $x^2$\n\n$$\nE = mc^2\n$$\n',
    );
  });

  it('writes lists, to-dos, quotes and tables', () => {
    const md = toMarkdown(
      doc(
        {
          type: 'bullet_list',
          content: [
            { type: 'list_item', content: [p(t('one'))] },
            {
              type: 'list_item',
              content: [
                p(t('two')),
                {
                  type: 'ordered_list',
                  attrs: { start: 3 },
                  content: [{ type: 'list_item', content: [p(t('three'))] }],
                },
              ],
            },
          ],
        },
        {
          type: 'task_list',
          content: [
            { type: 'task_item', attrs: { checked: true }, content: [p(t('done'))] },
            { type: 'task_item', attrs: { checked: false }, content: [p(t('todo'))] },
          ],
        },
        { type: 'blockquote', content: [p(t('quoted'))] },
        {
          type: 'table',
          content: [
            {
              type: 'table_row',
              content: [
                { type: 'table_header', content: [p(t('A'))] },
                { type: 'table_header', content: [p(t('B'))] },
              ],
            },
            {
              type: 'table_row',
              content: [
                { type: 'table_cell', content: [p(t('1'))] },
                { type: 'table_cell', content: [p(t('x | y'))] },
              ],
            },
          ],
        },
      ),
    );
    expect(md).toBe(
      [
        '- one',
        '- two',
        '  3. three',
        '',
        '- [x] done',
        '- [ ] todo',
        '',
        '> quoted',
        '',
        '| A | B |',
        '| --- | --- |',
        '| 1 | x \\| y |',
        '',
      ].join('\n'),
    );
  });

  it('keeps underline etc. only with html: true', () => {
    const d = doc(p(t('u', 'underline'), t('2', 'superscript')));
    expect(toMarkdown(d)).toBe('u2\n');
    expect(toMarkdown(d, { html: true })).toBe('<u>u</u><sup>2</sup>\n');
  });
});

describe('fromMarkdown', () => {
  const sample = [
    '# Notes',
    '',
    'Some **bold**, *italic*, ~~gone~~, `code` and a [link](https://axiomtext.dev).',
    'Euler: $e^{i\\pi} + 1 = 0$, costs $5 and $10.',
    '',
    '$$',
    '\\int_0^1 x^2 \\, dx',
    '$$',
    '',
    '- [x] write docs',
    '- [ ] ship',
    '',
    '1. first',
    '2. second',
    '',
    '> quote',
    '',
    '| Name | Value |',
    '| --- | --- |',
    '| a | 1 |',
    '',
    '![Logo](https://axiomtext.dev/logo.png "The logo")',
    '',
    '---',
  ].join('\n');

  it('builds a document that loads in the editor', () => {
    const json = fromMarkdown(sample);
    const types = json.doc.content?.map((n) => n.type);
    expect(types).toEqual([
      'heading',
      'paragraph',
      'math_block',
      'task_list',
      'ordered_list',
      'blockquote',
      'table',
      'paragraph',
      'horizontal_rule',
    ]);
    const text = JSON.stringify(json);
    expect(text).toContain('"latex":"e^{i\\\\pi} + 1 = 0"');
    expect(text).toContain('costs $5 and $10.');
    expect(text).toContain('"checked":true');
    expect(text).toContain('"wrap":"block"');
    expect(() => load(json)).not.toThrow();
  });

  it('round-trips Markdown → editor → Markdown', () => {
    const once = toMarkdown(load(fromMarkdown(sample)));
    const twice = toMarkdown(load(fromMarkdown(once)));
    expect(twice).toBe(once);
    expect(once).toContain('- [x] write docs');
    expect(once).toContain('$e^{i\\pi} + 1 = 0$');
    expect(once).toContain('| a | 1 |');
  });

  it('ignores raw HTML (no script injection through Markdown)', () => {
    const json = fromMarkdown('<script>alert(1)</script>\n\nok <img src=x onerror=alert(1)>');
    const loaded = load(json);
    expect(JSON.stringify(loaded)).not.toContain('"type":"image"');
  });
});

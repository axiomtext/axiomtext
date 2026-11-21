/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { BasicStyles } from '@axiomtext/plugin-basic-styles';
import { List } from '@axiomtext/plugin-list';
import { Heading } from '@axiomtext/plugin-heading';
import { Link } from '@axiomtext/plugin-link';
import { createEditor } from '@axiomtext/view';
import type { Editor } from '@axiomtext/view';

const sample = (name: string): string =>
  readFileSync(resolve(process.cwd(), '../../corpora/paste', name), 'utf8');

let editor: Editor | undefined;
afterEach(() => editor?.destroy());

const paste = (html: string): string => {
  const element = document.createElement('div');
  document.body.append(element);
  editor = createEditor({ element, plugins: [BasicStyles, List, Heading, Link] });
  editor.insertHTML(html);
  return editor.getHTML();
};

describe('paste cleanup (corpus)', () => {
  it('Google Docs: no fake bold, real list', () => {
    const html = paste(sample('google-docs.html'));
    expect(html).toContain('Plain text, <strong>bold</strong><em> italic</em>');
    expect(html).toContain('<ul><li><p>First item</p></li></ul>');
  });

  it('Word: no style text, no typed bullets, no Office tags', () => {
    const html = paste(sample('word-windows.html'));
    expect(html).toContain('Hello <strong>Word</strong>');
    expect(html).toContain('Bullet one');
    expect(html).not.toContain('·');
    expect(html).not.toContain('MsoNormal');
    expect(html).not.toContain('WordDocument');
  });

  it('web page: scripts, handlers, bad links and hidden text removed', () => {
    const html = paste(sample('web-page.html'));
    expect(html).toContain('<h2>Heading</h2>');
    expect(html).toContain('<a href="https://axiomtext.dev"');
    expect(html).not.toMatch(/alert|javascript:|onclick|onerror|hidden tracking|color:red/);
  });
});

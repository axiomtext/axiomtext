/**
 * axiomtext/server — AxiomText documents on the server (Node, Deno, Bun, edge), without a
 * browser: HTML for SEO pages and emails, plus marks, pages and comments.
 *
 *   import { renderHTML } from 'axiomtext/server';
 *
 *   const html = await renderHTML(savedJson, { markTypes });
 *   // Same HTML as editor.getHTML(): show it with axiomtext/content.css (and KaTeX's CSS).
 */
import { buildSchema, migrateDocument } from '@axiomtext/core';
import type { AxiomPlugin, DocumentJSON } from '@axiomtext/core';
import { getLanguage, setLanguage } from '@axiomtext/i18n';
import type { Messages } from '@axiomtext/i18n';
import { loadKatex, renderLatex } from '@axiomtext/math';
import type { MarkTypeDef } from '@axiomtext/plugin-marks/data';
import { Node as PMNode } from 'prosemirror-model';
import type { DOMOutputSpec, Mark } from 'prosemirror-model';
import { ALL_PLUGINS } from './plugins';

export { listMarks, listPages, normalizeMarkTypes } from '@axiomtext/plugin-marks/data';
export type { MarkInfo, MarkTypeDef, PageInfo } from '@axiomtext/plugin-marks/data';
export { listCommentThreads } from '@axiomtext/plugin-comments/data';
export { convertBijoy, looksLikeBijoy, toMarkdown, fromMarkdown } from '@axiomtext/convert';

export interface RenderHTMLOptions {
  /** Your mark types, so marks get their colours and styles (as in the editor). */
  markTypes?: readonly MarkTypeDef[];
  /**
   * Equations: `katex` (default) pre-renders them so pages need only KaTeX's CSS; `latex`
   * leaves `\(…\)` for a client-side renderer.
   */
  math?: 'katex' | 'latex';
  /** Language of labels such as "Page 23" (with `translations` from `axiomtext/locales/…`). */
  language?: string;
  translations?: Messages;
  /** Plugins the document was written with. Default: all of them. */
  plugins?: readonly AxiomPlugin[];
}

const VOID = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'source', 'wbr']);
const HOLE = '\u0000hole\u0000';

const escapeText = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\u00a0/g, '&nbsp;');
const escapeAttr = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const validName = (name: string): boolean => /^[a-zA-Z][\w:.-]*$/.test(name);

/** A DOM output spec as an HTML string; the content hole (`0`) becomes HOLE. */
function specToString(spec: DOMOutputSpec): string {
  if (typeof spec === 'string') return escapeText(spec);
  if (!Array.isArray(spec)) {
    // A DOM node (only when a browser document exists): use its markup.
    const node = spec as unknown as { outerHTML?: string; dom?: { outerHTML?: string } };
    return node.outerHTML ?? node.dom?.outerHTML ?? '';
  }
  const [rawTag, ...rest] = spec as readonly unknown[];
  const tag = String(rawTag).split(' ').pop() ?? 'span';
  if (!validName(tag)) return '';
  let attrs = '';
  let start = 0;
  const first = rest[0];
  if (first && typeof first === 'object' && !Array.isArray(first)) {
    for (const [name, value] of Object.entries(first as Record<string, unknown>)) {
      if (value === null || value === undefined || !validName(name)) continue;
      attrs += ` ${name}="${escapeAttr(String(value))}"`;
    }
    start = 1;
  }
  if (VOID.has(tag)) return `<${tag}${attrs}>`;
  let inner = '';
  for (const child of rest.slice(start)) {
    if (child === 0) inner += HOLE;
    else inner += specToString(child as DOMOutputSpec);
  }
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

function markWrapper(mark: Mark): [string, string] {
  const toDOM = mark.type.spec.toDOM;
  if (!toDOM) return ['', ''];
  const html = specToString(toDOM(mark, true));
  const at = html.indexOf(HOLE);
  return at < 0 ? [html, ''] : [html.slice(0, at), html.slice(at + HOLE.length)];
}

function renderNode(node: PMNode, math: 'katex' | 'latex'): string {
  if (node.isText) return escapeText(node.text ?? '');
  const name = node.type.name;
  if ((name === 'math_inline' || name === 'math_block') && math === 'katex') {
    const display = name === 'math_block';
    const latex = String(node.attrs['latex'] ?? '');
    const rendered = renderLatex(latex, display).html;
    if (rendered) {
      const tag = display ? 'div' : 'span';
      return `<${tag} data-type="${display ? 'math-block' : 'math-inline'}" data-latex="${escapeAttr(latex)}" class="${display ? 'ax-math ax-math--block' : 'ax-math'}">${rendered}</${tag}>`;
    }
  }
  const toDOM = node.type.spec.toDOM;
  if (!toDOM) return renderContent(node, math);
  const html = specToString(toDOM(node));
  return html.includes(HOLE) ? html.replace(HOLE, renderContent(node, math)) : html;
}

/** Children with their marks, merging runs of the same marks like the editor does. */
function renderContent(node: PMNode, math: 'katex' | 'latex'): string {
  let out = '';
  const open: { mark: Mark; close: string }[] = [];
  node.forEach((child) => {
    const marks = child.marks;
    let keep = 0;
    while (keep < open.length && keep < marks.length) {
      const current = open[keep];
      const next = marks[keep];
      if (!current || !next || !current.mark.eq(next)) break;
      keep++;
    }
    while (open.length > keep) out += open.pop()?.close ?? '';
    for (const mark of marks.slice(keep)) {
      const [start, end] = markWrapper(mark);
      out += start;
      open.push({ mark, close: end });
    }
    out += renderNode(child, math);
  });
  while (open.length) out += open.pop()?.close ?? '';
  return out;
}

/**
 * The document as HTML, the same as `editor.getHTML()` in the browser (with marks, comments,
 * pages and pre-rendered equations). Style it with `axiomtext/content.css`.
 */
export async function renderHTML(
  json: DocumentJSON,
  options: RenderHTMLOptions = {},
): Promise<string> {
  const math = options.math ?? 'katex';
  if (math === 'katex') await loadKatex();
  const schema = buildSchema(options.plugins ?? ALL_PLUGINS, {
    ...(options.markTypes ? { marks: { types: options.markTypes } } : {}),
  });
  const doc = PMNode.fromJSON(schema, migrateDocument(json).doc);
  const previous = getLanguage().locale;
  if (options.language) setLanguage(options.language, options.translations);
  try {
    return renderContent(doc, math);
  } finally {
    if (options.language) setLanguage(previous);
  }
}

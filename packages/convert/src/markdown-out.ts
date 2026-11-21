import type { DocumentJSON, NodeJSON } from '@axiomtext/core';

export interface ToMarkdownOptions {
  /**
   * Use inline HTML for things Markdown can't express (underline, sub/superscript, highlight,
   * image size and wrapping). Default false: plain Markdown, those details are dropped.
   */
  html?: boolean;
}

type Mark = NonNullable<NodeJSON['marks']>[number];

/** Outermost first, so links wrap formatting and code is innermost. */
const MARK_ORDER = [
  'link',
  'bold',
  'italic',
  'strikethrough',
  'underline',
  'highlight',
  'subscript',
  'superscript',
  'code',
];

const attr = (node: { attrs?: Record<string, unknown> }, name: string): unknown =>
  node.attrs?.[name];

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Escapes characters that would otherwise start Markdown syntax. */
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]<>~|$])/g, '\\$1');
}

const escapeLineStart = (line: string): string =>
  line
    .replace(/^(\s*)([#>+-])(?=\s|$)/, '$1\\$2')
    .replace(/^(\s*)(\d+)([.)])(?=\s)/, '$1$2\\$3')
    .replace(/^(\s*)(={3,}|-{3,})\s*$/, '$1\\$2');

const urlFor = (href: string): string =>
  /[\s()<>]/.test(href) ? `<${href.replace(/[<>]/g, encodeURIComponent)}>` : href;

function markDelims(mark: Mark, html: boolean): [string, string] | null {
  switch (mark.type) {
    case 'bold':
      return ['**', '**'];
    case 'italic':
      return ['*', '*'];
    case 'strikethrough':
      return ['~~', '~~'];
    case 'code':
      return ['`', '`'];
    case 'link': {
      const href = String(attr(mark, 'href') ?? '');
      return ['[', `](${urlFor(href)})`];
    }
    case 'underline':
      return html ? ['<u>', '</u>'] : null;
    case 'highlight':
      return html ? ['<mark>', '</mark>'] : null;
    case 'subscript':
      return html ? ['<sub>', '</sub>'] : null;
    case 'superscript':
      return html ? ['<sup>', '</sup>'] : null;
    default:
      return null; // font, size, color: no Markdown equivalent
  }
}

const sameMark = (a: Mark, b: Mark): boolean =>
  a.type === b.type && JSON.stringify(a.attrs ?? {}) === JSON.stringify(b.attrs ?? {});

/** Serializes inline content, keeping marks open across neighbouring text nodes. */
function inline(nodes: readonly NodeJSON[] | undefined, opts: Required<ToMarkdownOptions>): string {
  let out = '';
  const open: Mark[] = [];
  /** Closes marks down to `keep`, moving trailing spaces outside (`**a **` isn't bold). */
  const closeTo = (keep: number): void => {
    if (open.length <= keep) return;
    const ws = /\s+$/.exec(out)?.[0] ?? '';
    if (ws) out = out.slice(0, -ws.length);
    while (open.length > keep) {
      const mark = open.pop();
      const d = mark && markDelims(mark, opts.html);
      if (d) out += d[1];
    }
    out += ws;
  };
  for (const node of nodes ?? []) {
    const marks = [...(node.marks ?? [])]
      .filter((m) => markDelims(m, opts.html))
      .sort((a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type));
    let content =
      node.type === 'text'
        ? marks.some((m) => m.type === 'code')
          ? (node.text ?? '')
          : escapeMarkdown(node.text ?? '')
        : inlineNode(node, opts);
    let common = 0;
    while (
      common < open.length &&
      common < marks.length &&
      sameMark(open[common] as Mark, marks[common] as Mark)
    )
      common++;
    closeTo(common);
    if (marks.length > common) {
      // Leading spaces go before the opening delimiters.
      const lead = /^\s+/.exec(content)?.[0] ?? '';
      out += lead;
      content = content.slice(lead.length);
      for (const mark of marks.slice(common)) {
        const d = markDelims(mark, opts.html);
        if (d) out += d[0];
        open.push(mark);
      }
    }
    out += content;
  }
  closeTo(0);
  return out;
}

function inlineNode(node: NodeJSON, opts: Required<ToMarkdownOptions>): string {
  switch (node.type) {
    case 'hard_break':
      return '\\\n';
    case 'math_inline':
      return `$${String(attr(node, 'latex') ?? '')}$`;
    case 'image': {
      const src = String(attr(node, 'src') ?? '');
      const alt = String(attr(node, 'alt') ?? '');
      const caption = String(attr(node, 'caption') ?? '');
      const width = attr(node, 'width');
      const wrap = String(attr(node, 'wrap') ?? 'inline');
      if (opts.html && (width || wrap !== 'inline')) {
        const style = width ? ` style="width: ${Number(width)}%;"` : '';
        return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" data-wrap="${escapeHtml(wrap)}"${style}>`;
      }
      const title = caption ? ` "${caption.replace(/"/g, '\\"')}"` : '';
      return `![${escapeMarkdown(alt)}](${urlFor(src)}${title})`;
    }
    default:
      return inline(node.content, opts);
  }
}

const indent = (text: string, prefix: string, first = prefix): string =>
  text
    .split('\n')
    .map((line, i) => (line === '' ? line : (i === 0 ? first : prefix) + line))
    .join('\n');

function tableCell(cell: NodeJSON, opts: Required<ToMarkdownOptions>): string {
  return (cell.content ?? [])
    .map((block) => inline(block.content, opts))
    .join('<br>')
    .replace(/\n/g, ' ')
    .replace(/(?<!\\)\|/g, '\\|');
}

function block(node: NodeJSON, opts: Required<ToMarkdownOptions>): string {
  switch (node.type) {
    case 'paragraph':
      return inline(node.content, opts)
        .split('\n')
        .map((line, i) => (i === 0 ? escapeLineStart(line) : line))
        .join('\n');
    case 'heading':
      return `${'#'.repeat(Math.min(6, Math.max(1, Number(attr(node, 'level') ?? 1))))} ${inline(node.content, opts)}`;
    case 'blockquote':
      return blocks(node.content, opts)
        .split('\n')
        .map((line) => (line ? `> ${line}` : '>'))
        .join('\n');
    case 'horizontal_rule':
      return '---';
    case 'page_break':
      return '<!-- page-break -->';
    case 'math_block':
      return `$$\n${String(attr(node, 'latex') ?? '')}\n$$`;
    case 'bullet_list':
    case 'task_list':
    case 'ordered_list': {
      const start = Number(attr(node, 'start') ?? 1);
      const isList = (n: NodeJSON): boolean => /_list$/.test(n.type);
      // Tight when each item is one paragraph plus nested lists (no blank lines needed).
      const tight = (node.content ?? []).every(
        (item) => (item.content ?? []).filter((c) => !isList(c)).length <= 1,
      );
      return (node.content ?? [])
        .map((item, i) => {
          let marker = node.type === 'ordered_list' ? `${start + i}. ` : '- ';
          if (item.type === 'task_item') marker += attr(item, 'checked') ? '[x] ' : '[ ] ';
          const body = tight
            ? (item.content ?? []).map((c) => block(c, opts)).join('\n')
            : blocks(item.content, opts);
          return indent(body, ' '.repeat(marker.length), marker);
        })
        .join(tight ? '\n' : '\n\n');
    }
    case 'table': {
      const rows = (node.content ?? []).map((row) =>
        (row.content ?? []).map((cell) => tableCell(cell, opts)),
      );
      const width = Math.max(...rows.map((r) => r.length), 1);
      const pad = (r: string[]): string[] => [...r, ...Array<string>(width - r.length).fill('')];
      const [head = [], ...body] = rows;
      return [
        `| ${pad(head).join(' | ')} |`,
        `|${' --- |'.repeat(width)}`,
        ...body.map((r) => `| ${pad(r).join(' | ')} |`),
      ].join('\n');
    }
    case 'columns':
      // Markdown has no columns: the parts follow each other.
      return (node.content ?? [])
        .map((col) => blocks(col.content, opts))
        .filter(Boolean)
        .join('\n\n');
    case 'image':
    case 'math_inline':
      return inlineNode(node, opts);
    default:
      return node.content ? blocks(node.content, opts) : '';
  }
}

function blocks(nodes: readonly NodeJSON[] | undefined, opts: Required<ToMarkdownOptions>): string {
  return (nodes ?? [])
    .map((n) => block(n, opts))
    .filter((s, i, all) => s !== '' || (i > 0 && i < all.length - 1))
    .join('\n\n');
}

/** Converts an AxiomText document (or any node JSON) to GitHub-flavoured Markdown. */
export function toMarkdown(doc: DocumentJSON | NodeJSON, options: ToMarkdownOptions = {}): string {
  const root = 'doc' in doc && typeof doc.doc === 'object' ? doc.doc : (doc as NodeJSON);
  const opts: Required<ToMarkdownOptions> = { html: options.html ?? false };
  return `${blocks(root.content, opts)
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;
}

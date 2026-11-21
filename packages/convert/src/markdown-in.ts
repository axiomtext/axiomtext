import type { DocumentJSON, NodeJSON } from '@axiomtext/core';
import MarkdownIt from 'markdown-it';
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';
import type Token from 'markdown-it/lib/token.mjs';

type Mark = NonNullable<NodeJSON['marks']>[number];

/** `$…$` inline math (not prices: `$5 and $10`). */
function mathInline(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  const start = state.pos;
  if (src[start] !== '$' || src[start + 1] === '$') return false;
  const next = src[start + 1];
  if (!next || /\s/.test(next)) return false;
  let end = start + 1;
  while ((end = src.indexOf('$', end)) !== -1) {
    if (src[end - 1] === '\\') {
      end++;
      continue;
    }
    break;
  }
  if (end === -1 || /\s/.test(src[end - 1] ?? '') || /\d/.test(src[end + 1] ?? '')) return false;
  if (!silent) {
    const token = state.push('math_inline', 'math', 0);
    token.content = src.slice(start + 1, end);
  }
  state.pos = end + 1;
  return true;
}

/** `$$ … $$` display math (one line or several). */
function mathBlock(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  let pos = (state.bMarks[startLine] ?? 0) + (state.tShift[startLine] ?? 0);
  let max = state.eMarks[startLine] ?? 0;
  if (state.src.slice(pos, pos + 2) !== '$$') return false;
  pos += 2;
  let first = state.src.slice(pos, max);
  let last = '';
  let line = startLine;
  let found = false;
  if (first.trim().endsWith('$$')) {
    first = first.trim().slice(0, -2);
    found = true;
  }
  if (silent) return true;
  while (!found) {
    line++;
    if (line >= endLine) break;
    pos = (state.bMarks[line] ?? 0) + (state.tShift[line] ?? 0);
    max = state.eMarks[line] ?? 0;
    const text = state.src.slice(pos, max);
    if (text.trim().endsWith('$$')) {
      last = text.trim().slice(0, -2);
      found = true;
    }
  }
  if (!found) return false;
  const body = [
    first,
    state.getLines(startLine + 1, line, state.tShift[startLine] ?? 0, true),
    last,
  ]
    .join('\n')
    .trim();
  state.line = line + 1;
  const token = state.push('math_block', 'math', 0);
  token.block = true;
  token.content = body;
  token.map = [startLine, state.line];
  return true;
}

const md = new MarkdownIt('commonmark', { html: false, linkify: true })
  .enable(['table', 'strikethrough', 'linkify'])
  .use((m) => {
    m.inline.ruler.after('escape', 'math_inline', mathInline);
    m.block.ruler.after('blockquote', 'math_block', mathBlock, {
      alt: ['paragraph', 'reference', 'blockquote', 'list'],
    });
  });

const MARK_FOR: Record<string, string> = {
  strong: 'bold',
  em: 'italic',
  s: 'strikethrough',
};

/** Converts inline tokens to text/inline nodes with marks. */
function inlineNodes(tokens: readonly Token[]): NodeJSON[] {
  const out: NodeJSON[] = [];
  const marks: Mark[] = [];
  const text = (value: string, extra: Mark[] = []): void => {
    if (!value) return;
    const all = [...marks, ...extra];
    const last = out.at(-1);
    if (last?.type === 'text' && JSON.stringify(last.marks ?? []) === JSON.stringify(all)) {
      last.text = (last.text ?? '') + value;
      return;
    }
    out.push(
      all.length ? { type: 'text', text: value, marks: all } : { type: 'text', text: value },
    );
  };
  for (const token of tokens) {
    const base = token.type.replace(/_(open|close)$/, '');
    if (token.type.endsWith('_open') && (MARK_FOR[base] || base === 'link')) {
      marks.push(
        base === 'link'
          ? { type: 'link', attrs: { href: token.attrGet('href') ?? '' } }
          : { type: MARK_FOR[base] as string },
      );
      continue;
    }
    if (token.type.endsWith('_close') && (MARK_FOR[base] || base === 'link')) {
      const name = base === 'link' ? 'link' : MARK_FOR[base];
      const index = marks.map((m) => m.type).lastIndexOf(name as string);
      if (index !== -1) marks.splice(index, 1);
      continue;
    }
    switch (token.type) {
      case 'text':
      case 'html_inline':
        text(token.content);
        break;
      case 'code_inline':
        text(token.content, [{ type: 'code' }]);
        break;
      case 'softbreak':
        text(' ');
        break;
      case 'hardbreak':
        out.push({ type: 'hard_break' });
        break;
      case 'math_inline':
        out.push({ type: 'math_inline', attrs: { latex: token.content.trim() } });
        break;
      case 'image': {
        const alt = token.children?.map((c) => c.content).join('') ?? token.content;
        out.push({
          type: 'image',
          attrs: {
            src: token.attrGet('src') ?? '',
            alt,
            width: null,
            wrap: 'inline',
            caption: token.attrGet('title') ?? '',
          },
        });
        break;
      }
      default:
        if (token.content) text(token.content);
    }
  }
  return out;
}

const paragraph = (content: NodeJSON[]): NodeJSON =>
  content.length ? { type: 'paragraph', content } : { type: 'paragraph' };

/** A paragraph holding only an image breaks the text (centered), like in Markdown viewers. */
const blockImages = (p: NodeJSON): NodeJSON => {
  const only = p.content?.length === 1 ? p.content[0] : undefined;
  if (only?.type === 'image' && only.attrs) only.attrs['wrap'] = 'block';
  return p;
};

interface Frame {
  node: NodeJSON;
}

/** Parses Markdown (CommonMark + GFM tables, task lists, strikethrough, `$math$`) to a document. */
export function fromMarkdown(markdown: string): DocumentJSON {
  const tokens = md.parse(markdown, {});
  const root: NodeJSON = { type: 'doc', content: [] };
  const stack: Frame[] = [{ node: root }];
  const top = (): NodeJSON => (stack.at(-1) as Frame).node;
  const push = (node: NodeJSON): void => {
    const parent = top();
    (parent.content ??= []).push(node);
  };
  const enter = (node: NodeJSON): void => {
    push(node);
    stack.push({ node });
  };
  const leave = (): void => {
    stack.pop();
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] as Token;
    switch (token.type) {
      case 'paragraph_open': {
        const inlineToken = tokens[i + 1];
        let content = inlineNodes(inlineToken?.children ?? []);
        // GitHub task list item: "[ ] " / "[x] " at the start of a list item's first paragraph.
        const parent = top();
        const first = content[0];
        if (
          parent.type === 'list_item' &&
          (parent.content?.length ?? 0) === 0 &&
          first?.type === 'text' &&
          /^\[[ xX]\]\s/.test(first.text ?? '')
        ) {
          parent.type = 'task_item';
          parent.attrs = { checked: /^\[[xX]\]/.test(first.text ?? '') };
          first.text = (first.text ?? '').slice(4);
          if (!first.text) content = content.slice(1);
        }
        push(blockImages(paragraph(content)));
        i += 2; // inline + paragraph_close
        break;
      }
      case 'heading_open': {
        const level = Number(token.tag.slice(1));
        push({
          type: 'heading',
          attrs: { level },
          content: inlineNodes(tokens[i + 1]?.children ?? []),
        });
        i += 2;
        break;
      }
      case 'blockquote_open':
        enter({ type: 'blockquote', content: [] });
        break;
      case 'bullet_list_open':
        enter({ type: 'bullet_list', content: [] });
        break;
      case 'ordered_list_open':
        enter({
          type: 'ordered_list',
          attrs: { start: Number(token.attrGet('start') ?? 1) },
          content: [],
        });
        break;
      case 'list_item_open':
        enter({ type: 'list_item', content: [] });
        break;
      case 'blockquote_close':
      case 'list_item_close':
        leave();
        break;
      case 'bullet_list_close':
      case 'ordered_list_close': {
        const list = top();
        leave();
        // A list whose items are all tasks becomes a to-do list.
        const items = list.content ?? [];
        if (items.length && items.every((it) => it.type === 'task_item')) list.type = 'task_list';
        else
          for (const it of items)
            if (it.type === 'task_item') {
              it.type = 'list_item';
              delete it.attrs;
            }
        for (const it of items) if (!it.content?.length) it.content = [paragraph([])];
        break;
      }
      case 'hr':
        push({ type: 'horizontal_rule' });
        break;
      case 'math_block':
        push({ type: 'math_block', attrs: { latex: token.content } });
        break;
      case 'fence':
      case 'code_block': {
        // No code-block node yet (M2): keep each line as monospace text.
        const lines = token.content.replace(/\n$/, '').split('\n');
        push({
          type: 'paragraph',
          content: lines.flatMap((line, n): NodeJSON[] => [
            ...(n > 0 ? [{ type: 'hard_break' }] : []),
            ...(line ? [{ type: 'text', text: line, marks: [{ type: 'code' }] }] : []),
          ]),
        });
        break;
      }
      case 'html_block':
        if (token.content.includes('page-break')) push({ type: 'page_break' });
        else push(paragraph([{ type: 'text', text: token.content.trim() }]));
        break;
      case 'table_open':
        enter({ type: 'table', content: [] });
        break;
      case 'tr_open':
        enter({ type: 'table_row', content: [] });
        break;
      case 'th_open':
      case 'td_open': {
        const content = inlineNodes(tokens[i + 1]?.children ?? []);
        push({
          type: token.type === 'th_open' ? 'table_header' : 'table_cell',
          content: [paragraph(content)],
        });
        i += 2;
        break;
      }
      case 'tr_close':
      case 'table_close':
        leave();
        break;
      default:
        break; // thead/tbody wrappers, inline handled above
    }
  }
  if (!root.content?.length) root.content = [paragraph([])];
  return { version: 1, doc: root as NodeJSON & { type: 'doc' } };
}

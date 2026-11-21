/**
 * @axiomtext/convert — client-side conversion.
 *
 * Markdown (CNV-003):
 *   import { toMarkdown, fromMarkdown } from '@axiomtext/convert';
 *   const md = toMarkdown(editor.getJSON());
 *   editor.setJSON(fromMarkdown(md));
 */
export { toMarkdown, escapeMarkdown } from './markdown-out';
export type { ToMarkdownOptions } from './markdown-out';
export { fromMarkdown } from './markdown-in';

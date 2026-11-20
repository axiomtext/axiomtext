import type { DocumentJSON, NodeJSON } from '@axiomtext/core';

/** Builds a document from blocks: `doc(p('Hello'), h(2, 'Title'))`. */
export function doc(...content: NodeJSON[]): DocumentJSON {
  return { version: 1, doc: { type: 'doc', content } };
}

export function p(...text: string[]): NodeJSON {
  return text.length === 0
    ? { type: 'paragraph' }
    : { type: 'paragraph', content: text.map((t) => ({ type: 'text', text: t })) };
}

export function h(level: number, text: string): NodeJSON {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] };
}

/** Creates and attaches a container element for mounting an editor in tests. */
export function mountPoint(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

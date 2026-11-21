/**
 * Text anchoring for reader highlights, after the W3C Web Annotation model as used by
 * Hypothesis: a highlight stores the quoted text with some context (TextQuoteSelector) and its
 * position (TextPositionSelector). The position finds it fast; the quote and context find it
 * again when the text around it has changed.
 */

/** Where a highlight sits in the text. */
export interface TextAnchor {
  /** The highlighted text. */
  exact: string;
  /** Up to 32 characters before it. */
  prefix: string;
  /** Up to 32 characters after it. */
  suffix: string;
  /** Character offsets in the element's text. */
  start: number;
  end: number;
}

const CONTEXT = 32;

/** Text that isn't part of the readable text (hidden MathML copies of equations, scripts). */
const SKIP =
  '.katex-mathml, script, style, noscript, template, .ax-legend, .ax-fold, .ax-mark-badge, [aria-hidden="true"]:not(.katex-html)';

/** The element's readable text as one string, with a map back to its text nodes. */
export interface TextModel {
  text: string;
  nodes: { node: Text; start: number }[];
}

export function textModel(root: Element): TextModel {
  const nodes: { node: Text; start: number }[] = [];
  let text = '';
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = (node as Text).data;
    if (!value) continue;
    nodes.push({ node: node as Text, start: text.length });
    text += value;
  }
  return { text, nodes };
}

/** Character offset of a DOM point in the model, or null when it's outside the text. */
export function offsetOf(model: TextModel, container: Node, offset: number): number | null {
  if (container.nodeType === Node.TEXT_NODE) {
    const entry = model.nodes.find((n) => n.node === container);
    return entry ? entry.start + Math.min(offset, entry.node.data.length) : null;
  }
  // An element point: the first text node at or after it.
  const target = container.childNodes[offset] ?? null;
  for (const entry of model.nodes) {
    if (target === null) {
      if (container.contains(entry.node)) continue;
    } else if (
      target === entry.node ||
      target.contains(entry.node) ||
      target.compareDocumentPosition(entry.node) & Node.DOCUMENT_POSITION_FOLLOWING
    ) {
      return entry.start;
    }
  }
  if (target === null) {
    // After the element's last text: the end of its text.
    let last: { node: Text; start: number } | undefined;
    for (const entry of model.nodes) if (container.contains(entry.node)) last = entry;
    if (last) return last.start + last.node.data.length;
  }
  return model.text.length;
}

/** The DOM range for character offsets. */
export function rangeOf(model: TextModel, start: number, end: number): Range | null {
  const find = (pos: number, isEnd: boolean): { node: Text; offset: number } | null => {
    for (let i = 0; i < model.nodes.length; i++) {
      const entry = model.nodes[i];
      if (!entry) continue;
      const stop = entry.start + entry.node.data.length;
      // An end exactly at a node boundary stays in the earlier node.
      if (isEnd ? pos <= stop : pos < stop) return { node: entry.node, offset: pos - entry.start };
    }
    const last = model.nodes.at(-1);
    return last ? { node: last.node, offset: last.node.data.length } : null;
  };
  const a = find(start, false);
  const b = find(end, true);
  if (!a || !b) return null;
  const range = a.node.ownerDocument.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  return range;
}

/** Describes a selection (character offsets) as an anchor. */
export function describe(text: string, start: number, end: number): TextAnchor {
  return {
    exact: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
    start,
    end,
  };
}

/** Length of the common ending of a and b. */
const commonSuffix = (a: string, b: string): number => {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
};
/** Length of the common beginning of a and b. */
const commonPrefix = (a: string, b: string): number => {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
};

/**
 * Finds an anchor in (possibly changed) text. Returns character offsets, or null when the quoted
 * text is no longer there (the highlight is then "orphaned" and shown only in the notebook).
 */
export function anchor(text: string, a: TextAnchor): { start: number; end: number } | null {
  if (!a.exact) return null;
  // 1. Unchanged text: the stored position still holds the quote.
  if (text.slice(a.start, a.end) === a.exact) return { start: a.start, end: a.end };
  // 2. The quote moved: pick the occurrence whose context matches best, then the closest one.
  let best: { start: number; score: number; distance: number } | null = null;
  for (let i = text.indexOf(a.exact); i !== -1; i = text.indexOf(a.exact, i + 1)) {
    const before = text.slice(Math.max(0, i - a.prefix.length), i);
    const after = text.slice(i + a.exact.length, i + a.exact.length + a.suffix.length);
    const score = commonSuffix(before, a.prefix) + commonPrefix(after, a.suffix);
    const distance = Math.abs(i - a.start);
    if (!best || score > best.score || (score === best.score && distance < best.distance)) {
      best = { start: i, score, distance };
    }
  }
  if (best) return { start: best.start, end: best.start + a.exact.length };
  // 3. The quote itself was edited: if the context is still there, anchor between it when the
  //    text in between is about the same length (small edits inside the highlight).
  if (a.prefix.length >= 8 && a.suffix.length >= 8) {
    const p = text.indexOf(a.prefix);
    if (p !== -1) {
      const from = p + a.prefix.length;
      const s = text.indexOf(a.suffix, from);
      if (s !== -1 && Math.abs(s - from - a.exact.length) <= Math.max(4, a.exact.length * 0.3)) {
        return { start: from, end: s };
      }
    }
  }
  return null;
}

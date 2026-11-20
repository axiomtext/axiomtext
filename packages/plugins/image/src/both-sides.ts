/**
 * "Text on both sides": an image centered between two text columns.
 *
 * A single paragraph cannot flow text on both sides of an image in a browser, so the image's
 * paragraph becomes a three-column layout: text before the image | image | text after it.
 * It is ordinary HTML + CSS grid, so websites render it with content.css alone.
 * Needs the columns plugin (`columns` / `column` nodes); otherwise the option is unavailable.
 */
import { Fragment } from 'prosemirror-model';
import type { Node as PMNode } from 'prosemirror-model';
import { NodeSelection } from 'prosemirror-state';
import type { EditorState, Transaction } from 'prosemirror-state';

const DEFAULT_CENTER_WIDTH = 40;

export const centerWidths = (center: number): number[] => {
  const mid = Math.max(10, Math.min(80, Math.round(center)));
  const side = (100 - mid) / 2;
  return [side, mid, side];
};

/** The image-center layout that contains `pos`, if any. */
export function imageLayoutAt(
  state: EditorState,
  pos: number,
): { node: PMNode; pos: number } | null {
  const $pos = state.doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === 'columns') {
      return node.attrs['layout'] === 'image-center' && node.childCount === 3
        ? { node, pos: $pos.before(depth) }
        : null;
    }
  }
  return null;
}

const insideColumns = (state: EditorState, pos: number): boolean => {
  const $pos = state.doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type.name === 'columns') return true;
  }
  return false;
};

/** Removes spaces at one edge of inline content ("Hello |img| world" → "Hello" / "world"). */
const trimEdge = (content: Fragment, edge: 'start' | 'end'): Fragment => {
  const child = edge === 'start' ? content.firstChild : content.lastChild;
  if (!child?.isText || !child.text) return content;
  const text = edge === 'start' ? child.text.replace(/^\s+/, '') : child.text.replace(/\s+$/, '');
  if (text === child.text) return content;
  const nodes: PMNode[] = [];
  content.forEach((n) => nodes.push(n));
  const index = edge === 'start' ? 0 : nodes.length - 1;
  if (text) nodes[index] = child.type.schema.text(text, child.marks);
  else nodes.splice(index, 1);
  return Fragment.from(nodes);
};

/**
 * When all the text is on one side of the image, split it at the sentence end nearest the
 * middle so both sides start with text (the user can move it freely afterwards).
 */
const balance = (content: Fragment): [Fragment, Fragment] | null => {
  const ends: number[] = [];
  content.forEach((node, offset) => {
    if (!node.isText || !node.text) return;
    for (const match of node.text.matchAll(/[.!?…](\s+)/g)) {
      ends.push(offset + (match.index ?? 0) + match[0].length);
    }
  });
  const half = content.size / 2;
  const cut = ends
    .filter((e) => e > content.size * 0.2 && e < content.size * 0.8)
    .sort((a, b) => Math.abs(a - half) - Math.abs(b - half))[0];
  if (cut === undefined) return null;
  return [trimEdge(content.cut(0, cut), 'end'), trimEdge(content.cut(cut), 'start')];
};

/** Can the image at `pos` be put between two text columns? */
export function canWrapBothSides(state: EditorState, pos: number): boolean {
  const { columns, column } = state.schema.nodes;
  if (!columns || !column) return false;
  if (imageLayoutAt(state, pos)) return true; // already there
  if (insideColumns(state, pos)) return false; // no layouts inside layouts
  const $pos = state.doc.resolve(pos);
  if (!$pos.parent.isTextblock || $pos.depth < 1) return false;
  const container = $pos.node($pos.depth - 1);
  const index = $pos.index($pos.depth - 1);
  return container.canReplaceWith(index, index + 1, columns);
}

/** Turns the image's paragraph into: text before | image | text after. */
export function wrapBothSides(
  state: EditorState,
  pos: number,
  attrs: Record<string, unknown>,
): Transaction | null {
  const { columns, column } = state.schema.nodes;
  if (!columns || !column || !canWrapBothSides(state, pos)) return null;
  const image = state.doc.nodeAt(pos);
  if (!image) return null;
  const existing = imageLayoutAt(state, pos);
  if (existing) {
    const tr = state.tr.setNodeMarkup(pos, undefined, { ...attrs, wrap: 'both' });
    return tr.setSelection(NodeSelection.create(tr.doc, pos));
  }
  const $pos = state.doc.resolve(pos);
  const para = $pos.parent;
  const offset = $pos.parentOffset;
  let before = trimEdge(para.content.cut(0, offset), 'end');
  let after = trimEdge(para.content.cut(offset + image.nodeSize), 'start');
  if (before.size === 0 || after.size === 0) {
    const split = balance(before.size === 0 ? after : before);
    if (split) [before, after] = split;
  }
  const width = typeof attrs['width'] === 'number' ? attrs['width'] : DEFAULT_CENTER_WIDTH;
  const moved = image.type.create({ ...attrs, wrap: 'both', width: null });
  const left = column.create(null, para.type.create(para.attrs, before));
  const middle = column.create(null, para.type.create(null, moved));
  const right = column.create(null, para.type.create(para.attrs, after));
  const layout = columns.create(
    { layout: 'image-center', widths: centerWidths(Math.max(20, Math.min(60, width))) },
    [left, middle, right],
  );
  const start = $pos.before();
  const tr = state.tr.replaceWith(start, $pos.after(), layout);
  // columns > left column > … then middle column > paragraph > image
  const imagePos = start + 1 + left.nodeSize + 1 + 1;
  return tr.setSelection(NodeSelection.create(tr.doc, imagePos)).scrollIntoView();
}

/**
 * Takes the image out of its layout with a new wrap mode, joining the text back together:
 * left text + image + right text become one paragraph again.
 */
export function unwrapBothSides(
  state: EditorState,
  pos: number,
  attrs: Record<string, unknown>,
): Transaction | null {
  const layout = imageLayoutAt(state, pos);
  const image = state.doc.nodeAt(pos);
  if (!layout || !image) return null;
  const [left, middle, right] = [0, 1, 2].map((i) => layout.node.child(i)) as [
    PMNode,
    PMNode,
    PMNode,
  ];
  const $pos = state.doc.resolve(pos);
  const imagePara = $pos.parent;
  const updated = image.type.create(attrs, null, image.marks);

  const leftBlocks: PMNode[] = [];
  left.forEach((b) => leftBlocks.push(b));
  const rightBlocks: PMNode[] = [];
  right.forEach((b) => rightBlocks.push(b));
  const lastLeft = leftBlocks.at(-1);
  const firstRight = rightBlocks[0];
  const joinLeft = lastLeft?.isTextblock ? leftBlocks.pop() : undefined;
  const joinRight = firstRight?.isTextblock ? rightBlocks.shift() : undefined;

  const schema = state.schema;
  const pieces: PMNode[] = [];
  const add = (frag: Fragment | undefined): void => {
    if (!frag || frag.size === 0) return;
    const last = pieces.at(-1);
    const first = frag.firstChild;
    const needsSpace =
      last &&
      !(last.isText && /\s$/.test(last.text ?? '')) &&
      !(first?.isText && /^\s/.test(first.text ?? ''));
    if (needsSpace) pieces.push(schema.text(' '));
    frag.forEach((n) => pieces.push(n));
  };
  add(joinLeft?.content);
  // The image paragraph, with the image swapped for its updated version.
  const middleContent: PMNode[] = [];
  imagePara.forEach((n) => middleContent.push(n === image ? updated : n));
  add(Fragment.from(middleContent));
  add(joinRight?.content);

  const paraType = (joinLeft ?? imagePara).type;
  const merged = paraType.create((joinLeft ?? joinRight ?? imagePara).attrs, pieces);
  const otherMiddle: PMNode[] = [];
  middle.forEach((b) => {
    if (b !== imagePara) otherMiddle.push(b);
  });
  const blocks = [...leftBlocks, merged, ...otherMiddle, ...rightBlocks];
  const tr = state.tr.replaceWith(layout.pos, layout.pos + layout.node.nodeSize, blocks);
  let found = -1;
  tr.doc.nodesBetween(layout.pos, tr.mapping.map(layout.pos + layout.node.nodeSize), (n, p) => {
    if (n === updated) found = p;
    return found < 0;
  });
  if (found >= 0) tr.setSelection(NodeSelection.create(tr.doc, found));
  return tr.scrollIntoView();
}

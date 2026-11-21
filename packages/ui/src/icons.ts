import { trustedHTML } from '@axiomtext/core';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Ellipsis,
  Highlighter,
  PenLine,
  MessageSquarePlus,
  MessagesSquare,
  CircleCheck,
  RotateCcw,
  NotebookPen,
  BookOpenText,
  Eraser,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  PanelTop,
  ScissorsLineDashed,
  Table as TableIcon,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
  Upload,
  X,
  RectangleHorizontal,
  Bold,
  ExternalLink,
  Link,
  List,
  ListOrdered,
  ListTodo,
  Pencil,
  Quote,
  RemoveFormatting,
  SeparatorHorizontal,
  Sigma,
  SquareSigma,
  Subscript,
  Superscript,
  Unlink,
  Check,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  Keyboard,
  Pilcrow,
  Plus,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  createElement,
} from 'lucide';

/** Icons are from Lucide (ISC license, https://lucide.dev). */
const icons = {
  bold: Bold,
  italic: Italic,
  underline: Underline,
  strikethrough: Strikethrough,
  code: Code,
  undo: Undo2,
  redo: Redo2,
  chevronDown: ChevronDown,
  check: Check,
  paragraph: Pilcrow,
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  heading4: Heading4,
  link: Link,
  unlink: Unlink,
  externalLink: ExternalLink,
  pencil: Pencil,
  bulletedList: List,
  numberedList: ListOrdered,
  todoList: ListTodo,
  quote: Quote,
  horizontalRule: SeparatorHorizontal,
  math: Sigma,
  mathBlock: SquareSigma,
  subscript: Subscript,
  superscript: Superscript,
  clearFormatting: RemoveFormatting,
  alignLeft: AlignLeft,
  alignCenter: AlignCenter,
  alignRight: AlignRight,
  alignJustify: AlignJustify,
  indent: IndentIncrease,
  outdent: IndentDecrease,
  textColor: Baseline,
  highlight: Highlighter,
  image: ImageIcon,
  upload: Upload,
  table: TableIcon,
  rowAbove: BetweenHorizontalStart,
  rowBelow: BetweenHorizontalEnd,
  colLeft: BetweenVerticalStart,
  colRight: BetweenVerticalEnd,
  merge: TableCellsMerge,
  split: TableCellsSplit,
  headerRow: PanelTop,
  trash: Trash2,
  pageBreak: ScissorsLineDashed,
  more: Ellipsis,
  close: X,
  keyboard: Keyboard,
  plus: Plus,
  fullWidth: RectangleHorizontal,
  comment: MessageSquarePlus,
  comments: MessagesSquare,
  resolve: CircleCheck,
  reopen: RotateCcw,
  edit: Pencil,
  note: NotebookPen,
  mark: PenLine,
  page: BookOpenText,
  eraser: Eraser,
} as const;

export type IconName = keyof typeof icons;

/** Creates an SVG icon element (decorative; the button carries the accessible name). */
const overrides = new Map<string, SVGElement>();

/** Removes anything executable from a user-supplied SVG icon. */
function cleanSvg(svg: SVGElement): SVGElement {
  svg
    .querySelectorAll('script, foreignObject, iframe, use[href^="http"]')
    .forEach((n) => n.remove());
  for (const el of [svg, ...svg.querySelectorAll('*')]) {
    for (const a of [...el.attributes]) {
      const value = a.value.trim().toLowerCase();
      if (
        a.name.startsWith('on') ||
        ((a.name === 'href' || a.name === 'xlink:href') && !value.startsWith('#'))
      )
        el.removeAttribute(a.name);
    }
  }
  return svg;
}

/**
 * Replaces built-in icons (UI-011) with your own: an `<svg>` element or SVG markup.
 * Scripts, event handlers and external links inside the SVG are removed.
 *
 *   setIcons({ bold: '<svg viewBox="0 0 24 24">…</svg>' });
 */
export function setIcons(map: Partial<Record<IconName | WrapIconName, SVGElement | string>>): void {
  for (const [name, value] of Object.entries(map)) {
    if (!value) continue;
    let svg: SVGElement | null = null;
    if (typeof value === 'string') {
      const doc = new DOMParser().parseFromString(trustedHTML(value), 'image/svg+xml');
      const root = doc.documentElement;
      if (root.localName === 'svg' && !doc.querySelector('parsererror'))
        svg = document.importNode(root, true) as unknown as SVGElement;
    } else {
      svg = value.cloneNode(true) as SVGElement;
    }
    if (svg) overrides.set(name, cleanSvg(svg));
  }
}

const fromOverride = (name: string, size: number): SVGElement | null => {
  const custom = overrides.get(name);
  if (!custom) return null;
  const svg = custom.cloneNode(true) as SVGElement;
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('ax-icon');
  return svg;
};

export function icon(name: IconName, size = 18): SVGElement {
  const custom = fromOverride(name, size);
  if (custom) return custom;
  const svg = createElement(icons[name], {
    width: size,
    height: size,
    'stroke-width': 2,
    'aria-hidden': 'true',
    focusable: 'false',
    class: 'ax-icon',
  });
  return svg;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
type Shape = ['path', string] | ['rect', number, number, number, number];

/** Layout icons for image text wrapping (drawn to match the Lucide style). */
const WRAP_ICONS: Record<string, Shape[]> = {
  wrapInline: [
    ['path', 'M3 5h18M3 19h18M3 12h3M18 12h3'],
    ['rect', 8, 8.5, 8, 7],
  ],
  wrapLeft: [
    ['rect', 3, 5, 8, 8],
    ['path', 'M14 6h7M14 10h7M14 14h7M3 18h18'],
  ],
  wrapRight: [
    ['rect', 13, 5, 8, 8],
    ['path', 'M3 6h7M3 10h7M3 14h7M3 18h18'],
  ],
  wrapBlock: [
    ['path', 'M3 4h18M3 20h18'],
    ['rect', 7, 8, 10, 8],
  ],
  wrapBoth: [
    ['rect', 8, 7, 8, 10],
    ['path', 'M2 7h3M2 12h3M2 17h3M19 7h3M19 12h3M19 17h3'],
  ],
  caption: [
    ['rect', 4, 4, 16, 11],
    ['path', 'M7 19h10'],
  ],
};

export type WrapIconName = keyof typeof WRAP_ICONS;

export function wrapIcon(name: WrapIconName, size = 18): SVGElement {
  const custom = fromOverride(name, size);
  if (custom) return custom;
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries({
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
    class: 'ax-icon',
  })) {
    svg.setAttribute(k, v);
  }
  for (const shape of WRAP_ICONS[name] ?? []) {
    const el = document.createElementNS(SVG_NS, shape[0]);
    if (shape[0] === 'path') el.setAttribute('d', shape[1]);
    else {
      const [, x, y, w, hgt] = shape;
      el.setAttribute('x', String(x));
      el.setAttribute('y', String(y));
      el.setAttribute('width', String(w));
      el.setAttribute('height', String(hgt));
      el.setAttribute('rx', '1.5');
    }
    svg.append(el);
  }
  return svg;
}

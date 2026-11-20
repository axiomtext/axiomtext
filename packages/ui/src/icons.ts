import {
  Bold,
  Check,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  Pilcrow,
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
} as const;

export type IconName = keyof typeof icons;

/** Creates an SVG icon element (decorative; the button carries the accessible name). */
export function icon(name: IconName, size = 18): SVGElement {
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

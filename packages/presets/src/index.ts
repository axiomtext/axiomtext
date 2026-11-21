/**
 * @axiomtext/presets — ready-made editors with every free feature included.
 *
 *   import { createClassicEditor } from '@axiomtext/presets';
 *   import '@axiomtext/ui/styles.css';
 *   import 'katex/dist/katex.min.css';
 *   const { editor } = createClassicEditor({ element: document.querySelector('#editor')! });
 */
import type { AxiomPlugin } from '@axiomtext/core';
import { MathPlugin } from '@axiomtext/math';
import { BasicStyles } from '@axiomtext/plugin-basic-styles';
import { Indent, TextAlignment } from '@axiomtext/plugin-block-format';
import { Blockquote, PageBreak } from '@axiomtext/plugin-blockquote';
import { Columns } from '@axiomtext/plugin-columns';
import { FontFamily, FontSize, Highlight, TextColor } from '@axiomtext/plugin-font';
import { Heading } from '@axiomtext/plugin-heading';
import { Image } from '@axiomtext/plugin-image';
import { Link } from '@axiomtext/plugin-link';
import { List } from '@axiomtext/plugin-list';
import { Table } from '@axiomtext/plugin-table';
import {
  createBalloonEditor as balloon,
  createClassicEditor as classic,
  createInlineEditor as inline,
} from '@axiomtext/ui';
import type {
  ClassicEditor,
  ClassicEditorOptions,
  FloatingEditor,
  FloatingEditorOptions,
} from '@axiomtext/ui';

/** Every feature plugin, in a sensible order. */
export const ALL_PLUGINS: readonly AxiomPlugin[] = [
  BasicStyles,
  Heading,
  List,
  Blockquote,
  PageBreak,
  Link,
  MathPlugin,
  Table,
  Image,
  Columns,
  FontFamily,
  FontSize,
  TextColor,
  Highlight,
  TextAlignment,
  Indent,
];

type WithPlugins<T> = Omit<T, 'plugins'> & { plugins?: readonly AxiomPlugin[] };

/** Classic editor (fixed toolbar, status bar) with all features. */
export const createClassicEditor = (options: WithPlugins<ClassicEditorOptions>): ClassicEditor =>
  classic({ ...options, plugins: options.plugins ?? ALL_PLUGINS });

/** Inline editor (toolbar floats above the element while editing) with all features. */
export const createInlineEditor = (options: WithPlugins<FloatingEditorOptions>): FloatingEditor =>
  inline({ ...options, plugins: options.plugins ?? ALL_PLUGINS });

/** Balloon editor (toolbar next to selected text, "+" on empty lines) with all features. */
export const createBalloonEditor = (options: WithPlugins<FloatingEditorOptions>): FloatingEditor =>
  balloon({ ...options, plugins: options.plugins ?? ALL_PLUGINS });

export { toMarkdown, fromMarkdown } from '@axiomtext/convert';
export { setLanguage, setIcons, DEFAULT_TOOLBAR, BALLOON_TOOLBAR } from '@axiomtext/ui';
export type {
  ClassicEditor,
  ClassicEditorOptions,
  FloatingEditor,
  FloatingEditorOptions,
  Messages,
} from '@axiomtext/ui';
export type { Editor } from '@axiomtext/view';
export type { DocumentJSON } from '@axiomtext/core';

/**
 * AxiomText: a free rich text editor with a visual math editor built in.
 *
 *   import { createClassicEditor } from 'axiomtext';
 *   import 'axiomtext/styles.css';
 *
 *   const { editor } = createClassicEditor({ element: document.querySelector('#editor')! });
 *
 * Everything lives in this one package. Features you don't use are dropped by your bundler,
 * and the heavy parts (the visual math editor, Markdown, languages) load only when needed.
 */
import type { AxiomPlugin } from '@axiomtext/core';
import { ALL_PLUGINS } from './plugins';
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

export { ALL_PLUGINS } from './plugins';

type WithPlugins<T> = Omit<T, 'plugins'> & { plugins?: readonly AxiomPlugin[] };

/** Classic editor (fixed toolbar, status bar). Has every feature unless you pass `plugins`. */
export const createClassicEditor = (options: WithPlugins<ClassicEditorOptions>): ClassicEditor =>
  classic({ ...options, plugins: options.plugins ?? ALL_PLUGINS });

/** Inline editor (toolbar floats above the element while editing). */
export const createInlineEditor = (options: WithPlugins<FloatingEditorOptions>): FloatingEditor =>
  inline({ ...options, plugins: options.plugins ?? ALL_PLUGINS });

/** Balloon editor (toolbar next to selected text, "+" on empty lines). */
export const createBalloonEditor = (options: WithPlugins<FloatingEditorOptions>): FloatingEditor =>
  balloon({ ...options, plugins: options.plugins ?? ALL_PLUGINS });

export type {
  ClassicEditor,
  ClassicEditorOptions,
  FloatingEditor,
  FloatingEditorOptions,
} from '@axiomtext/ui';

// ── Feature plugins and their commands, to build an editor with only some features ──
export * from '@axiomtext/plugin-basic-styles';
export * from '@axiomtext/plugin-heading';
export * from '@axiomtext/plugin-list';
export * from '@axiomtext/plugin-blockquote';
export * from '@axiomtext/plugin-link';
export * from '@axiomtext/plugin-table';
export * from '@axiomtext/plugin-image';
export * from '@axiomtext/plugin-columns';
export * from '@axiomtext/plugin-font';
export * from '@axiomtext/plugin-block-format';
export * from '@axiomtext/plugin-comments';
export * from '@axiomtext/plugin-marks';
export { BijoyPaste, convertBijoyHTML, convertSelectionFromBijoy } from '@axiomtext/plugin-bijoy';

// ── Math ──
export * from '@axiomtext/math';

// ── Documents and plugin authoring ──
export {
  AxiomError,
  DOCUMENT_VERSION,
  createEmptyDocument,
  isDocumentJSON,
  migrateDocument,
  definePlugin,
  sanitizeUrl,
  buildSchema,
} from '@axiomtext/core';
export type {
  AxiomErrorCode,
  AxiomPlugin,
  DocumentJSON,
  NodeJSON,
  MarkJSON,
  EditorCommand,
  CommandFactory,
} from '@axiomtext/core';

// ── Headless editor (no toolbar; bring your own UI) and saving ──
export {
  createEditor,
  countStats,
  createAutosave,
  loadDraft,
  cleanPastedHTML,
} from '@axiomtext/view';
export type {
  Editor,
  EditorEvent,
  EditorOptions,
  EditorStats,
  Autosave,
  AutosaveOptions,
  AutosaveStatus,
} from '@axiomtext/view';

// ── Interface: languages, icons, toolbar ──
export {
  setLanguage,
  getLanguage,
  setIcons,
  setImagePicker,
  t,
  DEFAULT_TOOLBAR,
  BALLOON_TOOLBAR,
  FONT_FAMILIES,
  FONT_SIZES,
  TEXT_COLORS,
  HIGHLIGHT_COLORS,
} from '@axiomtext/ui';
export type {
  Messages,
  ToolbarItemName,
  IconName,
  CommentsOptions,
  CommentsUI,
  MarksOptions,
} from '@axiomtext/ui';

// ── Readers' highlights (the viewer itself is `axiomtext/viewer`) ──
export type {
  ReaderHighlight,
  NotebookEntry,
  Viewer,
  ViewerOptions,
  SelectionActionEvent,
} from '@axiomtext/viewer';

// ── Markdown (about 40 KB gzip; dropped from your bundle if you don't use it) ──
export {
  toMarkdown,
  fromMarkdown,
  escapeMarkdown,
  convertBijoy,
  looksLikeBijoy,
  isBijoyFont,
} from '@axiomtext/convert';
export type { ToMarkdownOptions } from '@axiomtext/convert';

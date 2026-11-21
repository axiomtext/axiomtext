/**
 * The message protocol between the AxiomText editor engine (JavaScript, inside a WebView or
 * iframe) and a host app such as the Flutter SDK.
 *
 * - The host calls methods: `{ v, kind: 'call', id, method, params }`.
 * - The engine answers each call: `{ v, kind: 'result', id, ok, value | error }`.
 * - The engine sends events: `{ v, kind: 'event', name, data }`.
 *
 * Messages are plain JSON. Both sides accept only the method and event names listed here and
 * never evaluate strings as code (FLT-017). The Dart copy is
 * packages/flutter/lib/src/bridge/protocol.dart; a test keeps the two lists identical.
 */

export const PROTOCOL_VERSION = 1;

/** Methods the host may call. */
export const METHODS = [
  'init',
  'getJson',
  'getHtml',
  'getMarkdown',
  'getText',
  'getStats',
  'setJson',
  'setHtml',
  'setMarkdown',
  'execute',
  'canExecute',
  'undo',
  'redo',
  'focus',
  'blur',
  'setEditable',
  'insertHtml',
  'insertText',
  'insertImage',
  'insertMath',
  'setTheme',
  'setLanguage',
  'translate',
  'resolveUpload',
  'mathInsert',
  'mathCommand',
  'mathCommit',
  'mathCancel',
  'mathToggleLatex',
  'getComments',
  'addComment',
  'replyToComment',
  'resolveComment',
  'deleteCommentThread',
  'setCommentStyle',
  'openCommentComposer',
  'toggleCommentsPanel',
  'getHighlights',
  'setHighlights',
  'setMark',
  'removeMark',
  'setMarkData',
  'setMarkBadge',
  'getMarks',
  'getPages',
  'insertPage',
  'scrollToPage',
  'setMarkFilter',
  'setMarkStates',
  'getNotebook',
  'revealHighlight',
  'openPdf',
  'setPdfAnnotations',
  'getPdfAnnotations',
  'getPdfMarks',
  'pdfScrollToPage',
] as const;
export type Method = (typeof METHODS)[number];

/** Events the engine may send. */
export const EVENTS = [
  'ready',
  'change',
  'state',
  'focus',
  'blur',
  'height',
  'pickImage',
  'uploadImage',
  'linkTap',
  'mathEditStart',
  'mathEditChange',
  'mathEditEnd',
  'error',
  'commentsChange',
  'highlightsChange',
  'markTap',
  'selectionAction',
  'pdfChange',
] as const;
export type EventName = (typeof EVENTS)[number];

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface CallMessage {
  v: number;
  kind: 'call';
  id: number;
  method: Method;
  params?: Record<string, JsonValue>;
}
export interface ResultMessage {
  v: number;
  kind: 'result';
  id: number;
  ok: boolean;
  value?: JsonValue;
  error?: string;
}
export interface EventMessage {
  v: number;
  kind: 'event';
  name: EventName;
  data?: Record<string, JsonValue>;
}
export type BridgeMessage = CallMessage | ResultMessage | EventMessage;

/** Theme sent by the host: light or dark plus optional `--ax-*` CSS variable overrides. */
export interface ThemeParams {
  dark: boolean;
  /** e.g. `{ "accent": "#6750a4", "font": "Roboto, sans-serif" }` for `--ax-accent`, `--ax-font`. */
  vars?: Record<string, string>;
}

export interface InitParams {
  /** Starting content: one of these. */
  json?: JsonValue;
  html?: string;
  markdown?: string;
  placeholder?: string;
  editable?: boolean;
  /** `web`: the editor's own toolbar. `none`: the host shows its own (native) toolbar. */
  toolbar?: 'web' | 'none';
  /** Toolbar buttons for the web toolbar (names as in ToolbarItemName). */
  toolbarItems?: string[];
  language?: string;
  translations?: Record<string, string>;
  theme?: ThemeParams;
  autofocus?: boolean;
  /** The host picks images (photo library, camera) when the image button is used. */
  hostImagePicker?: boolean;
  /** Pasted and dropped images are sent to the host to upload (`uploadImage` event). */
  hostUploads?: boolean;
  /** The host shows its own math keyboard while an equation is edited. */
  hostMathKeyboard?: boolean;
  /** Paper-like page and word count (classic editor). */
  document?: boolean;
  statusBar?: boolean;
  /** Report the content height (`height` event) so the host can size the view to fit. */
  reportHeight?: boolean;
  ariaLabel?: string;
  /** Turns on comments (COL-001…): the person commenting and options. */
  comments?: {
    author: { name: string; id?: string };
    moderator?: boolean;
    /** Commenting only: the text can't be changed. */
    only?: boolean;
  };
  /** Readers' highlights and notes on read-only content (axiomtext/viewer format). */
  highlights?: { items?: JsonValue[]; readOnly?: boolean };
  /** Marked books: the app's mark types (`markTap` events), reading filter and legend. */
  marks?: {
    types: { id: string; label: string; color: string; style?: string }[];
    /** `'all'`, `'marked'`, type ids, or `{ types?, states?, excludeStates? }`. */
    filter?: JsonValue;
    legend?: boolean;
    /** How readers' states look: `{ learned: { fade: true, badge: '✓' } }`. */
    states?: JsonValue;
    /** Starting states by mark id. */
    initialStates?: JsonValue;
  };
  /** Read-only: your items in the menu for selected text (`selectionAction` events). */
  selectionActions?: { id: string; label: string }[];
}

/** Formatting at the cursor, sent as the `state` event for native toolbars. */
export interface EditorState {
  marks: Record<string, boolean>;
  /** `paragraph`, `heading1`…`heading6`. */
  block: string;
  /** `bullet`, `ordered`, `task` or null. */
  list: string | null;
  blockquote: boolean;
  align: string;
  fontFamily: string | null;
  fontSize: string | null;
  textColor: string | null;
  highlight: string | null;
  link: string | null;
  canUndo: boolean;
  canRedo: boolean;
  empty: boolean;
  /** Type of a selected node (`image`, `math_inline`, …) or null. */
  selectedNode: string | null;
  inTable: boolean;
  focused: boolean;
}

const methodSet = new Set<string>(METHODS);
const eventSet = new Set<string>(EVENTS);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Parses and validates a message from the host. Returns null for anything that isn't a
 * well-formed call to an allowed method (unknown messages are dropped, never executed).
 */
export function parseCall(raw: unknown): CallMessage | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.length > 50 * 1024 * 1024) return null;
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isRecord(value)) return null;
  const { v, kind, id, method, params } = value;
  if (v !== PROTOCOL_VERSION || kind !== 'call') return null;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 0) return null;
  if (typeof method !== 'string' || !methodSet.has(method)) return null;
  if (params !== undefined && !isRecord(params)) return null;
  return {
    v,
    kind,
    id,
    method: method as Method,
    ...(params ? { params: params as Record<string, JsonValue> } : {}),
  };
}

export const isEventName = (name: string): name is EventName => eventSet.has(name);

export const resultMessage = (id: number, value: JsonValue | undefined): ResultMessage => ({
  v: PROTOCOL_VERSION,
  kind: 'result',
  id,
  ok: true,
  ...(value === undefined ? {} : { value }),
});

export const errorMessage = (id: number, error: string): ResultMessage => ({
  v: PROTOCOL_VERSION,
  kind: 'result',
  id,
  ok: false,
  error,
});

export const eventMessage = (name: EventName, data?: Record<string, JsonValue>): EventMessage => ({
  v: PROTOCOL_VERSION,
  kind: 'event',
  name,
  ...(data ? { data } : {}),
});

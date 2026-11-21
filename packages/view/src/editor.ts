import {
  AxiomError,
  DOCUMENT_VERSION,
  buildSchema,
  createEmptyDocument,
  migrateDocument,
  readDocument,
} from '@axiomtext/core';
import type {
  AxiomPlugin,
  CommandFactory,
  DocumentJSON,
  EditorCommand,
  MarkInfo,
  PageInfo,
} from '@axiomtext/core';
import { baseKeymap, chainCommands, exitCode } from 'prosemirror-commands';
import { closeHistory, history, redo, undo } from 'prosemirror-history';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { undoInputRule } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import { DOMSerializer, Node as PMNode } from 'prosemirror-model';
import type { Schema } from 'prosemirror-model';
import { EditorState, NodeSelection, Plugin, Selection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { cleanPastedHTML } from './paste';
import { placeholderPlugin } from './placeholder';

export interface EditorOptions {
  /** Element the editor is mounted into. */
  element: HTMLElement;
  /** Feature plugins, e.g. `[BasicStyles, Heading]`. */
  plugins?: readonly AxiomPlugin[];
  /** Initial content (stored JSON). Older versions are migrated automatically. */
  content?: DocumentJSON;
  /** Text shown when the editor is empty. */
  placeholder?: string;
  /** Set to false for read-only mode. Default: true. */
  editable?: boolean;
  /** Accessible name of the editing area. */
  ariaLabel?: string;
  /** Per-editor plugin settings, e.g. `{ marks: { types: [...] } }`. */
  config?: Readonly<Record<string, unknown>>;
}

/**
 * - `change`: document content changed
 * - `selectionChange`: selection moved or content changed
 * - `update`: any state change (incl. stored marks) — use it to refresh toolbars
 * - `focus` / `blur`
 */
export type EditorEvent = 'change' | 'selectionChange' | 'update' | 'focus' | 'blur';

export interface EditorStats {
  /** Words, counted with Intl.Segmenter when available (handles Bangla, CJK, Arabic). */
  words: number;
  /** User-perceived characters (grapheme clusters), excluding line breaks. */
  characters: number;
}
type Listener = () => void;

export interface Editor {
  /** Current content in the canonical JSON format. */
  getJSON(): DocumentJSON;
  /** Replace the content (clears undo history). */
  setJSON(content: DocumentJSON): void;
  /** Current content as an HTML string. */
  getHTML(): string;
  /**
   * Every mark (marked books) in document order: `{ id, type, text, page, data, badge, anchor }`.
   * Empty without the marks plugin. Same as `listMarks(editor.getJSON())`.
   */
  getMarks(): MarkInfo[];
  /** Every page-number block in order: `{ number, index }`. */
  getPages(): PageInfo[];
  /** Plain text, blocks separated by blank lines. */
  getText(): string;
  /**
   * Inserts HTML at the cursor exactly like pasting it: cleaned up, filtered by the schema
   * (unknown or unsafe content is dropped) and converted by plugins (e.g. MathML → equations).
   */
  insertHTML(html: string): void;
  /** Inserts plain text at the cursor like pasting it (e.g. `$x^2$` becomes an equation). */
  insertText(text: string): void;
  /** Run a plugin command by name, e.g. `execute('setHeading', 2)`. Returns false if it can't run. */
  execute(command: string, ...args: unknown[]): boolean;
  /** Whether a command can run in the current state. */
  can(command: string, ...args: unknown[]): boolean;
  /** Names of all registered commands. */
  readonly commandNames: readonly string[];
  /**
   * Whether a mark (e.g. `bold`) is active at the selection, or the selection is inside a block
   * of the given type (e.g. `heading` with `{ level: 2 }`).
   */
  isActive(name: string, attrs?: Record<string, unknown>): boolean;
  /** Whether the selection is inside a node of this type at any depth (e.g. `blockquote`). */
  isAncestor(name: string): boolean;
  /** Attributes of a mark at the selection (e.g. `getMarkAttrs('link')?.href`), or null. */
  getMarkAttrs(name: string): Record<string, unknown> | null;
  /** Word and character counts. */
  getStats(): EditorStats;
  /** Screen rectangle of the current selection (for positioning popovers). */
  getSelectionRect(): { top: number; bottom: number; left: number; right: number };
  /** Whether the editable area currently has focus. */
  hasFocus(): boolean;
  /**
   * `empty`: nothing selected (just a cursor). `emptyBlock`: the cursor is in an empty line.
   * Used by floating toolbars (balloon editor).
   */
  getSelectionState(): { empty: boolean; emptyBlock: boolean; nodeSelected: boolean };
  /** Attributes of the text block around the cursor (e.g. `textAlign`). */
  getBlockAttrs(): Record<string, unknown>;
  /** The node selected as a whole (e.g. an image), or null. */
  getSelectedNode(): {
    type: string;
    attrs: Record<string, unknown>;
    element: HTMLElement | null;
  } | null;
  /** The DOM element containing the cursor (for positioning contextual toolbars). */
  getSelectionElement(): HTMLElement | null;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  /** The editable DOM element (for focus management by UI components). */
  readonly dom: HTMLElement;
  /** Per-editor plugin settings given in `EditorOptions.config`. */
  readonly config: Readonly<Record<string, unknown>>;
  /** Focus the editor; optionally put the cursor at the start or end of the document. */
  focus(position?: 'start' | 'end'): void;
  setEditable(editable: boolean): void;
  /** Subscribe to an event. Returns an unsubscribe function. */
  on(event: EditorEvent, listener: Listener): () => void;
  destroy(): void;
}

function collectCommands(plugins: readonly AxiomPlugin[]): Map<string, CommandFactory> {
  const commands = new Map<string, CommandFactory>();
  for (const plugin of plugins) {
    for (const [name, factory] of Object.entries(plugin.commands ?? {})) {
      commands.set(name, factory);
    }
  }
  return commands;
}

type SegmenterLike = {
  segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }>;
};
type SegmenterCtor = new (
  locale: string | undefined,
  options: { granularity: 'word' | 'grapheme' },
) => SegmenterLike;

function getSegmenter(granularity: 'word' | 'grapheme'): SegmenterLike | null {
  const Ctor = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return Ctor ? new Ctor(undefined, { granularity }) : null;
}

const wordSegmenter = getSegmenter('word');
const graphemeSegmenter = getSegmenter('grapheme');

/** Counts words and characters in a language-aware way. */
export function countStats(text: string): EditorStats {
  const trimmed = text.trim();
  if (trimmed === '') return { words: 0, characters: 0 };
  let words = 0;
  if (wordSegmenter) {
    for (const part of wordSegmenter.segment(trimmed)) if (part.isWordLike) words++;
  } else {
    words = trimmed.split(/\s+/).length;
  }
  const visible = text.replace(/[\n\r]/g, '');
  const characters = graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(visible)).length
    : [...visible].length;
  return { words, characters };
}

/** Top-level blocks from which a document counts as long (rendering shortcuts kick in). */
const LARGE_DOCUMENT = 120;

export function createEditor(options: EditorOptions): Editor {
  const plugins = options.plugins ?? [];
  const schema: Schema = buildSchema(plugins, options.config);
  const commands = collectCommands(plugins);
  const listeners = new Map<EditorEvent, Set<Listener>>();
  let editable = options.editable ?? true;
  let destroyed = false;

  const emit = (event: EditorEvent): void => {
    listeners.get(event)?.forEach((listener) => listener());
  };

  const toDoc = (content: DocumentJSON): PMNode => {
    const migrated = migrateDocument(content);
    // Throws on content that doesn't fit the schema (unknown node types etc.).
    const node = PMNode.fromJSON(schema, migrated.doc);
    node.check();
    return node;
  };

  const hardBreak: EditorCommand = (state, dispatch) => {
    const type = state.schema.nodes['hard_break'];
    if (!type) return false;
    dispatch?.(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
    return true;
  };

  const buildState = (doc: PMNode): EditorState =>
    EditorState.create({
      doc,
      plugins: [
        history(),
        ...plugins.flatMap((p) => (p.keymap ? [keymap(p.keymap(schema))] : [])),
        keymap({
          'Mod-z': undo,
          'Shift-Mod-z': redo,
          'Mod-y': redo,
          'Shift-Enter': chainCommands(exitCode, hardBreak),
          // Backspace right after an autoformat reverts it ("# " → heading → "# ").
          Backspace: undoInputRule,
        }),
        keymap(baseKeymap),
        dropCursor({ color: 'var(--ax-accent, #4f46e5)', width: 2 }),
        gapCursor(),
        ...plugins.flatMap((p) => p.enginePlugins?.(schema) ?? []),
        ...(options.placeholder ? [placeholderPlugin(options.placeholder)] : []),
        new Plugin({
          props: {
            handleDOMEvents: {
              focus: () => (emit('focus'), false),
              blur: () => (emit('blur'), false),
            },
          },
        }),
      ],
    });

  const view = new EditorView(options.element, {
    state: buildState(toDoc(options.content ?? createEmptyDocument())),
    editable: () => editable,
    attributes: (state) => ({
      // Long documents: blocks off screen skip layout and painting until they come near.
      class:
        state.doc.childCount > LARGE_DOCUMENT ? 'axiomtext-content ax-large' : 'axiomtext-content',
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': options.ariaLabel ?? 'Rich text editor',
    }),
    transformPastedHTML: cleanPastedHTML,
    dispatchTransaction(tr) {
      const next = view.state.apply(tr);
      view.updateState(next);
      if (tr.docChanged) emit('change');
      if (tr.selectionSet || tr.docChanged) emit('selectionChange');
      emit('update');
    },
  });

  const ensureAlive = (): void => {
    if (destroyed) throw new AxiomError('AXIOM_E_DESTROYED', 'Editor was destroyed.');
  };

  const resolve = (name: string, args: unknown[]): EditorCommand => {
    const factory = commands.get(name);
    if (!factory) {
      throw new AxiomError('AXIOM_E_UNKNOWN_COMMAND', `No plugin provides command "${name}".`);
    }
    return (factory as (...a: unknown[]) => EditorCommand)(...args);
  };

  const getJSON = (): DocumentJSON => ({
    version: DOCUMENT_VERSION,
    doc: view.state.doc.toJSON() as DocumentJSON['doc'],
  });

  return {
    getJSON,
    setJSON(content) {
      ensureAlive();
      view.updateState(buildState(toDoc(content)));
      emit('change');
    },
    getHTML() {
      const fragment = DOMSerializer.fromSchema(schema).serializeFragment(view.state.doc.content);
      const wrapper = document.createElement('div');
      wrapper.appendChild(fragment);
      return wrapper.innerHTML;
    },
    getText: () => view.state.doc.textBetween(0, view.state.doc.content.size, '\n\n', '\n'),
    getMarks: () => (readDocument(schema, 'marks', getJSON()) as MarkInfo[] | undefined) ?? [],
    getPages: () => (readDocument(schema, 'pages', getJSON()) as PageInfo[] | undefined) ?? [],
    insertHTML(html) {
      ensureAlive();
      view.pasteHTML(html);
    },
    insertText(text) {
      ensureAlive();
      view.pasteText(text);
    },
    execute(name, ...args) {
      ensureAlive();
      // Explicit commands (toolbar, API) always start a new undo step, so undo reverts
      // just the command and not the typing that came right before it.
      return resolve(name, args)(view.state, (tr) => view.dispatch(closeHistory(tr)), view);
    },
    can(name, ...args) {
      ensureAlive();
      return resolve(name, args)(view.state, undefined, view);
    },
    commandNames: [...commands.keys()],
    isActive(name, attrs) {
      const { state } = view;
      const markType = state.schema.marks[name];
      if (markType) {
        const { from, to, empty, $from } = state.selection;
        if (empty) return markType.isInSet(state.storedMarks ?? $from.marks()) !== undefined;
        return state.doc.rangeHasMark(from, to, markType);
      }
      const parent = state.selection.$from.parent;
      if (parent.type.name !== name) return false;
      return Object.entries(attrs ?? {}).every(([key, value]) => parent.attrs[key] === value);
    },
    isAncestor(name) {
      const { $from } = view.state.selection;
      for (let depth = $from.depth; depth > 0; depth--) {
        if ($from.node(depth).type.name === name) return true;
      }
      return false;
    },
    getMarkAttrs(name) {
      const { state } = view;
      const type = state.schema.marks[name];
      if (!type) return null;
      const { from, to, empty, $from } = state.selection;
      if (empty) return type.isInSet(state.storedMarks ?? $from.marks())?.attrs ?? null;
      let found: Record<string, unknown> | null = null;
      state.doc.nodesBetween(from, to, (node) => {
        if (found) return false;
        const mark = type.isInSet(node.marks);
        if (mark) found = mark.attrs;
        return true;
      });
      return found;
    },
    getSelectionRect() {
      const { from, to } = view.state.selection;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);
      return {
        top: Math.min(start.top, end.top),
        bottom: Math.max(start.bottom, end.bottom),
        left: Math.min(start.left, end.left),
        right: Math.max(start.right, end.right),
      };
    },
    hasFocus: () => view.hasFocus(),
    getSelectionState() {
      const sel = view.state.selection;
      const parent = sel.$from.parent;
      return {
        empty: sel.empty,
        emptyBlock: sel.empty && parent.isTextblock && parent.content.size === 0,
        nodeSelected: sel instanceof NodeSelection,
      };
    },
    getBlockAttrs: () => ({ ...view.state.selection.$from.parent.attrs }),
    getSelectedNode() {
      const sel = view.state.selection as { node?: PMNode; from: number };
      if (!sel.node) return null;
      const element = view.nodeDOM(sel.from);
      return {
        type: sel.node.type.name,
        attrs: { ...sel.node.attrs },
        element: element instanceof HTMLElement ? element : null,
      };
    },
    getSelectionElement() {
      const { node } = view.domAtPos(view.state.selection.from);
      const el = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
      return el && view.dom.contains(el) ? el : null;
    },
    getStats: () =>
      countStats(view.state.doc.textBetween(0, view.state.doc.content.size, ' ', ' ')),
    undo: () => undo(view.state, view.dispatch),
    redo: () => redo(view.state, view.dispatch),
    canUndo: () => undo(view.state),
    canRedo: () => redo(view.state),
    get dom() {
      return view.dom;
    },
    config: options.config ?? {},
    focus(position) {
      if (position) {
        const selection =
          position === 'start'
            ? Selection.atStart(view.state.doc)
            : Selection.atEnd(view.state.doc);
        view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
      }
      view.focus();
    },
    setEditable(value) {
      editable = value;
      view.setProps({});
    },
    on(event, listener) {
      let set = listeners.get(event);
      if (!set) listeners.set(event, (set = new Set()));
      set.add(listener);
      return () => set.delete(listener);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.clear();
      view.destroy();
    },
  };
}

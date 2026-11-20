import {
  AxiomError,
  DOCUMENT_VERSION,
  buildSchema,
  createEmptyDocument,
  migrateDocument,
} from '@axiomtext/core';
import type { AxiomPlugin, CommandFactory, DocumentJSON, EditorCommand } from '@axiomtext/core';
import { baseKeymap, chainCommands, exitCode } from 'prosemirror-commands';
import { closeHistory, history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { DOMSerializer, Node as PMNode } from 'prosemirror-model';
import type { Schema } from 'prosemirror-model';
import { EditorState, Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
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
}

export type EditorEvent = 'change' | 'selectionChange' | 'focus' | 'blur';
type Listener = () => void;

export interface Editor {
  /** Current content in the canonical JSON format. */
  getJSON(): DocumentJSON;
  /** Replace the content (clears undo history). */
  setJSON(content: DocumentJSON): void;
  /** Current content as an HTML string. */
  getHTML(): string;
  /** Plain text, blocks separated by blank lines. */
  getText(): string;
  /** Run a plugin command by name, e.g. `execute('setHeading', 2)`. Returns false if it can't run. */
  execute(command: string, ...args: unknown[]): boolean;
  /** Whether a command can run in the current state. */
  can(command: string, ...args: unknown[]): boolean;
  /** Names of all registered commands. */
  readonly commandNames: readonly string[];
  undo(): boolean;
  redo(): boolean;
  focus(): void;
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

export function createEditor(options: EditorOptions): Editor {
  const plugins = options.plugins ?? [];
  const schema: Schema = buildSchema(plugins);
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
        }),
        keymap(baseKeymap),
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
    attributes: {
      class: 'axiomtext-content',
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': options.ariaLabel ?? 'Rich text editor',
    },
    dispatchTransaction(tr) {
      const next = view.state.apply(tr);
      view.updateState(next);
      if (tr.docChanged) emit('change');
      if (tr.selectionSet || tr.docChanged) emit('selectionChange');
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

  return {
    getJSON: () => ({
      version: DOCUMENT_VERSION,
      doc: view.state.doc.toJSON() as DocumentJSON['doc'],
    }),
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
    undo: () => undo(view.state, view.dispatch),
    redo: () => redo(view.state, view.dispatch),
    focus: () => view.focus(),
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

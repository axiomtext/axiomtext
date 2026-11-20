import type { MarkSpec, NodeSpec } from 'prosemirror-model';
import type { Command, Plugin as StatePlugin } from 'prosemirror-state';
import type { Schema } from 'prosemirror-model';
import type { InputRule } from 'prosemirror-inputrules';

/**
 * Engine-level types. They are ProseMirror types today; plugin authors should import them
 * from `@axiomtext/core` so the engine can change without breaking plugins (ADR-0001).
 */
export type NodeDefinition = NodeSpec;
export type MarkDefinition = MarkSpec;
export type EditorCommand = Command;
export type EngineSchema = Schema;
export type EnginePlugin = StatePlugin;
export type EngineInputRule = InputRule;

/** A command factory: `toggleBold()` or `setHeading(2)` both return an EditorCommand. */
export type CommandFactory = (...args: never[]) => EditorCommand;

/** Translation strings contributed by a plugin, keyed by locale then message id. */
export type PluginMessages = Record<string, Record<string, string>>;

/** An attribute a plugin adds to nodes owned by other plugins (e.g. `textAlign` on paragraphs). */
export interface GlobalAttribute {
  default: string | number | null;
  /** Reads the value from an element while parsing HTML; return null for the default. */
  parseHTML: (element: HTMLElement) => string | number | null;
  /** Attributes to render for a value (`style` values are merged); return null to render nothing. */
  renderHTML: (value: unknown) => Record<string, string> | null;
}

export interface GlobalAttributes {
  /** Node type names, e.g. `['paragraph', 'heading']`. Missing types are ignored. */
  types: readonly string[];
  attributes: Record<string, GlobalAttribute>;
}

/** The contract every AxiomText feature implements (ADR-0004). */
export interface AxiomPlugin {
  /** Unique, kebab-case name, e.g. "basic-styles". */
  name: string;
  /** Nodes this plugin adds to the schema. Order matters for parse priority. */
  nodes?: Record<string, NodeDefinition>;
  /** Marks this plugin adds to the schema. */
  marks?: Record<string, MarkDefinition>;
  /** Attributes this plugin adds to other plugins' nodes (alignment, indentation, …). */
  globalAttributes?: readonly GlobalAttributes[];
  /** Commands exposed as `editor.execute(name, ...args)`. */
  commands?: Record<string, CommandFactory>;
  /** Keyboard shortcuts, e.g. `{ 'Mod-b': toggleBold }`. Receives the final schema. */
  keymap?: (schema: EngineSchema) => Record<string, EditorCommand>;
  /** Engine plugins (input rules, decorations…). Receives the final schema. */
  enginePlugins?: (schema: EngineSchema) => EnginePlugin[];
  /** UI strings. */
  messages?: PluginMessages;
}

/** Identity helper that gives plugin authors full type checking. */
export function definePlugin<const P extends AxiomPlugin>(plugin: P): P {
  return plugin;
}

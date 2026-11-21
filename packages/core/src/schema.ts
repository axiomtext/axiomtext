import { Schema } from 'prosemirror-model';
import type {
  DOMOutputSpec,
  MarkSpec,
  Node as PMNode,
  NodeSpec,
  TagParseRule,
} from 'prosemirror-model';
import type { DocumentJSON } from './document';
import { AxiomError } from './errors';
import type { AxiomPlugin, GlobalAttribute } from './plugin';

/** Nodes every document has, regardless of plugins. */
const baseNodes: Record<string, NodeSpec> = {
  doc: { content: 'block+' },
  paragraph: {
    content: 'inline*',
    group: 'block',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0],
  },
  text: { group: 'inline' },
  hard_break: {
    inline: true,
    group: 'inline',
    selectable: false,
    parseDOM: [{ tag: 'br' }],
    toDOM: () => ['br'],
  },
};

/**
 * Builds the document schema from the base nodes plus all plugins. `config` holds per-editor
 * plugin settings (e.g. `{ marks: { types } }`), read with `getPluginConfig`.
 */
export function buildSchema(
  plugins: readonly AxiomPlugin[],
  config: Readonly<Record<string, unknown>> = {},
): Schema {
  const names = new Set<string>();
  const nodes: Record<string, NodeSpec> = { ...baseNodes };
  const marks: Record<string, MarkSpec> = {};

  for (const plugin of plugins) {
    if (names.has(plugin.name)) {
      throw new AxiomError('AXIOM_E_DUPLICATE_PLUGIN', `Plugin "${plugin.name}" registered twice.`);
    }
    names.add(plugin.name);
    for (const [key, spec] of Object.entries(plugin.nodes ?? {})) {
      if (key in nodes) {
        throw new AxiomError(
          'AXIOM_E_DUPLICATE_SCHEMA_ITEM',
          `Node "${key}" from plugin "${plugin.name}" already exists.`,
        );
      }
      nodes[key] = spec;
    }
    for (const [key, spec] of Object.entries(plugin.marks ?? {})) {
      if (key in marks) {
        throw new AxiomError(
          'AXIOM_E_DUPLICATE_SCHEMA_ITEM',
          `Mark "${key}" from plugin "${plugin.name}" already exists.`,
        );
      }
      marks[key] = spec;
    }
  }

  // Apply attributes that plugins add to other plugins' nodes.
  const globals = new Map<string, Record<string, GlobalAttribute>>();
  for (const plugin of plugins) {
    for (const group of plugin.globalAttributes ?? []) {
      for (const type of group.types) {
        globals.set(type, { ...(globals.get(type) ?? {}), ...group.attributes });
      }
    }
  }
  for (const [type, attributes] of globals) {
    const spec = nodes[type];
    if (spec) nodes[type] = withGlobalAttributes(spec, attributes);
  }

  const schema = new Schema({ nodes, marks });
  schema.cached[CONFIG_KEY] = config;
  schema.cached[READERS_KEY] = Object.assign({}, ...plugins.map((p) => p.readers ?? {})) as Record<
    string,
    (doc: DocumentJSON) => unknown
  >;
  return schema;
}

const READERS_KEY = 'axReaders';

/** Runs a plugin's document reader (see `AxiomPlugin.readers`), or returns undefined. */
export function readDocument(schema: Schema, name: string, doc: DocumentJSON): unknown {
  const readers = schema.cached[READERS_KEY] as
    Record<string, (doc: DocumentJSON) => unknown> | undefined;
  return readers?.[name]?.(doc);
}

const CONFIG_KEY = 'axConfig';

/** A plugin's per-editor settings (from `EditorOptions.config`), e.g. `getPluginConfig(schema, 'marks')`. */
export function getPluginConfig<T = unknown>(schema: Schema, key: string): T | undefined {
  const config = schema.cached[CONFIG_KEY] as Record<string, unknown> | undefined;
  return config?.[key] as T | undefined;
}

const isAttrsObject = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !('nodeType' in value);

/** Merges rendered attribute sets; `style` values are concatenated. */
function mergeAttrs(
  base: Record<string, string>,
  extra: Record<string, string>,
): Record<string, string> {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    out[key] = key === 'style' && out[key] ? `${out[key].replace(/;?\s*$/, ';')} ${value}` : value;
  }
  return out;
}

function withGlobalAttributes(
  spec: NodeSpec,
  attributes: Record<string, GlobalAttribute>,
): NodeSpec {
  const attrs = { ...(spec.attrs ?? {}) };
  for (const [name, attr] of Object.entries(attributes)) attrs[name] = { default: attr.default };

  const parseDOM = spec.parseDOM?.map((rule) => {
    if (!('tag' in rule) || !rule.tag) return rule;
    const tagRule = rule as TagParseRule;
    const original = tagRule.getAttrs;
    return {
      ...tagRule,
      getAttrs: (dom: HTMLElement) => {
        const base = original ? original(dom) : (tagRule.attrs ?? {});
        if (base === false) return false;
        const extra: Record<string, unknown> = {};
        for (const [name, attr] of Object.entries(attributes)) {
          const value = attr.parseHTML(dom);
          if (value !== null && value !== undefined) extra[name] = value;
        }
        return { ...(base ?? {}), ...extra };
      },
    } satisfies TagParseRule;
  });

  const toDOM = spec.toDOM;
  return {
    ...spec,
    attrs,
    ...(parseDOM ? { parseDOM } : {}),
    ...(toDOM
      ? {
          toDOM: (node: PMNode): DOMOutputSpec => {
            const out = toDOM(node);
            let extra: Record<string, string> = {};
            for (const [name, attr] of Object.entries(attributes)) {
              const rendered = attr.renderHTML(node.attrs[name]);
              if (rendered) extra = mergeAttrs(extra, rendered);
            }
            if (Object.keys(extra).length === 0 || !Array.isArray(out)) return out;
            const [tag, ...rest] = out as [string, ...unknown[]];
            if (isAttrsObject(rest[0]))
              return [tag, mergeAttrs(rest[0], extra), ...rest.slice(1)] as DOMOutputSpec;
            return [tag, extra, ...rest] as DOMOutputSpec;
          },
        }
      : {}),
  };
}

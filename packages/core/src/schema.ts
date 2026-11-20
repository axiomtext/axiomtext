import { Schema } from 'prosemirror-model';
import type { MarkSpec, NodeSpec } from 'prosemirror-model';
import { AxiomError } from './errors';
import type { AxiomPlugin } from './plugin';

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

/** Builds the document schema from the base nodes plus all plugins. */
export function buildSchema(plugins: readonly AxiomPlugin[]): Schema {
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

  return new Schema({ nodes, marks });
}

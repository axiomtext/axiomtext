export { AxiomError } from './errors';
export type { AxiomErrorCode } from './errors';
export { DOCUMENT_VERSION, createEmptyDocument, isDocumentJSON, migrateDocument } from './document';
export type { DocumentJSON, NodeJSON, MarkJSON } from './document';
export { definePlugin } from './plugin';
export type {
  AxiomPlugin,
  CommandFactory,
  EditorCommand,
  EnginePlugin,
  EngineSchema,
  MarkDefinition,
  NodeDefinition,
  PluginMessages,
} from './plugin';
export { buildSchema } from './schema';
export { sanitizeUrl, DEFAULT_ALLOWED_PROTOCOLS } from './url';

import { AxiomError } from './errors';

/** Current version of the AxiomText JSON document format. */
export const DOCUMENT_VERSION = 1;

/** A node in the JSON document tree (canonical storage format, see ADR-0003). */
export interface NodeJSON {
  type: string;
  attrs?: Record<string, unknown>;
  content?: NodeJSON[];
  marks?: MarkJSON[];
  text?: string;
}

export interface MarkJSON {
  type: string;
  attrs?: Record<string, unknown>;
}

/** The value applications store in their database. */
export interface DocumentJSON {
  /** Format version, used for migrations. */
  version: number;
  doc: NodeJSON & { type: 'doc' };
}

/** Any JSON object an app keeps on a mark (question ids, a note, …). */
export type MarkData = Record<string, unknown>;

/**
 * A mark in a document (marked books), as `editor.getMarks()` and `listMarks()` return it. This
 * shape is a stable format: fields may be added, never renamed or removed.
 */
export interface MarkInfo {
  /** Unique id of this mark; stays the same while the text is edited. */
  id: string;
  /** The mark type's id (the app's, e.g. `PREVIOUS_YEAR`). */
  type: string;
  /** The marked text (parts in different paragraphs joined with a space). */
  text: string;
  /** Number of the page block before it, or null when there's none. */
  page: number | null;
  /** The app's data, or null. */
  data: MarkData | null;
  /** Small label shown on the mark (e.g. a number), or null. */
  badge: string | null;
  /** The quote with some context, to find it again (W3C TextQuoteSelector). */
  anchor: { exact: string; prefix: string; suffix: string };
}

/** A page-number block. */
export interface PageInfo {
  number: number;
  /** Index among the document's top-level blocks. */
  index: number;
}

export function createEmptyDocument(): DocumentJSON {
  return {
    version: DOCUMENT_VERSION,
    doc: { type: 'doc', content: [{ type: 'paragraph' }] },
  };
}

function isNodeJSON(value: unknown, depth = 0): value is NodeJSON {
  if (depth > 200) return false; // guard against hostile, deeply nested input
  if (typeof value !== 'object' || value === null) return false;
  const node = value as Record<string, unknown>;
  if (typeof node['type'] !== 'string') return false;
  if (node['text'] !== undefined && typeof node['text'] !== 'string') return false;
  if (node['content'] !== undefined) {
    if (!Array.isArray(node['content'])) return false;
    if (!node['content'].every((child) => isNodeJSON(child, depth + 1))) return false;
  }
  if (node['marks'] !== undefined) {
    if (!Array.isArray(node['marks'])) return false;
    if (
      !node['marks'].every((m) => typeof m === 'object' && m !== null && typeof m.type === 'string')
    )
      return false;
  }
  return true;
}

/** Structural check of untrusted input (does not validate against a schema). */
export function isDocumentJSON(value: unknown): value is DocumentJSON {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['version'] === 'number' &&
    isNodeJSON(v['doc']) &&
    (v['doc'] as NodeJSON).type === 'doc'
  );
}

type Migration = (doc: DocumentJSON) => DocumentJSON;

/**
 * Migrations from version N to N+1. Add one entry every time DOCUMENT_VERSION is bumped.
 * Keys are the version being migrated *from*.
 */
const migrations: Record<number, Migration> = {};

/** Validates and upgrades a stored document to the current format version. */
export function migrateDocument(input: unknown): DocumentJSON {
  if (!isDocumentJSON(input)) {
    throw new AxiomError('AXIOM_E_INVALID_DOCUMENT', 'Value is not an AxiomText document.');
  }
  if (input.version > DOCUMENT_VERSION) {
    throw new AxiomError(
      'AXIOM_E_UNSUPPORTED_VERSION',
      `Document version ${input.version} is newer than this editor (${DOCUMENT_VERSION}). Upgrade AxiomText.`,
    );
  }
  let doc = input;
  while (doc.version < DOCUMENT_VERSION) {
    const migrate = migrations[doc.version];
    if (!migrate) {
      throw new AxiomError(
        'AXIOM_E_UNSUPPORTED_VERSION',
        `No migration from document version ${doc.version}.`,
      );
    }
    doc = migrate(doc);
  }
  return doc;
}

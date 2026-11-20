import { describe, expect, it } from 'vitest';
import {
  AxiomError,
  DOCUMENT_VERSION,
  buildSchema,
  createEmptyDocument,
  definePlugin,
  isDocumentJSON,
  migrateDocument,
  sanitizeUrl,
} from '../src';

describe('document format', () => {
  it('creates an empty document at the current version', () => {
    const doc = createEmptyDocument();
    expect(doc.version).toBe(DOCUMENT_VERSION);
    expect(isDocumentJSON(doc)).toBe(true);
  });

  it('rejects invalid input', () => {
    expect(isDocumentJSON(null)).toBe(false);
    expect(isDocumentJSON({ version: 1, doc: { type: 'paragraph' } })).toBe(false);
    expect(isDocumentJSON({ version: 1, doc: { type: 'doc', content: 'x' } })).toBe(false);
    expect(() => migrateDocument('nope')).toThrow(AxiomError);
  });

  it('rejects documents from a newer editor', () => {
    const future = { version: DOCUMENT_VERSION + 1, doc: { type: 'doc', content: [] } };
    expect(() => migrateDocument(future)).toThrow(/AXIOM_E_UNSUPPORTED_VERSION/);
  });

  it('rejects absurdly deep nesting', () => {
    let node: Record<string, unknown> = { type: 'paragraph' };
    for (let i = 0; i < 500; i++) node = { type: 'blockquote', content: [node] };
    expect(isDocumentJSON({ version: 1, doc: { type: 'doc', content: [node] } })).toBe(false);
  });
});

describe('schema', () => {
  const bold = definePlugin({
    name: 'bold-test',
    marks: { strong: { parseDOM: [{ tag: 'b' }], toDOM: () => ['strong', 0] } },
  });

  it('merges plugin marks into the schema', () => {
    const schema = buildSchema([bold]);
    expect(schema.marks['strong']).toBeDefined();
    expect(schema.nodes['paragraph']).toBeDefined();
  });

  it('refuses duplicate plugins and schema items', () => {
    expect(() => buildSchema([bold, bold])).toThrow(/AXIOM_E_DUPLICATE_PLUGIN/);
    const clash = definePlugin({ name: 'clash', nodes: { paragraph: { content: 'text*' } } });
    expect(() => buildSchema([clash])).toThrow(/AXIOM_E_DUPLICATE_SCHEMA_ITEM/);
  });
});

describe('sanitizeUrl', () => {
  it.each([
    ['https://axiomtext.dev', 'https://axiomtext.dev'],
    ['mailto:hello@axiomtext.dev', 'mailto:hello@axiomtext.dev'],
    ['/docs/start', '/docs/start'],
    ['#section-2', '#section-2'],
  ])('allows %s', (input, expected) => {
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    ' java\tscript:alert(1)',
    'java\u0000script:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    '',
  ])('blocks %j', (input) => {
    expect(sanitizeUrl(input)).toBeNull();
  });
});

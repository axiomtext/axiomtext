// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { DOMParser as PMDOMParser, DOMSerializer } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import {
  AxiomError,
  buildSchema,
  definePlugin,
  isDocumentJSON,
  markInputRule,
  migrateDocument,
  sanitizeColor,
  sanitizeFontFamily,
  sanitizeFontSize,
  trustedHTML,
  trustedTypesEnforced,
} from '../src';

const align = definePlugin({
  name: 'align',
  globalAttributes: [
    {
      types: ['paragraph', 'heading'],
      attributes: {
        textAlign: {
          default: null,
          parseHTML: (el) => el.style.textAlign || null,
          renderHTML: (v) => (v ? { style: `text-align: ${String(v)}` } : null),
        },
      },
    },
  ],
});
const color = definePlugin({
  name: 'color',
  globalAttributes: [
    {
      types: ['paragraph'],
      attributes: {
        tone: {
          default: null,
          parseHTML: (el) => el.getAttribute('data-tone'),
          renderHTML: (v) => (v ? { 'data-tone': String(v), style: 'color: red' } : null),
        },
      },
    },
  ],
});
const heading = definePlugin({
  name: 'heading',
  nodes: {
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: { level: { default: 1 } },
      parseDOM: [
        { tag: 'h1', attrs: { level: 1 } },
        { tag: 'h2', getAttrs: () => ({ level: 2 }) },
        { tag: 'h9', getAttrs: () => false },
      ],
      toDOM: (n) => [`h${n.attrs['level'] as number}`, 0],
    },
  },
  marks: { strong: { parseDOM: [{ tag: 'b' }], toDOM: () => ['strong', 0] } },
});

const html = (schema: ReturnType<typeof buildSchema>, source: string): string => {
  const div = document.createElement('div');
  div.innerHTML = source;
  const doc = PMDOMParser.fromSchema(schema).parse(div);
  const out = document.createElement('div');
  out.append(DOMSerializer.fromSchema(schema).serializeFragment(doc.content));
  return out.innerHTML;
};

describe('buildSchema', () => {
  it('adds plugin nodes and marks to the base schema', () => {
    const schema = buildSchema([heading]);
    expect(Object.keys(schema.nodes)).toEqual([
      'doc',
      'paragraph',
      'text',
      'hard_break',
      'heading',
    ]);
    expect(schema.marks['strong']).toBeDefined();
    expect(html(schema, '<p>a<br>b</p><h2>T</h2>')).toBe('<p>a<br>b</p><h2>T</h2>');
  });

  it('rejects duplicate plugins and duplicate schema names', () => {
    expect(() => buildSchema([heading, heading])).toThrow(AxiomError);
    const clash = definePlugin({ name: 'other', nodes: { heading: { group: 'block' } } });
    expect(() => buildSchema([heading, clash])).toThrow(/already exists/);
    const markClash = definePlugin({ name: 'm', marks: { strong: {} } });
    expect(() => buildSchema([heading, markClash])).toThrow(/Mark "strong"/);
  });

  it('applies global attributes when parsing and rendering, merging styles', () => {
    const schema = buildSchema([heading, align, color]);
    expect(schema.nodes['paragraph']?.spec.attrs).toHaveProperty('textAlign');
    expect(schema.nodes['heading']?.spec.attrs).toHaveProperty('textAlign');
    expect(html(schema, '<p style="text-align: center" data-tone="x">Hi</p>')).toBe(
      '<p style="text-align: center; color: red;" data-tone="x">Hi</p>',
    );
    // Rules with fixed attrs, getAttrs, and getAttrs returning false all keep working.
    expect(html(schema, '<h1 style="text-align: right">A</h1>')).toBe(
      '<h1 style="text-align: right;">A</h1>',
    );
    expect(html(schema, '<h2>B</h2>')).toBe('<h2>B</h2>');
    expect(html(schema, '<p>plain</p>')).toBe('<p>plain</p>');
  });

  it('ignores global attributes for node types that do not exist', () => {
    const orphan = definePlugin({
      name: 'orphan',
      globalAttributes: [
        {
          types: ['missing'],
          attributes: { x: { default: null, parseHTML: () => null, renderHTML: () => null } },
        },
      ],
    });
    expect(() => buildSchema([orphan])).not.toThrow();
  });
});

describe('documents', () => {
  it('validates structure deeply', () => {
    const ok = {
      version: 1,
      doc: { type: 'doc', content: [{ type: 'paragraph', marks: [{ type: 'b' }] }] },
    };
    expect(isDocumentJSON(ok)).toBe(true);
    expect(isDocumentJSON({ version: 1, doc: { type: 'doc', content: 'x' } })).toBe(false);
    expect(isDocumentJSON({ version: 1, doc: { type: 'doc', content: [{ type: 1 }] } })).toBe(
      false,
    );
    expect(isDocumentJSON({ version: 1, doc: { type: 'doc', marks: 'x' } })).toBe(false);
    expect(isDocumentJSON({ version: 1, doc: { type: 'doc', marks: [null] } })).toBe(false);
    expect(isDocumentJSON({ version: '1', doc: { type: 'doc' } })).toBe(false);
    expect(isDocumentJSON({ version: 1, doc: { type: 'paragraph' } })).toBe(false);
  });

  it('refuses documents from newer or unknown versions', () => {
    expect(() => migrateDocument({ version: 99, doc: { type: 'doc' } })).toThrow(/newer/);
    expect(() => migrateDocument({ version: 0, doc: { type: 'doc' } })).toThrow(/No migration/);
    expect(() => migrateDocument('nope')).toThrow(AxiomError);
  });
});

describe('markInputRule', () => {
  it('turns **text** into a mark and removes the delimiters', () => {
    const schema = buildSchema([heading]);
    const strong = schema.marks['strong'];
    if (!strong) throw new Error('strong mark missing');
    const rule = markInputRule(/\*\*([^*]+)\*\*$/, strong);
    let state = EditorState.create({
      schema,
      doc: schema.node('doc', null, [schema.node('paragraph', null, [schema.text('a **bold*')])]),
    });
    state = state.apply(state.tr.setSelection(TextSelection.atEnd(state.doc)));
    const end = state.selection.from;
    const match = /\*\*([^*]+)\*\*$/.exec('a **bold**');
    // InputRule.handler(state, match, start, end) — `end` excludes the typed "*".
    const tr = (rule as unknown as { handler: (...a: unknown[]) => unknown }).handler(
      state,
      match,
      end - 7, // the match minus the typed "*"
      end,
    ) as ReturnType<typeof state.tr.delete>;
    expect(tr).not.toBeNull();
    const next = state.apply(tr);
    expect(next.doc.textContent).toBe('a bold');
    expect(next.doc.firstChild?.child(1).marks[0]?.type.name).toBe('strong');
    expect(
      (rule as unknown as { handler: (...a: unknown[]) => unknown }).handler(
        state,
        ['**', ''],
        1,
        1,
      ),
    ).toBeNull();
  });
});

describe('style sanitizers', () => {
  it('accepts only safe CSS values', () => {
    expect(sanitizeColor('#4f46e5')).toBe('#4f46e5');
    expect(sanitizeColor('red; background: url(x)')).toBeNull();
    expect(sanitizeFontSize('18px')).toBe('18px');
    expect(sanitizeFontSize('expression(alert(1))')).toBeNull();
    expect(sanitizeFontFamily('Georgia, serif')).toBe('Georgia, serif');
    expect(sanitizeFontFamily('x; } body { display:none')).toBeNull();
  });
});

describe('Trusted Types', () => {
  it('passes strings through when Trusted Types are unavailable', () => {
    expect(trustedHTML('<b>x</b>')).toBe('<b>x</b>');
    expect(trustedTypesEnforced()).toBe(false);
  });

  it('uses the "axiomtext" policy when the browser has Trusted Types', async () => {
    vi.resetModules();
    const createHTML = vi.fn((s: string) => ({ toString: () => s, trusted: true }));
    const g = globalThis as { trustedTypes?: unknown };
    g.trustedTypes = { createPolicy: vi.fn(() => ({ createHTML })) };
    try {
      const mod = await import('../src/trusted-html');
      const out = mod.trustedHTML('<i>y</i>') as unknown as { trusted: boolean };
      expect(out.trusted).toBe(true);
      expect(
        (g.trustedTypes as { createPolicy: ReturnType<typeof vi.fn> }).createPolicy,
      ).toHaveBeenCalledWith('axiomtext', expect.any(Object));
      expect(mod.trustedTypesEnforced()).toBe(false); // happy-dom doesn't enforce
    } finally {
      delete g.trustedTypes;
    }
  });

  it('survives a page that refuses the policy name', async () => {
    vi.resetModules();
    const g = globalThis as { trustedTypes?: unknown };
    g.trustedTypes = {
      createPolicy: () => {
        throw new Error('policy not allowed');
      },
    };
    try {
      const mod = await import('../src/trusted-html');
      expect(mod.trustedHTML('<u>z</u>')).toBe('<u>z</u>');
    } finally {
      delete g.trustedTypes;
    }
  });
});

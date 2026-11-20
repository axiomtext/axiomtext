import { afterEach, describe, expect, it, vi } from 'vitest';
import { definePlugin } from '@axiomtext/core';
import type { DocumentJSON, EditorCommand } from '@axiomtext/core';
import { toggleMark } from 'prosemirror-commands';
import { createEditor } from '../src';
import type { Editor } from '../src';

const Bold = definePlugin({
  name: 'bold',
  marks: { bold: { parseDOM: [{ tag: 'strong' }], toDOM: () => ['strong', 0] } },
  commands: {
    toggleBold: (): EditorCommand => (state, dispatch) => {
      const bold = state.schema.marks['bold'];
      return bold ? toggleMark(bold)(state, dispatch) : false;
    },
  },
});

const content: DocumentJSON = {
  version: 1,
  doc: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello AxiomText' }] }],
  },
};

let editor: Editor | undefined;
afterEach(() => editor?.destroy());

function mount(opts: Partial<Parameters<typeof createEditor>[0]> = {}): Editor {
  const element = document.createElement('div');
  document.body.appendChild(element);
  editor = createEditor({ element, plugins: [Bold], ...opts });
  return editor;
}

describe('createEditor', () => {
  it('renders initial content and round-trips JSON', () => {
    const e = mount({ content });
    expect(e.getJSON()).toEqual(content);
    expect(e.getHTML()).toBe('<p>Hello AxiomText</p>');
    expect(e.getText()).toBe('Hello AxiomText');
  });

  it('starts with an empty paragraph and placeholder', () => {
    const e = mount({ placeholder: 'Start writing…' });
    expect(e.getText()).toBe('');
    expect(document.querySelector('[data-placeholder="Start writing…"]')).not.toBeNull();
  });

  it('runs plugin commands and reports unknown ones', () => {
    const e = mount({ content });
    expect(e.commandNames).toContain('toggleBold');
    expect(() => e.execute('nope')).toThrow(/AXIOM_E_UNKNOWN_COMMAND/);
  });

  it('emits change events and supports undo', () => {
    const e = mount({ content });
    const onChange = vi.fn();
    e.on('change', onChange);
    e.setJSON({
      version: 1,
      doc: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }],
      },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(e.getText()).toBe('x');
  });

  it('rejects content that does not fit the schema', () => {
    const bad = {
      version: 1,
      doc: { type: 'doc', content: [{ type: 'script', content: [] }] },
    } as DocumentJSON;
    expect(() => mount({ content: bad })).toThrow();
  });

  it('is accessible as a multiline textbox', () => {
    mount({ ariaLabel: 'Body' });
    const el = document.querySelector('.axiomtext-content');
    expect(el?.getAttribute('role')).toBe('textbox');
    expect(el?.getAttribute('aria-label')).toBe('Body');
  });

  it('throws after destroy', () => {
    const e = mount();
    e.destroy();
    expect(() => e.execute('toggleBold')).toThrow(/AXIOM_E_DESTROYED/);
    editor = undefined;
  });
});

describe('UI state helpers', () => {
  it('reports active marks and undo availability', () => {
    const e = mount({ content });
    expect(e.isActive('bold')).toBe(false);
    expect(e.canUndo()).toBe(false);
    expect(e.isActive('paragraph')).toBe(true);
    expect(e.isActive('heading')).toBe(false);
  });

  it('emits update events', () => {
    const e = mount({ content });
    const onUpdate = vi.fn();
    e.on('update', onUpdate);
    e.execute('toggleBold');
    expect(onUpdate).toHaveBeenCalled();
    expect(e.isActive('bold')).toBe(true); // stored mark on empty selection
  });
});

describe('countStats', () => {
  it('counts English, Bangla and empty text', async () => {
    const { countStats } = await import('../src');
    expect(countStats('')).toEqual({ words: 0, characters: 0 });
    expect(countStats('Hello free editor')).toEqual({ words: 3, characters: 17 });
    // "আমি বাংলায় লিখি" = 3 words; grapheme clusters, not code points
    const bn = countStats('আমি বাংলায় লিখি');
    expect(bn.words).toBe(3);
    expect(bn.characters).toBeLessThan('আমি বাংলায় লিখি'.length);
  });
});

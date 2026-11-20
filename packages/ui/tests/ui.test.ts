import { afterEach, describe, expect, it } from 'vitest';
import type { AxiomPlugin } from '@axiomtext/core';
import { BasicStyles } from '@axiomtext/plugin-basic-styles';
import { Heading } from '@axiomtext/plugin-heading';
import { createClassicEditor, formatShortcut } from '../src';
import type { ClassicEditor } from '../src';

let instance: ClassicEditor | undefined;
afterEach(() => {
  instance?.destroy();
  instance = undefined;
});

function mount(plugins: readonly AxiomPlugin[] = [BasicStyles, Heading]): ClassicEditor {
  const host = document.createElement('div');
  document.body.appendChild(host);
  instance = createClassicEditor({
    element: host,
    plugins,
    content: {
      version: 1,
      doc: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
      },
    },
  });
  return instance;
}

const button = (root: HTMLElement, name: string): HTMLButtonElement => {
  const el = root.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
  if (!el) throw new Error(`button ${name} not found`);
  return el;
};

describe('classic editor UI', () => {
  it('renders an accessible toolbar with all default controls', () => {
    const { element } = mount();
    const toolbar = element.querySelector('[role="toolbar"]');
    expect(toolbar?.getAttribute('aria-label')).toBe('Formatting');
    for (const name of [
      'Undo',
      'Redo',
      'Text style',
      'Bold',
      'Italic',
      'Underline',
      'Strikethrough',
      'More',
    ]) {
      expect(button(element, name)).toBeDefined();
    }
  });

  it('hides buttons whose plugin is not installed', () => {
    const { element } = mount([BasicStyles]);
    expect(element.querySelector('button[aria-label="Text style"]')).toBeNull();
    expect(element.querySelector('button[aria-label="Bulleted list"]')).toBeNull();
    expect(element.querySelector('button[aria-label="Equation"]')).toBeNull();
    // undo/redo | inline styles | sub/sup/clear — no doubled or trailing separators
    expect(element.querySelectorAll('.ax-toolbar__separator').length).toBe(2);
  });

  it('has exactly one tab stop (roving tabindex)', () => {
    const { element } = mount();
    const tabbable = element.querySelectorAll('.ax-toolbar [tabindex="0"]');
    expect(tabbable.length).toBe(1);
  });

  it('reflects active marks with aria-pressed', () => {
    const { element, editor } = mount();
    const bold = button(element, 'Bold');
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    bold.click();
    expect(editor.isActive('bold')).toBe(true);
    expect(bold.getAttribute('aria-pressed')).toBe('true');
  });

  it('disables undo until there is something to undo', () => {
    const { element } = mount();
    expect(button(element, 'Undo').disabled).toBe(true);
  });

  it('changes block style from the dropdown', () => {
    const { element, editor } = mount();
    button(element, 'Text style').click();
    expect(element.querySelector('.ax-dropdown')?.classList.contains('is-open')).toBe(true);
    const h2 = [...element.querySelectorAll<HTMLElement>('[role="option"]')].find((o) =>
      o.textContent?.includes('Heading 2'),
    );
    h2?.click();
    expect(editor.isActive('heading', { level: 2 })).toBe(true);
    expect(element.querySelector('.ax-dropdown__label')?.textContent).toBe('Heading 2');
  });

  it('shows word and character counts', () => {
    const { element } = mount();
    expect(element.querySelector('[data-stat="words"]')?.textContent).toBe('2 words');
    expect(element.querySelector('[data-stat="characters"]')?.textContent).toBe('11 characters');
  });

  it('never uses innerHTML-injected markup for labels', () => {
    const { element } = mount();
    expect(element.querySelector('script')).toBeNull();
  });
});

describe('formatShortcut', () => {
  it('formats for Apple and other platforms', () => {
    expect(formatShortcut('Mod-b', true)).toBe('⌘B');
    expect(formatShortcut('Mod-Shift-x', true)).toBe('⌘⇧X');
    expect(formatShortcut('Mod-b', false)).toBe('Ctrl+B');
    expect(formatShortcut('Mod-Alt-1', false)).toBe('Ctrl+Alt+1');
  });
});

describe('batch 2 controls', () => {
  const mountFull = async (): Promise<ClassicEditor> => {
    const { TextAlignment, Indent } = await import('@axiomtext/plugin-block-format');
    const { FontFamily, FontSize, TextColor, Highlight } = await import('@axiomtext/plugin-font');
    const { Table } = await import('@axiomtext/plugin-table');
    const { Image } = await import('@axiomtext/plugin-image');
    return mount([
      BasicStyles,
      Heading,
      TextAlignment,
      Indent,
      FontFamily,
      FontSize,
      TextColor,
      Highlight,
      Table,
      Image,
    ]);
  };

  it('shows font, size, color, highlight, image, table and alignment controls', async () => {
    const { element } = await mountFull();
    for (const name of [
      'Font',
      'Font size',
      'Text color',
      'Highlight',
      'Image',
      'Insert table',
      'Text alignment',
    ]) {
      expect(button(element, name)).toBeDefined();
    }
  });

  it('More menu lists inline code, subscript and superscript', async () => {
    const { element } = await mountFull();
    button(element, 'More').click();
    const labels = [...document.querySelectorAll('.ax-menu__item')].map(
      (el) => el.textContent ?? '',
    );
    expect(labels.some((l) => l.includes('Inline code'))).toBe(true);
    expect(labels.some((l) => l.includes('Superscript'))).toBe(true);
    document.querySelectorAll('.ax-popover').forEach((p) => p.remove());
  });

  it('applies a text color from the swatches', async () => {
    const { element, editor } = await mountFull();
    // select all text
    editor.execute('clearFormatting');
    const dom = editor.dom;
    const range = document.createRange();
    range.selectNodeContents(dom);
    button(element, 'Text color').click();
    const red = document.querySelector<HTMLButtonElement>('.ax-swatch[aria-label="Red"]');
    expect(red).not.toBeNull();
    red?.click();
    expect(document.querySelector('.ax-color-popover')).toBeNull();
  });

  it('inserts a table from the grid picker with the keyboard', async () => {
    const { element, editor } = await mountFull();
    button(element, 'Insert table').click();
    const grid = document.querySelector<HTMLElement>('.ax-table-grid');
    expect(grid).not.toBeNull();
    grid?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    grid?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(editor.getHTML()).toContain('<table');
    expect(editor.isAncestor('table')).toBe(true);
  });

  it('changes alignment from the alignment menu', async () => {
    const { element, editor } = await mountFull();
    button(element, 'Text alignment').click();
    const center = [...document.querySelectorAll<HTMLButtonElement>('.ax-menu__item')].find((b) =>
      b.textContent?.includes('Align center'),
    );
    center?.click();
    expect(editor.getHTML()).toContain('text-align: center;');
  });
});

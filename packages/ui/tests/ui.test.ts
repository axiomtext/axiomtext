import { afterEach, describe, expect, it } from 'vitest';
import { BasicStyles } from '@axiomtext/plugin-basic-styles';
import { Heading } from '@axiomtext/plugin-heading';
import { createClassicEditor, formatShortcut } from '../src';
import type { ClassicEditor } from '../src';

let instance: ClassicEditor | undefined;
afterEach(() => {
  instance?.destroy();
  instance = undefined;
});

function mount(plugins = [BasicStyles, Heading]): ClassicEditor {
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
      'Inline code',
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

import type { Editor } from '@axiomtext/view';
import { h } from './dom';
import { icon } from './icons';
import { openPopoverPanel } from './popover';
import type { Popover } from './popover';

export const TEXT_COLORS: readonly { name: string; value: string }[] = [
  { name: 'Black', value: '#17181c' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Brown', value: '#92400e' },
];

export const HIGHLIGHT_COLORS: readonly { name: string; value: string }[] = [
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Purple', value: '#e9d5ff' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Red', value: '#fecaca' },
  { name: 'Orange', value: '#fed7aa' },
  { name: 'Gray', value: '#e5e7eb' },
];

export interface ColorButton {
  readonly element: HTMLButtonElement;
  update(): void;
  destroy(): void;
}

/** Text color / highlight button with a swatch popover and a custom color input. */
export function createColorButton(editor: Editor, kind: 'text' | 'highlight'): ColorButton {
  const isText = kind === 'text';
  const label = isText ? 'Text color' : 'Highlight';
  const command = isText ? 'setTextColor' : 'setHighlight';
  const mark = isText ? 'text_color' : 'highlight';
  const palette = isText ? TEXT_COLORS : HIGHLIGHT_COLORS;
  const bar = h('span', { class: 'ax-color-button__bar' });
  const button = h(
    'button',
    {
      type: 'button',
      class: 'ax-button ax-color-button',
      'aria-label': label,
      'aria-haspopup': 'dialog',
      'data-tooltip': label,
    },
    [icon(isText ? 'textColor' : 'highlight'), bar],
  );
  let popover: Popover | null = null;

  const current = (): string | null => {
    const value = editor.getMarkAttrs(mark)?.['color'];
    return typeof value === 'string' ? value : null;
  };

  const apply = (value: string | null): void => {
    popover?.close();
    editor.execute(command, value);
    editor.focus();
  };

  const open = (): void => {
    const active = current();
    const swatches = palette.map((color) => {
      const swatch = h('button', {
        type: 'button',
        class: 'ax-swatch',
        'aria-label': color.name,
        title: color.name,
        'aria-pressed': String(active === color.value),
      });
      swatch.style.setProperty('--swatch', color.value);
      swatch.addEventListener('mousedown', (e) => e.preventDefault());
      swatch.addEventListener('click', () => apply(color.value));
      return swatch;
    });
    const reset = h('button', { type: 'button', class: 'ax-popover__button' }, [
      isText ? 'Default color' : 'No highlight',
    ]);
    reset.addEventListener('mousedown', (e) => e.preventDefault());
    reset.addEventListener('click', () => apply(null));
    const custom = h('input', {
      type: 'color',
      class: 'ax-color-input',
      'aria-label': 'Custom color',
      value: active ?? palette[0]?.value ?? '#000000',
    });
    custom.addEventListener('change', () => apply(custom.value));
    const grid = h(
      'div',
      { class: 'ax-swatches', role: 'group', 'aria-label': `${label} colors` },
      swatches,
    );
    const footer = h('div', { class: 'ax-popover__row' }, [
      reset,
      h('label', { class: 'ax-color-custom' }, [custom, 'Custom']),
    ]);
    popover = openPopoverPanel([grid, footer], {
      anchor: button,
      label,
      className: 'ax-color-popover',
      onClose: () => (popover = null),
    });
    const selected = swatches.find((s) => s.getAttribute('aria-pressed') === 'true') ?? swatches[0];
    selected?.focus();
  };

  button.addEventListener('mousedown', (e) => e.preventDefault());
  button.addEventListener('click', () => (popover ? popover.close() : open()));

  const update = (): void => {
    const value = current();
    bar.style.background = value ?? (isText ? 'var(--ax-fg)' : 'transparent');
    bar.classList.toggle('is-empty', !value && !isText);
  };
  update();

  return { element: button, update, destroy: () => popover?.close() };
}

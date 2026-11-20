import type { Editor } from '@axiomtext/view';
import { h } from './dom';
import { icon } from './icons';
import type { IconName } from './icons';
import { openPopoverPanel } from './popover';
import type { Popover } from './popover';
import { formatShortcut } from './shortcuts';

export interface MenuItem {
  label: string;
  icon?: IconName;
  /** Rendered with this inline style (e.g. a font preview). */
  previewStyle?: string;
  shortcut?: string;
  run: (editor: Editor) => boolean;
  active?: (editor: Editor) => boolean;
  enabled?: (editor: Editor) => boolean;
}

export interface MenuButtonOptions {
  label: string;
  /** Icon shown on the button; otherwise the active item's label (or `text`) is shown. */
  icon?: IconName | ((editor: Editor) => IconName);
  text?: (editor: Editor) => string;
  /** Minimum width of the trigger (for text menus). */
  minWidth?: number;
  items: () => MenuItem[];
}

export interface MenuButton {
  readonly element: HTMLButtonElement;
  update(): void;
  destroy(): void;
}

/** A toolbar button that opens a menu (font, size, alignment, "more"…), with full keyboard support. */
export function createMenuButton(editor: Editor, options: MenuButtonOptions): MenuButton {
  const labelEl = h('span', { class: 'ax-menu-button__label' });
  const iconSlot = h('span', { class: 'ax-menu-button__icon' });
  const button = h(
    'button',
    {
      type: 'button',
      class: `ax-button ax-menu-button${options.icon ? '' : ' has-text'}`,
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-label': options.label,
      'data-tooltip': options.label,
    },
    [iconSlot, labelEl, icon('chevronDown', 14)],
  );
  if (options.minWidth) button.style.minWidth = `${options.minWidth}px`;
  let popover: Popover | null = null;

  const render = (): void => {
    if (options.icon) {
      const name = typeof options.icon === 'function' ? options.icon(editor) : options.icon;
      if (iconSlot.dataset['icon'] !== name) {
        iconSlot.replaceChildren(icon(name));
        iconSlot.dataset['icon'] = name;
      }
    }
    labelEl.textContent = options.text ? options.text(editor) : '';
    labelEl.hidden = !options.text;
  };

  const close = (): void => popover?.close();

  const open = (): void => {
    const items = options.items();
    const elements = items.map((item) => {
      const active = item.active?.(editor) ?? false;
      const enabled = item.enabled?.(editor) ?? true;
      const label = h('span', { class: 'ax-menu__label' }, [item.label]);
      if (item.previewStyle) label.setAttribute('style', item.previewStyle);
      const el = h(
        'button',
        {
          type: 'button',
          role: 'menuitemcheckbox',
          class: 'ax-menu__item',
          'aria-checked': String(active),
          disabled: !enabled,
          tabindex: '-1',
        },
        [
          item.icon ? icon(item.icon, 16) : h('span', { class: 'ax-menu__spacer' }),
          label,
          item.shortcut
            ? h('kbd', { class: 'ax-kbd' }, [formatShortcut(item.shortcut)])
            : h('span'),
        ],
      );
      el.addEventListener('mousedown', (e) => e.preventDefault());
      el.addEventListener('click', () => {
        close();
        item.run(editor);
        editor.focus();
      });
      return el;
    });
    const list = h('div', { class: 'ax-menu' }, elements);
    list.addEventListener('keydown', (event) => {
      const focusable = elements.filter((el) => !el.disabled);
      const index = focusable.indexOf(document.activeElement as HTMLButtonElement);
      const move = (i: number): void =>
        focusable[(i + focusable.length) % focusable.length]?.focus();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        move(index + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        move(index - 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        move(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        move(focusable.length - 1);
      } else if (event.key === 'Tab') {
        close();
      }
    });
    popover = openPopoverPanel([list], {
      anchor: button,
      label: options.label,
      role: 'menu',
      className: 'ax-menu-popover',
      onClose: () => {
        button.setAttribute('aria-expanded', 'false');
        popover = null;
      },
    });
    button.setAttribute('aria-expanded', 'true');
    const current = elements.find(
      (el) => el.getAttribute('aria-checked') === 'true' && !el.disabled,
    );
    (current ?? elements.find((el) => !el.disabled))?.focus();
  };

  button.addEventListener('mousedown', (e) => e.preventDefault());
  button.addEventListener('click', () => (popover ? close() : open()));
  button.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      open();
    }
  });
  render();

  return {
    element: button,
    update: render,
    destroy() {
      close();
      button.remove();
    },
  };
}

import { t } from '@axiomtext/i18n';
import type { Editor } from '@axiomtext/view';
import { h, uid } from './dom';
import { icon } from './icons';
import type { IconName } from './icons';
import { formatShortcut } from './shortcuts';

interface BlockOption {
  label: string;
  icon: IconName;
  command: string;
  args: unknown[];
  shortcut: string;
  /** For active-state detection. */
  node: string;
  attrs?: Record<string, unknown>;
  className: string;
}

const OPTIONS: BlockOption[] = [
  {
    label: 'Paragraph',
    icon: 'paragraph',
    command: 'setParagraph',
    args: [],
    shortcut: 'Mod-Alt-0',
    node: 'paragraph',
    className: 'is-paragraph',
  },
  {
    label: 'Heading 1',
    icon: 'heading1',
    command: 'setHeading',
    args: [1],
    shortcut: 'Mod-Alt-1',
    node: 'heading',
    attrs: { level: 1 },
    className: 'is-h1',
  },
  {
    label: 'Heading 2',
    icon: 'heading2',
    command: 'setHeading',
    args: [2],
    shortcut: 'Mod-Alt-2',
    node: 'heading',
    attrs: { level: 2 },
    className: 'is-h2',
  },
  {
    label: 'Heading 3',
    icon: 'heading3',
    command: 'setHeading',
    args: [3],
    shortcut: 'Mod-Alt-3',
    node: 'heading',
    attrs: { level: 3 },
    className: 'is-h3',
  },
  {
    label: 'Heading 4',
    icon: 'heading4',
    command: 'setHeading',
    args: [4],
    shortcut: 'Mod-Alt-4',
    node: 'heading',
    attrs: { level: 4 },
    className: 'is-h4',
  },
];

export interface BlockStyleDropdown {
  readonly element: HTMLElement;
  /** Re-read editor state (called by the toolbar on every update). */
  update(): void;
  /** The focusable trigger button (for toolbar keyboard navigation). */
  readonly trigger: HTMLButtonElement;
  destroy(): void;
}

/** "Text style" dropdown: Paragraph / Heading 1–4, as an accessible listbox. */
export function createBlockStyleDropdown(editor: Editor): BlockStyleDropdown {
  const available = OPTIONS.filter((o) => editor.commandNames.includes(o.command));
  const listId = uid('ax-blockstyle-list');
  const label = h('span', { class: 'ax-dropdown__label' }, ['Paragraph']);
  const trigger = h(
    'button',
    {
      type: 'button',
      class: 'ax-dropdown__trigger',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-controls': listId,
      'aria-label': 'Text style',
      'data-tooltip': 'Text style',
    },
    [label, icon('chevronDown', 16)],
  );

  const optionEls = available.map((option, index) =>
    h(
      'li',
      {
        role: 'option',
        id: `${listId}-${index}`,
        class: `ax-dropdown__option ${option.className}`,
        'aria-selected': 'false',
      },
      [
        icon(option.icon, 16),
        h('span', { class: 'ax-dropdown__option-label' }, [option.label]),
        h('kbd', { class: 'ax-kbd' }, [formatShortcut(option.shortcut)]),
      ],
    ),
  );
  const list = h(
    'ul',
    {
      role: 'listbox',
      id: listId,
      class: 'ax-dropdown__menu',
      tabindex: '-1',
      'aria-label': 'Text style',
    },
    optionEls,
  );
  const element = h('div', { class: 'ax-dropdown' }, [trigger, list]);

  let open = false;
  let highlighted = 0;

  const currentIndex = (): number => {
    const idx = available.findIndex((o) => editor.isActive(o.node, o.attrs));
    return idx === -1 ? 0 : idx;
  };

  const highlight = (index: number): void => {
    highlighted = (index + available.length) % available.length;
    optionEls.forEach((el, i) => el.classList.toggle('is-highlighted', i === highlighted));
    list.setAttribute('aria-activedescendant', `${listId}-${highlighted}`);
    optionEls[highlighted]?.scrollIntoView?.({ block: 'nearest' });
  };

  const setOpen = (value: boolean, focusTrigger = false): void => {
    open = value;
    trigger.setAttribute('aria-expanded', String(value));
    element.classList.toggle('is-open', value);
    if (value) {
      highlight(currentIndex());
      list.focus();
      document.addEventListener('pointerdown', onOutside, true);
    } else {
      document.removeEventListener('pointerdown', onOutside, true);
      if (focusTrigger) trigger.focus();
    }
  };

  const choose = (index: number): void => {
    const option = available[index];
    setOpen(false);
    if (option) editor.execute(option.command, ...option.args);
    editor.focus();
  };

  function onOutside(event: Event): void {
    if (!element.contains(event.target as Node)) setOpen(false);
  }

  trigger.addEventListener('mousedown', (e) => e.preventDefault());
  trigger.addEventListener('click', () => setOpen(!open));
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
    }
  });
  list.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        highlight(highlighted + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        highlight(highlighted - 1);
        break;
      case 'Home':
        e.preventDefault();
        highlight(0);
        break;
      case 'End':
        e.preventDefault();
        highlight(available.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(highlighted);
        break;
      case 'Escape':
      case 'Tab':
        e.preventDefault();
        setOpen(false, true);
        break;
    }
  });
  optionEls.forEach((el, index) => {
    el.addEventListener('mousedown', (e) => e.preventDefault());
    el.addEventListener('mouseenter', () => highlight(index));
    el.addEventListener('click', () => choose(index));
  });

  const update = (): void => {
    const idx = currentIndex();
    const text = t(available[idx]?.label ?? 'Paragraph');
    label.textContent = text;
    // The visible text is part of the accessible name (WCAG 2.5.3 Label in Name).
    trigger.setAttribute('aria-label', `${text}, ${t('Text style')}`);
    optionEls.forEach((el, i) => el.setAttribute('aria-selected', String(i === idx)));
  };
  update();

  return {
    element,
    trigger,
    update,
    destroy() {
      document.removeEventListener('pointerdown', onOutside, true);
      element.remove();
    },
  };
}

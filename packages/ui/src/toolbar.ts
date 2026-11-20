import type { Editor } from '@axiomtext/view';
import { createBlockStyleDropdown } from './block-style';
import type { BlockStyleDropdown } from './block-style';
import { h } from './dom';
import { icon } from './icons';
import type { IconName } from './icons';
import { formatShortcut } from './shortcuts';

export type ToolbarItemName =
  | 'undo'
  | 'redo'
  | 'blockStyle'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'subscript'
  | 'superscript'
  | 'clearFormatting'
  | 'link'
  | 'bulletedList'
  | 'numberedList'
  | 'todoList'
  | 'blockquote'
  | 'horizontalRule'
  | 'math'
  | 'mathBlock'
  | '|';

export const DEFAULT_TOOLBAR: readonly ToolbarItemName[] = [
  'undo',
  'redo',
  '|',
  'blockStyle',
  '|',
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'code',
  '|',
  'link',
  'math',
  '|',
  'bulletedList',
  'numberedList',
  'todoList',
  '|',
  'blockquote',
  'horizontalRule',
  'mathBlock',
  '|',
  'subscript',
  'superscript',
  'clearFormatting',
];

interface ButtonSpec {
  label: string;
  icon: IconName;
  shortcut: string;
  run: (editor: Editor) => boolean;
  /** Toggle buttons report pressed state. */
  active?: (editor: Editor) => boolean;
  enabled?: (editor: Editor) => boolean;
  /** Command that must exist for the button to be shown. */
  requires?: string;
}

const BUTTONS: Record<Exclude<ToolbarItemName, '|' | 'blockStyle'>, ButtonSpec> = {
  undo: {
    label: 'Undo',
    icon: 'undo',
    shortcut: 'Mod-z',
    run: (e) => e.undo(),
    enabled: (e) => e.canUndo(),
  },
  redo: {
    label: 'Redo',
    icon: 'redo',
    shortcut: 'Mod-Shift-z',
    run: (e) => e.redo(),
    enabled: (e) => e.canRedo(),
  },
  bold: {
    label: 'Bold',
    icon: 'bold',
    shortcut: 'Mod-b',
    requires: 'toggleBold',
    run: (e) => e.execute('toggleBold'),
    active: (e) => e.isActive('bold'),
  },
  italic: {
    label: 'Italic',
    icon: 'italic',
    shortcut: 'Mod-i',
    requires: 'toggleItalic',
    run: (e) => e.execute('toggleItalic'),
    active: (e) => e.isActive('italic'),
  },
  underline: {
    label: 'Underline',
    icon: 'underline',
    shortcut: 'Mod-u',
    requires: 'toggleUnderline',
    run: (e) => e.execute('toggleUnderline'),
    active: (e) => e.isActive('underline'),
  },
  strikethrough: {
    label: 'Strikethrough',
    icon: 'strikethrough',
    shortcut: 'Mod-Shift-x',
    requires: 'toggleStrikethrough',
    run: (e) => e.execute('toggleStrikethrough'),
    active: (e) => e.isActive('strikethrough'),
  },
  code: {
    label: 'Inline code',
    icon: 'code',
    shortcut: 'Mod-e',
    requires: 'toggleCode',
    run: (e) => e.execute('toggleCode'),
    active: (e) => e.isActive('code'),
  },
  subscript: {
    label: 'Subscript',
    icon: 'subscript',
    shortcut: 'Mod-,',
    requires: 'toggleSubscript',
    run: (e) => e.execute('toggleSubscript'),
    active: (e) => e.isActive('subscript'),
  },
  superscript: {
    label: 'Superscript',
    icon: 'superscript',
    shortcut: 'Mod-.',
    requires: 'toggleSuperscript',
    run: (e) => e.execute('toggleSuperscript'),
    active: (e) => e.isActive('superscript'),
  },
  clearFormatting: {
    label: 'Clear formatting',
    icon: 'clearFormatting',
    shortcut: 'Mod-\\',
    requires: 'clearFormatting',
    run: (e) => e.execute('clearFormatting'),
    enabled: (e) => e.can('clearFormatting'),
  },
  link: {
    label: 'Link',
    icon: 'link',
    shortcut: 'Mod-k',
    requires: 'setLink',
    run: () => false,
    active: (e) => e.isActive('link'),
  },
  bulletedList: {
    label: 'Bulleted list',
    icon: 'bulletedList',
    shortcut: 'Mod-Shift-8',
    requires: 'toggleBulletList',
    run: (e) => e.execute('toggleBulletList'),
    active: (e) => e.isAncestor('bullet_list'),
  },
  numberedList: {
    label: 'Numbered list',
    icon: 'numberedList',
    shortcut: 'Mod-Shift-7',
    requires: 'toggleOrderedList',
    run: (e) => e.execute('toggleOrderedList'),
    active: (e) => e.isAncestor('ordered_list'),
  },
  todoList: {
    label: 'To-do list',
    icon: 'todoList',
    shortcut: 'Mod-Shift-9',
    requires: 'toggleTaskList',
    run: (e) => e.execute('toggleTaskList'),
    active: (e) => e.isAncestor('task_list'),
  },
  blockquote: {
    label: 'Quote',
    icon: 'quote',
    shortcut: 'Mod-Shift-.',
    requires: 'toggleBlockquote',
    run: (e) => e.execute('toggleBlockquote'),
    active: (e) => e.isAncestor('blockquote'),
  },
  horizontalRule: {
    label: 'Horizontal line',
    icon: 'horizontalRule',
    shortcut: '',
    requires: 'insertHorizontalRule',
    run: (e) => e.execute('insertHorizontalRule'),
  },
  math: {
    label: 'Equation',
    icon: 'math',
    shortcut: 'Mod-Shift-m',
    requires: 'insertMath',
    run: (e) => e.execute('insertMath'),
  },
  mathBlock: {
    label: 'Block equation',
    icon: 'mathBlock',
    shortcut: 'Mod-Alt-m',
    requires: 'insertMathBlock',
    run: (e) => e.execute('insertMathBlock'),
  },
};

export interface ToolbarOptions {
  items?: readonly ToolbarItemName[];
  /** Called by the Link button (the classic editor opens its link popover). */
  onLink?: () => void;
  /** Accessible name of the toolbar. */
  ariaLabel?: string;
}

export interface Toolbar {
  readonly element: HTMLElement;
  /** Move keyboard focus into the toolbar (Alt+F10 from the editor). */
  focus(): void;
  destroy(): void;
}

/**
 * Accessible formatting toolbar (WAI-ARIA toolbar pattern):
 * one tab stop, arrow keys move between controls, Escape returns to the text.
 */
export function createToolbar(editor: Editor, options: ToolbarOptions = {}): Toolbar {
  const element = h('div', {
    class: 'ax-toolbar',
    role: 'toolbar',
    'aria-label': options.ariaLabel ?? 'Formatting',
    'aria-orientation': 'horizontal',
  });

  const updaters: (() => void)[] = [];
  const focusables: HTMLElement[] = [];
  let dropdown: BlockStyleDropdown | undefined;

  const items = (options.items ?? DEFAULT_TOOLBAR).filter((item) => {
    if (item === '|') return true;
    if (item === 'blockStyle') return editor.commandNames.includes('setHeading');
    const req = BUTTONS[item].requires;
    return req === undefined || editor.commandNames.includes(req);
  });

  // Drop leading, trailing and doubled separators left after filtering.
  const cleaned = items.filter(
    (item, i) => item !== '|' || (i > 0 && i < items.length - 1 && items[i - 1] !== '|'),
  );

  for (const item of cleaned) {
    if (item === '|') {
      element.append(
        h('span', {
          class: 'ax-toolbar__separator',
          role: 'separator',
          'aria-orientation': 'vertical',
        }),
      );
      continue;
    }
    if (item === 'blockStyle') {
      dropdown = createBlockStyleDropdown(editor);
      element.append(dropdown.element);
      focusables.push(dropdown.trigger);
      updaters.push(() => dropdown?.update());
      continue;
    }
    const spec = BUTTONS[item];
    const shortcut = spec.shortcut ? formatShortcut(spec.shortcut) : '';
    const button = h(
      'button',
      {
        type: 'button',
        class: 'ax-button',
        'aria-label': spec.label,
        'aria-keyshortcuts': spec.shortcut
          ? spec.shortcut.replace('Mod', 'Control').replace(/-/g, '+')
          : undefined,
        'data-tooltip': shortcut ? `${spec.label}  ${shortcut}` : spec.label,
        'data-item': item,
        ...(spec.active ? { 'aria-pressed': 'false' } : {}),
      },
      [icon(spec.icon)],
    );
    // Keep the text selection when clicking.
    button.addEventListener('mousedown', (e) => e.preventDefault());
    button.addEventListener('click', () => {
      if (item === 'link') {
        options.onLink?.();
        return;
      }
      spec.run(editor);
      editor.focus();
    });
    element.append(button);
    focusables.push(button);
    updaters.push(() => {
      if (spec.active) {
        const active = spec.active(editor);
        button.setAttribute('aria-pressed', String(active));
        button.classList.toggle('is-active', active);
      }
      if (spec.enabled) {
        const enabled = spec.enabled(editor);
        button.disabled = !enabled;
        button.setAttribute('aria-disabled', String(!enabled));
      }
    });
  }

  // Roving tabindex: exactly one control is in the tab order.
  let current = 0;
  const isEnabled = (el: HTMLElement): boolean => !(el as HTMLButtonElement).disabled;
  const enabledItems = (): HTMLElement[] => focusables.filter(isEnabled);

  /** Focus the n-th *enabled* control (wraps around). */
  const focusEnabled = (index: number): void => {
    const enabled = enabledItems();
    if (enabled.length === 0) return;
    const target = enabled[(index + enabled.length) % enabled.length];
    if (!target) return;
    current = focusables.indexOf(target);
    focusables.forEach((el) => el.setAttribute('tabindex', el === target ? '0' : '-1'));
    target.focus();
  };

  /** Focus the remembered control, or the first enabled one. */
  const focusCurrent = (): void => {
    const remembered = focusables[current];
    const enabled = enabledItems();
    focusEnabled(remembered && isEnabled(remembered) ? enabled.indexOf(remembered) : 0);
  };

  element.addEventListener('keydown', (event) => {
    if ((event.target as HTMLElement).closest('[role="listbox"]')) return;
    const enabled = enabledItems();
    const pos = enabled.indexOf(document.activeElement as HTMLElement);
    const rtl = getComputedStyle(element).direction === 'rtl';
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusEnabled(pos + (rtl ? -1 : 1));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusEnabled(pos + (rtl ? 1 : -1));
        break;
      case 'Home':
        event.preventDefault();
        focusEnabled(0);
        break;
      case 'End':
        event.preventDefault();
        focusEnabled(enabled.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        editor.focus();
        break;
    }
  });
  element.addEventListener('focusin', (event) => {
    const idx = focusables.indexOf(event.target as HTMLElement);
    if (idx !== -1) {
      current = idx;
      focusables.forEach((el, i) => el.setAttribute('tabindex', i === idx ? '0' : '-1'));
    }
  });

  // Alt+F10 (Option+F10 on Mac) jumps from the text to the toolbar, like CKEditor and Word.
  const onEditorKeydown = (event: KeyboardEvent): void => {
    if (event.altKey && event.key === 'F10') {
      event.preventDefault();
      focusCurrent();
    }
  };
  editor.dom.addEventListener('keydown', onEditorKeydown);

  const refresh = (): void => {
    updaters.forEach((update) => update());
    const remembered = focusables[current];
    if (!remembered || !isEnabled(remembered)) {
      const firstEnabled = focusables.findIndex(isEnabled);
      current = firstEnabled === -1 ? 0 : firstEnabled;
    }
    focusables.forEach((el, i) => el.setAttribute('tabindex', i === current ? '0' : '-1'));
  };
  const unsubscribe = editor.on('update', refresh);
  refresh();

  return {
    element,
    focus: focusCurrent,
    destroy() {
      unsubscribe();
      editor.dom.removeEventListener('keydown', onEditorKeydown);
      dropdown?.destroy();
      element.remove();
    },
  };
}

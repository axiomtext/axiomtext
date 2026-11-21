import { t } from '@axiomtext/i18n';
import type { Editor } from '@axiomtext/view';
import { createBlockStyleDropdown } from './block-style';
import { createColorButton } from './color-button';
import { h } from './dom';
import { icon } from './icons';
import type { IconName } from './icons';
import { createImageButton } from './image-ui';
import { createMenuButton } from './menu-button';
import type { MenuItem } from './menu-button';
import { formatShortcut } from './shortcuts';
import { createTableButton } from './table-button';
import { normalizeMarkTypes } from '@axiomtext/plugin-marks/data';

export type ToolbarItemName =
  | 'undo'
  | 'redo'
  | 'blockStyle'
  | 'fontFamily'
  | 'fontSize'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'subscript'
  | 'superscript'
  | 'textColor'
  | 'highlight'
  | 'clearFormatting'
  | 'link'
  | 'image'
  | 'table'
  | 'math'
  | 'mathBlock'
  | 'align'
  | 'bulletedList'
  | 'numberedList'
  | 'todoList'
  | 'outdent'
  | 'indent'
  | 'blockquote'
  | 'horizontalRule'
  | 'pageBreak'
  | 'shortcuts'
  | 'comment'
  | 'commentsPanel'
  | 'mark'
  | 'page'
  | 'more'
  | '|';

/** Default toolbar. Buttons that don't fit move into the "More" menu automatically. */
export const DEFAULT_TOOLBAR: readonly ToolbarItemName[] = [
  'undo',
  'redo',
  '|',
  'blockStyle',
  'fontFamily',
  'fontSize',
  '|',
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'textColor',
  'highlight',
  'mark',
  '|',
  'link',
  'image',
  'table',
  'math',
  'comment',
  '|',
  'align',
  'bulletedList',
  'numberedList',
  'todoList',
  'outdent',
  'indent',
  '|',
  'commentsPanel',
  'more',
];

/** Order in which buttons move into "More" when space runs out (first = first to go). */
const OVERFLOW_PRIORITY: readonly ToolbarItemName[] = [
  'indent',
  'outdent',
  'todoList',
  'strikethrough',
  'underline',
  'numberedList',
  'bulletedList',
  'link',
  'math',
  'commentsPanel',
];

/** Items always shown in the "More" menu. */
export const DEFAULT_MORE: readonly ToolbarItemName[] = [
  'code',
  'subscript',
  'superscript',
  'blockquote',
  'horizontalRule',
  'pageBreak',
  'page',
  'mathBlock',
  'clearFormatting',
  'shortcuts',
];

interface ButtonSpec {
  label: string;
  icon: IconName;
  shortcut?: string;
  run: (editor: Editor) => boolean;
  active?: (editor: Editor) => boolean;
  enabled?: (editor: Editor) => boolean;
  /** Command that must exist for the button to be shown. */
  requires?: string;
}

type ButtonName = Exclude<
  ToolbarItemName,
  | '|'
  | 'blockStyle'
  | 'fontFamily'
  | 'fontSize'
  | 'textColor'
  | 'highlight'
  | 'image'
  | 'table'
  | 'align'
  | 'mark'
  | 'more'
>;

const exec =
  (command: string, ...args: unknown[]) =>
  (e: Editor) =>
    e.execute(command, ...args);

const BUTTONS: Record<ButtonName, ButtonSpec> = {
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
    run: exec('toggleBold'),
    active: (e) => e.isActive('bold'),
  },
  italic: {
    label: 'Italic',
    icon: 'italic',
    shortcut: 'Mod-i',
    requires: 'toggleItalic',
    run: exec('toggleItalic'),
    active: (e) => e.isActive('italic'),
  },
  underline: {
    label: 'Underline',
    icon: 'underline',
    shortcut: 'Mod-u',
    requires: 'toggleUnderline',
    run: exec('toggleUnderline'),
    active: (e) => e.isActive('underline'),
  },
  strikethrough: {
    label: 'Strikethrough',
    icon: 'strikethrough',
    shortcut: 'Mod-Shift-x',
    requires: 'toggleStrikethrough',
    run: exec('toggleStrikethrough'),
    active: (e) => e.isActive('strikethrough'),
  },
  code: {
    label: 'Inline code',
    icon: 'code',
    shortcut: 'Mod-e',
    requires: 'toggleCode',
    run: exec('toggleCode'),
    active: (e) => e.isActive('code'),
  },
  subscript: {
    label: 'Subscript',
    icon: 'subscript',
    shortcut: 'Mod-,',
    requires: 'toggleSubscript',
    run: exec('toggleSubscript'),
    active: (e) => e.isActive('subscript'),
  },
  superscript: {
    label: 'Superscript',
    icon: 'superscript',
    shortcut: 'Mod-.',
    requires: 'toggleSuperscript',
    run: exec('toggleSuperscript'),
    active: (e) => e.isActive('superscript'),
  },
  clearFormatting: {
    label: 'Clear formatting',
    icon: 'clearFormatting',
    shortcut: 'Mod-\\',
    requires: 'clearFormatting',
    run: exec('clearFormatting'),
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
    run: exec('toggleBulletList'),
    active: (e) => e.isAncestor('bullet_list'),
  },
  numberedList: {
    label: 'Numbered list',
    icon: 'numberedList',
    shortcut: 'Mod-Shift-7',
    requires: 'toggleOrderedList',
    run: exec('toggleOrderedList'),
    active: (e) => e.isAncestor('ordered_list'),
  },
  todoList: {
    label: 'To-do list',
    icon: 'todoList',
    shortcut: 'Mod-Shift-9',
    requires: 'toggleTaskList',
    run: exec('toggleTaskList'),
    active: (e) => e.isAncestor('task_list'),
  },
  outdent: {
    label: 'Decrease indent',
    icon: 'outdent',
    shortcut: 'Mod-[',
    requires: 'outdentBlock',
    run: (e) =>
      e.can('outdentListItem') ? e.execute('outdentListItem') : e.execute('outdentBlock'),
    enabled: (e) =>
      (e.commandNames.includes('outdentListItem') && e.can('outdentListItem')) ||
      e.can('outdentBlock'),
  },
  indent: {
    label: 'Increase indent',
    icon: 'indent',
    shortcut: 'Mod-]',
    requires: 'indentBlock',
    run: (e) => (e.can('indentListItem') ? e.execute('indentListItem') : e.execute('indentBlock')),
    enabled: (e) =>
      (e.commandNames.includes('indentListItem') && e.can('indentListItem')) ||
      e.can('indentBlock'),
  },
  blockquote: {
    label: 'Quote',
    icon: 'quote',
    shortcut: 'Mod-Shift-.',
    requires: 'toggleBlockquote',
    run: exec('toggleBlockquote'),
    active: (e) => e.isAncestor('blockquote'),
  },
  horizontalRule: {
    label: 'Horizontal line',
    icon: 'horizontalRule',
    requires: 'insertHorizontalRule',
    run: exec('insertHorizontalRule'),
  },
  pageBreak: {
    label: 'Page break',
    icon: 'pageBreak',
    shortcut: 'Mod-Enter',
    requires: 'insertPageBreak',
    run: exec('insertPageBreak'),
  },
  math: {
    label: 'Equation',
    icon: 'math',
    shortcut: 'Mod-Shift-m',
    requires: 'insertMath',
    run: exec('insertMath'),
  },
  mathBlock: {
    label: 'Block equation',
    icon: 'mathBlock',
    shortcut: 'Mod-Alt-m',
    requires: 'insertMathBlock',
    run: exec('insertMathBlock'),
  },
  shortcuts: {
    label: 'Keyboard shortcuts',
    icon: 'keyboard',
    shortcut: 'Mod-/',
    run: () => false, // opened through ToolbarOptions.onShortcuts
  },
  comment: {
    label: 'Add comment',
    icon: 'comment',
    shortcut: 'Mod-Alt-m',
    requires: 'addComment',
    run: () => false, // opened through ToolbarOptions.onComment
    enabled: (e) => !e.getSelectionState().empty,
  },
  commentsPanel: {
    label: 'All comments',
    icon: 'comments',
    run: () => false, // opened through ToolbarOptions.onCommentsPanel
  },
  page: {
    label: 'Page number',
    icon: 'page',
    requires: 'insertPage',
    run: exec('insertPage'),
  },
};

/** How a mark type looks in the Mark menu (the same as in the text). */
export function markPreviewStyle(color: string, style: string): string {
  switch (style) {
    case 'underline':
      return `text-decoration: underline 2px ${color}; text-underline-offset: 3px`;
    case 'double':
      return `text-decoration: underline double ${color}; text-underline-offset: 3px`;
    case 'box':
      return `box-shadow: inset 0 0 0 1.5px ${color}; border-radius: 3px; padding: 0 4px`;
    default:
      return `background: color-mix(in srgb, ${color} 26%, transparent); border-radius: 3px; padding: 0 4px`;
  }
}

export const FONT_FAMILIES: readonly { label: string; value: string | null }[] = [
  { label: 'Default font', value: null },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Noto Sans Bengali', value: '"Noto Sans Bengali", sans-serif' },
];

export const FONT_SIZES: readonly (string | null)[] = [
  null,
  '12px',
  '14px',
  '16px',
  '18px',
  '20px',
  '24px',
  '30px',
  '36px',
  '48px',
];

const ALIGNMENTS: readonly {
  value: 'left' | 'center' | 'right' | 'justify';
  label: string;
  icon: IconName;
  shortcut: string;
}[] = [
  { value: 'left', label: 'Align left', icon: 'alignLeft', shortcut: 'Mod-Shift-l' },
  { value: 'center', label: 'Align center', icon: 'alignCenter', shortcut: 'Mod-Shift-e' },
  { value: 'right', label: 'Align right', icon: 'alignRight', shortcut: 'Mod-Shift-r' },
  { value: 'justify', label: 'Justify', icon: 'alignJustify', shortcut: 'Mod-Shift-j' },
];

export interface ToolbarOptions {
  items?: readonly ToolbarItemName[];
  /** Items always placed in the "More" menu. */
  more?: readonly ToolbarItemName[];
  /** Called by the Link button (the classic editor opens its link popover). */
  onLink?: () => void;
  /** Called by the "Keyboard shortcuts" item (the classic editor opens its help dialog). */
  onShortcuts?: () => void;
  /** Called by the "Comment" item (shown only when given). */
  onComment?: () => void;
  /** Called by the "Comments" item that opens the list of threads (shown only when given). */
  onCommentsPanel?: () => void;
  /** Accessible name of the toolbar. */
  ariaLabel?: string;
  /**
   * Move buttons that don't fit into "More" (default true). Floating toolbars that size to
   * their content turn this off and wrap instead.
   */
  overflow?: boolean;
}

export interface Toolbar {
  readonly element: HTMLElement;
  /** Move keyboard focus into the toolbar (Alt+F10 from the editor). */
  focus(): void;
  /** Recompute which buttons fit (called automatically on resize). */
  layout(): void;
  destroy(): void;
}

interface Entry {
  name: ToolbarItemName;
  element: HTMLElement;
  /** Element receiving focus in the roving tab order. */
  focusTarget?: HTMLElement;
  /** How this entry appears in the "More" menu when it doesn't fit. */
  menuItem?: MenuItem;
  update?: () => void;
  destroy?: () => void;
}

type Handlers = Partial<Record<string, (() => void) | undefined>>;

const specToMenuItem = (spec: ButtonSpec, handlers: Handlers, name?: string): MenuItem => ({
  label: spec.label,
  icon: spec.icon,
  ...(spec.shortcut ? { shortcut: spec.shortcut } : {}),
  run: (e) => {
    const handler = name ? handlers[name] : undefined;
    if (!handler) return spec.run(e);
    handler();
    return true;
  },
  ...(spec.active ? { active: spec.active } : {}),
  ...(spec.enabled ? { enabled: spec.enabled } : {}),
});

/**
 * Accessible formatting toolbar (WAI-ARIA toolbar pattern): one tab stop, arrow keys move between
 * controls, Escape returns to the text. Buttons that don't fit are grouped into "More".
 */
export function createToolbar(editor: Editor, options: ToolbarOptions = {}): Toolbar {
  const element = h('div', {
    class: 'ax-toolbar',
    role: 'toolbar',
    'aria-label': options.ariaLabel ?? 'Formatting',
    'aria-orientation': 'horizontal',
  });
  const has = (command: string): boolean => editor.commandNames.includes(command);
  const markTypes = normalizeMarkTypes(
    (editor.config['marks'] as { types?: readonly unknown[] } | undefined)?.types,
  );

  const handlers: Handlers = {
    link: options.onLink,
    shortcuts: options.onShortcuts,
    comment: options.onComment,
    commentsPanel: options.onCommentsPanel,
  };
  const available = (name: ToolbarItemName): boolean => {
    switch (name) {
      case '|':
      case 'more':
        return true;
      case 'blockStyle':
        return has('setHeading');
      case 'fontFamily':
        return has('setFontFamily');
      case 'fontSize':
        return has('setFontSize');
      case 'textColor':
        return has('setTextColor');
      case 'highlight':
        return has('setHighlight');
      case 'image':
        return has('insertImage');
      case 'table':
        return has('insertTable');
      case 'align':
        return has('setTextAlign');
      case 'mark':
        return has('setMark') && markTypes.length > 0;
      case 'shortcuts':
        return options.onShortcuts !== undefined;
      case 'comment':
        return options.onComment !== undefined && has('addComment');
      case 'commentsPanel':
        return options.onCommentsPanel !== undefined && has('addComment');
      default: {
        const req = BUTTONS[name].requires;
        return req === undefined || has(req);
      }
    }
  };

  const moreNames = (options.more ?? DEFAULT_MORE).filter(
    (n): n is ButtonName => n in BUTTONS && available(n),
  );
  const items = (options.items ?? DEFAULT_TOOLBAR).filter(available);
  const cleaned = items.filter(
    (item, i) => item !== '|' || (i > 0 && i < items.length - 1 && items[i - 1] !== '|'),
  );

  const entries: Entry[] = [];
  const overflowed = new Set<Entry>();

  const buildButton = (name: ButtonName): Entry => {
    const spec = BUTTONS[name];
    const shortcut = spec.shortcut ? formatShortcut(spec.shortcut) : '';
    const button = h(
      'button',
      {
        type: 'button',
        class: 'ax-button',
        'aria-label': t(spec.label),
        'aria-keyshortcuts': spec.shortcut
          ? spec.shortcut.replace('Mod', 'Control').replace(/-/g, '+')
          : undefined,
        'data-tooltip': shortcut ? `${t(spec.label)}  ${shortcut}` : t(spec.label),
        'data-item': name,
        ...(spec.active ? { 'aria-pressed': 'false' } : {}),
      },
      [icon(spec.icon)],
    );
    button.addEventListener('mousedown', (e) => e.preventDefault());
    button.addEventListener('click', () => {
      const handler = handlers[name];
      if (handler) {
        handler();
        return;
      }
      spec.run(editor);
      editor.focus();
    });
    return {
      name,
      element: button,
      focusTarget: button,
      menuItem: specToMenuItem(spec, handlers, name),
      update() {
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
      },
    };
  };

  for (const name of cleaned) {
    let entry: Entry;
    switch (name) {
      case '|':
        entry = {
          name,
          element: h('span', {
            class: 'ax-toolbar__separator',
            role: 'separator',
            'aria-orientation': 'vertical',
          }),
        };
        break;
      case 'blockStyle': {
        const dropdown = createBlockStyleDropdown(editor);
        entry = {
          name,
          element: dropdown.element,
          focusTarget: dropdown.trigger,
          update: dropdown.update,
          destroy: dropdown.destroy,
        };
        break;
      }
      case 'fontFamily': {
        const current = (): string | null => {
          const v = editor.getMarkAttrs('font_family')?.['family'];
          return typeof v === 'string' ? v : null;
        };
        const menu = createMenuButton(editor, {
          label: 'Font',
          minWidth: 92,
          text: () =>
            FONT_FAMILIES.find((f) => f.value === current())?.label.replace(
              'Default font',
              'Font',
            ) ?? 'Font',
          items: () =>
            FONT_FAMILIES.map((f) => ({
              label: f.label,
              ...(f.value ? { previewStyle: `font-family: ${f.value}` } : {}),
              run: (e: Editor) => e.execute('setFontFamily', f.value),
              active: () => current() === f.value,
            })),
        });
        entry = {
          name,
          element: menu.element,
          focusTarget: menu.element,
          update: menu.update,
          destroy: menu.destroy,
        };
        break;
      }
      case 'fontSize': {
        const current = (): string | null => {
          const v = editor.getMarkAttrs('font_size')?.['size'];
          return typeof v === 'string' ? v : null;
        };
        const menu = createMenuButton(editor, {
          label: 'Font size',
          minWidth: 56,
          text: () => current()?.replace('px', '') ?? 'Size',
          items: () =>
            FONT_SIZES.map((size) => ({
              label: size ? size.replace('px', '') : 'Default size',
              run: (e: Editor) => e.execute('setFontSize', size),
              active: () => current() === size,
            })),
        });
        entry = {
          name,
          element: menu.element,
          focusTarget: menu.element,
          update: menu.update,
          destroy: menu.destroy,
        };
        break;
      }
      case 'textColor':
      case 'highlight': {
        const color = createColorButton(editor, name === 'textColor' ? 'text' : 'highlight');
        entry = {
          name,
          element: color.element,
          focusTarget: color.element,
          update: color.update,
          destroy: color.destroy,
        };
        break;
      }
      case 'image': {
        const button = createImageButton(editor);
        entry = {
          name,
          element: button.element,
          focusTarget: button.element,
          destroy: button.destroy,
        };
        break;
      }
      case 'table': {
        const button = createTableButton(editor);
        entry = {
          name,
          element: button.element,
          focusTarget: button.element,
          destroy: button.destroy,
          update: () => {
            button.element.disabled = !editor.can('insertTable');
          },
        };
        break;
      }
      case 'align': {
        const current = (): string => {
          const v = editor.getBlockAttrs()['textAlign'];
          return typeof v === 'string' ? v : 'left';
        };
        const menu = createMenuButton(editor, {
          label: 'Text alignment',
          icon: () => ALIGNMENTS.find((a) => a.value === current())?.icon ?? 'alignLeft',
          items: () =>
            ALIGNMENTS.map((a) => ({
              label: a.label,
              icon: a.icon,
              shortcut: a.shortcut,
              run: (e: Editor) => e.execute('setTextAlign', a.value),
              active: () => current() === a.value,
            })),
        });
        entry = {
          name,
          element: menu.element,
          focusTarget: menu.element,
          update: menu.update,
          destroy: menu.destroy,
        };
        break;
      }
      case 'mark': {
        const current = (): string | null => {
          const v = editor.getMarkAttrs('marker')?.['type'];
          return typeof v === 'string' ? v : null;
        };
        const menu = createMenuButton(editor, {
          label: 'Mark',
          icon: 'mark',
          items: () => [
            ...markTypes.map((m, i) => ({
              label: t(m.label),
              previewStyle: markPreviewStyle(m.color, m.style),
              ...(i < 9 ? { shortcut: `Alt-${i + 1}` } : {}),
              run: (e: Editor) => e.execute('setMark', m.id),
              active: () => current() === m.id,
              enabled: (e: Editor) => !e.getSelectionState().empty,
            })),
            {
              label: 'Remove mark',
              icon: 'eraser' as const,
              shortcut: 'Alt-0',
              run: (e: Editor) => e.execute('removeMark'),
              enabled: (e: Editor) => e.can('removeMark'),
            },
          ],
        });
        entry = {
          name,
          element: menu.element,
          focusTarget: menu.element,
          update: () => {
            menu.update();
            const type = markTypes.find((m) => m.id === current());
            menu.element.classList.toggle('is-active', !!type);
            menu.element.style.setProperty('--ax-mark', type?.color ?? '');
          },
          destroy: menu.destroy,
        };
        break;
      }
      case 'more': {
        const menu = createMenuButton(editor, {
          label: 'More',
          icon: 'more',
          items: () => [
            ...entries
              .filter((e) => overflowed.has(e) && e.menuItem)
              .map((e) => e.menuItem as MenuItem),
            ...moreNames.map((n) => specToMenuItem(BUTTONS[n], handlers, n)),
          ],
        });
        entry = {
          name,
          element: menu.element,
          focusTarget: menu.element,
          update: menu.update,
          destroy: menu.destroy,
        };
        break;
      }
      default:
        entry = buildButton(name);
    }
    entries.push(entry);
    element.append(entry.element);
  }

  const moreEntry = entries.find((e) => e.name === 'more');

  // ── Overflow: move buttons that don't fit into "More" ──
  const isVisible = (e: Entry): boolean => !e.element.hidden;
  const fixSeparators = (): void => {
    let previousVisible: Entry | null = null;
    for (const e of entries) {
      if (e.name !== '|') {
        if (isVisible(e)) previousVisible = e;
        continue;
      }
      e.element.hidden = !previousVisible || previousVisible.name === '|';
      if (!e.element.hidden) previousVisible = e;
    }
    // Trailing separator
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (!e || !isVisible(e)) continue;
      if (e.name === '|') e.element.hidden = true;
      else break;
    }
  };
  const layout = (): void => {
    overflowed.clear();
    for (const e of entries) e.element.hidden = false;
    if (moreEntry) moreEntry.element.hidden = moreNames.length === 0;
    fixSeparators();
    if (options.overflow === false) return;
    if (element.clientWidth === 0) return; // not in the DOM / no layout (tests)
    const fits = (): boolean => element.scrollWidth <= element.clientWidth + 1;
    // Less important buttons move into "More" first; the rest go from the end.
    const rank = (e: Entry): number => {
      const i = OVERFLOW_PRIORITY.indexOf(e.name);
      return i === -1 ? OVERFLOW_PRIORITY.length + (entries.length - entries.indexOf(e)) : i;
    };
    const candidates = entries
      .filter((e) => e.menuItem && e.name !== 'more')
      .sort((a, b) => rank(a) - rank(b));
    for (const candidate of candidates) {
      if (fits()) break;
      if (moreEntry) moreEntry.element.hidden = false;
      candidate.element.hidden = true;
      overflowed.add(candidate);
      fixSeparators();
    }
  };

  // ── Roving tabindex: exactly one control is in the tab order ──
  let current = 0;
  const focusables = (): HTMLElement[] =>
    entries
      .filter(
        (e) => e.focusTarget && isVisible(e) && !(e.focusTarget as HTMLButtonElement).disabled,
      )
      .map((e) => e.focusTarget as HTMLElement);
  const allFocusTargets = (): HTMLElement[] =>
    entries.flatMap((e) => (e.focusTarget ? [e.focusTarget] : []));

  const focusIndex = (index: number): void => {
    const list = focusables();
    if (list.length === 0) return;
    const target = list[(index + list.length) % list.length];
    if (!target) return;
    current = allFocusTargets().indexOf(target);
    allFocusTargets().forEach((el) => el.setAttribute('tabindex', el === target ? '0' : '-1'));
    target.focus();
  };
  const focusCurrent = (): void => {
    const list = focusables();
    const remembered = allFocusTargets()[current];
    focusIndex(remembered && list.includes(remembered) ? list.indexOf(remembered) : 0);
  };

  element.addEventListener('keydown', (event) => {
    if ((event.target as HTMLElement).closest('[role="listbox"]')) return;
    const list = focusables();
    const pos = list.indexOf(document.activeElement as HTMLElement);
    if (pos === -1) return;
    const rtl = getComputedStyle(element).direction === 'rtl';
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusIndex(pos + (rtl ? -1 : 1));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusIndex(pos + (rtl ? 1 : -1));
        break;
      case 'Home':
        event.preventDefault();
        focusIndex(0);
        break;
      case 'End':
        event.preventDefault();
        focusIndex(list.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        editor.focus();
        break;
    }
  });
  element.addEventListener('focusin', (event) => {
    const all = allFocusTargets();
    const idx = all.indexOf(event.target as HTMLElement);
    if (idx !== -1) {
      current = idx;
      all.forEach((el, i) => el.setAttribute('tabindex', i === idx ? '0' : '-1'));
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
    entries.forEach((e) => e.update?.());
    const list = focusables();
    const all = allFocusTargets();
    const remembered = all[current];
    const active = remembered && list.includes(remembered) ? remembered : list[0];
    all.forEach((el) => el.setAttribute('tabindex', el === active ? '0' : '-1'));
  };
  const unsubscribe = editor.on('update', refresh);
  refresh();

  const resizeObserver =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => layout());
  resizeObserver?.observe(element);
  requestAnimationFrame(layout);

  return {
    element,
    focus: focusCurrent,
    layout,
    destroy() {
      unsubscribe();
      resizeObserver?.disconnect();
      editor.dom.removeEventListener('keydown', onEditorKeydown);
      entries.forEach((e) => e.destroy?.());
      element.remove();
    },
  };
}

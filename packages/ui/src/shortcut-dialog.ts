import type { Editor } from '@axiomtext/view';
import { h } from './dom';
import { icon } from './icons';
import { formatShortcut } from './shortcuts';
import { t } from '@axiomtext/i18n';

/** [message id, key bindings, command that must exist (optional)]. */
type Row = readonly [string, readonly string[], string?];

const GROUPS: readonly (readonly [string, readonly Row[]])[] = [
  [
    'Text formatting',
    [
      ['Bold', ['Mod-b'], 'toggleBold'],
      ['Italic', ['Mod-i'], 'toggleItalic'],
      ['Underline', ['Mod-u'], 'toggleUnderline'],
      ['Strikethrough', ['Mod-Shift-x'], 'toggleStrikethrough'],
      ['Inline code', ['Mod-e'], 'toggleCode'],
      ['Subscript', ['Mod-,'], 'toggleSubscript'],
      ['Superscript', ['Mod-.'], 'toggleSuperscript'],
      ['Highlight', ['Mod-Shift-h'], 'setHighlight'],
      ['Link', ['Mod-k'], 'setLink'],
      ['Clear formatting', ['Mod-\\'], 'clearFormatting'],
    ],
  ],
  [
    'Paragraphs',
    [
      ['Paragraph', ['Mod-Alt-0'], 'setParagraph'],
      ['Heading 1', ['Mod-Alt-1'], 'setHeading'],
      ['Heading 2', ['Mod-Alt-2'], 'setHeading'],
      ['Heading 3', ['Mod-Alt-3'], 'setHeading'],
      ['Bulleted list', ['Mod-Shift-8'], 'toggleBulletList'],
      ['Numbered list', ['Mod-Shift-7'], 'toggleOrderedList'],
      ['To-do list', ['Mod-Shift-9'], 'toggleTaskList'],
      ['Quote', ['Mod-Shift-.'], 'toggleBlockquote'],
      ['Align left', ['Mod-Shift-l'], 'setTextAlign'],
      ['Align center', ['Mod-Shift-e'], 'setTextAlign'],
      ['Align right', ['Mod-Shift-r'], 'setTextAlign'],
      ['Justify', ['Mod-Shift-j'], 'setTextAlign'],
      ['Increase indent', ['Mod-]', 'Tab'], 'indentBlock'],
      ['Decrease indent', ['Mod-[', 'Shift-Tab'], 'outdentBlock'],
      ['Line break', ['Shift-Enter']],
      ['Page break', ['Mod-Enter'], 'insertPageBreak'],
    ],
  ],
  [
    'Equations',
    [
      ['Equation', ['Mod-Shift-m'], 'insertMath'],
      ['Block equation', ['Mod-Alt-m'], 'insertMathBlock'],
      ['Edit selected equation', ['Enter'], 'editSelectedMath'],
      ['Finish editing an equation', ['Escape'], 'editSelectedMath'],
    ],
  ],
  [
    'Editing',
    [
      ['Undo', ['Mod-z']],
      ['Redo', ['Mod-Shift-z', 'Mod-y']],
      ['Move to the toolbar', ['Alt-F10']],
      ['Move a selected image', ['Alt-Shift-ArrowLeft', 'Alt-Shift-ArrowRight'], 'moveImage'],
      ['Keyboard shortcuts', ['Mod-/']],
    ],
  ],
];

const MARKDOWN: readonly (readonly [string, string])[] = [
  ['# ', 'Heading 1'],
  ['## ', 'Heading 2'],
  ['- ', 'Bulleted list'],
  ['1. ', 'Numbered list'],
  ['[ ] ', 'To-do list'],
  ['> ', 'Quote'],
  ['---', 'Horizontal line'],
  ['**text**', 'Bold'],
  ['*text*', 'Italic'],
  ['~~text~~', 'Strikethrough'],
  ['`code`', 'Inline code'],
  ['$x^2$', 'Equation'],
  ['$$ ', 'Block equation'],
];

const keyLabel = (binding: string): string =>
  formatShortcut(
    binding.replace('ArrowLeft', '←').replace('ArrowRight', '→').replace('Escape', 'Esc'),
  );

export interface ShortcutDialog {
  open(): void;
  close(): void;
  destroy(): void;
}

/** Keyboard shortcuts help (PRD-010): opens with Ctrl/⌘ + / or from the More menu. */
export function createShortcutDialog(editor: Editor): ShortcutDialog {
  let dialog: HTMLElement | null = null;
  let returnFocus: HTMLElement | null = null;

  const build = (): HTMLElement => {
    const has = (cmd?: string): boolean => !cmd || editor.commandNames.includes(cmd);
    const sections = GROUPS.map(([title, rows]) => {
      const visible = rows.filter(([, , cmd]) => has(cmd));
      if (!visible.length) return null;
      return h('section', { class: 'ax-shortcuts__group' }, [
        h('h3', {}, [t(title)]),
        h(
          'dl',
          {},
          visible.flatMap(([label, keys]) => [
            h('dt', {}, [t(label)]),
            h(
              'dd',
              {},
              keys.flatMap((k, i) => [
                ...(i > 0 ? [h('span', { class: 'ax-shortcuts__or' }, [t('or')])] : []),
                h('kbd', {}, [keyLabel(k)]),
              ]),
            ),
          ]),
        ),
      ]);
    }).filter((s): s is HTMLElement => s !== null);
    const markdown = h('section', { class: 'ax-shortcuts__group' }, [
      h('h3', {}, [t('Type to format (Markdown)')]),
      h(
        'dl',
        {},
        MARKDOWN.flatMap(([typed, label]) => [
          h('dt', {}, [t(label)]),
          h('dd', {}, [h('kbd', {}, [typed])]),
        ]),
      ),
    ]);
    const closeButton = h(
      'button',
      { type: 'button', class: 'ax-button ax-shortcuts__close', 'aria-label': t('Close') },
      [icon('close', 18)],
    );
    closeButton.addEventListener('click', () => api.close());
    const panel = h(
      'div',
      {
        class: 'ax-shortcuts',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'ax-shortcuts-title',
        tabindex: '-1',
      },
      [
        h('header', { class: 'ax-shortcuts__header' }, [
          h('h2', { id: 'ax-shortcuts-title' }, [t('Keyboard shortcuts')]),
          closeButton,
        ]),
        // Focusable so keyboard users can scroll the list.
        h(
          'div',
          {
            class: 'ax-shortcuts__body',
            tabindex: '0',
            role: 'region',
            'aria-label': 'Keyboard shortcuts',
          },
          [...sections, markdown],
        ),
      ],
    );
    const backdrop = h('div', { class: 'ax-shortcuts-backdrop' }, [panel]);
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) api.close();
    });
    backdrop.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        api.close();
      } else if (e.key === 'Tab') {
        // Focus stays inside the dialog.
        const focusable = [...panel.querySelectorAll<HTMLElement>('button, [tabindex="0"]')];
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    const dir = editor.dom.closest('[dir]')?.getAttribute('dir');
    if (dir) backdrop.setAttribute('dir', dir);
    return backdrop;
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && event.key === '/') {
      event.preventDefault();
      api.open();
    }
  };
  editor.dom.addEventListener('keydown', onKeyDown);

  const api: ShortcutDialog = {
    open() {
      if (dialog) return;
      returnFocus = document.activeElement as HTMLElement | null;
      dialog = build();
      document.body.append(dialog);
      requestAnimationFrame(() => dialog?.classList.add('is-open'));
      dialog.querySelector<HTMLElement>('.ax-shortcuts')?.focus();
    },
    close() {
      dialog?.remove();
      dialog = null;
      returnFocus?.focus();
    },
    destroy() {
      api.close();
      editor.dom.removeEventListener('keydown', onKeyDown);
    },
  };
  return api;
}

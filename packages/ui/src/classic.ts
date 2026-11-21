import { t } from '@axiomtext/i18n';
import { createEditor } from '@axiomtext/view';
import type { Autosave, Editor } from '@axiomtext/view';
import { h } from './dom';
import { loadCommentsUI, loadReaderView } from './comments-loader';
import type { CommentsUI } from './comments-loader';
import type { Viewer } from '@axiomtext/viewer';
import { attachEditorUI, prepare, saveStatusText } from './setup';
import type { CommonEditorOptions } from './setup';
import { createToolbar } from './toolbar';
import type { Toolbar, ToolbarItemName } from './toolbar';

export interface ClassicEditorOptions extends CommonEditorOptions {
  /** Element the whole editor (toolbar + content + status bar) is rendered into. */
  element: HTMLElement;
  toolbar?: readonly ToolbarItemName[];
  /** Show word and character counts. Default: true. */
  statusBar?: boolean;
  /** Paper-like centered page with comfortable line length. Default: false. */
  document?: boolean;
}

export interface ClassicEditor {
  readonly editor: Editor;
  readonly toolbar: Toolbar;
  /** Root element (`.ax-editor`). */
  readonly element: HTMLElement;
  /** Present when `autosave` is enabled. */
  readonly autosave?: Autosave;
  /** Opens the keyboard shortcuts dialog (also Ctrl/⌘ + /). */
  showShortcuts(): void;
  /** The comments UI, when the editor was created with `comments`. */
  readonly comments: Promise<CommentsUI> | null;
  /** Read-only editors: comment threads on click and readers' highlights (see `highlights`). */
  readonly reader: Promise<Viewer> | null;
  destroy(): void;
}

const numberFormat = (n: number): string => new Intl.NumberFormat().format(n);

/** Toolbar + editable area + status bar, styled by `@axiomtext/ui/styles.css`. */
export function createClassicEditor(options: ClassicEditorOptions): ClassicEditor {
  const {
    element: host,
    toolbar: toolbarItems,
    statusBar = true,
    document: paper = false,
    ...common
  } = options;
  const prepared = prepare(common);

  const body = h('div', { class: 'ax-editor__body' });
  const root = h('div', {
    class: `ax-editor${paper ? ' ax-editor--document' : ''}`,
    lang: prepared.locale,
    dir: prepared.dir,
  });
  host.append(root);

  const editor = createEditor({ ...prepared.editorOptions, element: body });
  let saveState: HTMLElement | undefined;
  const ui = attachEditorUI(editor, prepared.autosave, (status) => {
    if (!saveState) return;
    saveState.dataset['status'] = status;
    saveState.textContent = saveStatusText(status);
  });
  const comments = loadCommentsUI(editor, prepared.comments, root);
  const reader = loadReaderView(editor, prepared.highlights, !prepared.comments, {
    ...prepared.selectionActions,
    ...(prepared.marks
      ? {
          marks: {
            types: prepared.marks.types,
            ...(prepared.marks.legend === false ? { legend: false } : {}),
            ...(prepared.marks.filter ? { filter: prepared.marks.filter } : {}),
            // The editor folds paragraphs itself; the legend drives it.
            onFilterChange: (filter) => editor.execute('setMarkFilter', filter),
          },
        }
      : {}),
  });
  // Commenting only: the toolbar offers just the comment buttons.
  // Read-only: no formatting toolbar unless one was asked for.
  const readOnly = prepared.editorOptions.editable === false && !prepared.comments?.only;
  const items = prepared.comments?.only
    ? (['comment', 'commentsPanel'] as const)
    : readOnly && !toolbarItems
      ? ([] as const)
      : toolbarItems;
  const toolbar = createToolbar(editor, {
    ...(items ? { items } : {}),
    ...(prepared.comments?.only ? { more: [] } : {}),
    ...(ui.linkUI ? { onLink: ui.linkUI.open } : {}),
    onShortcuts: () => ui.shortcuts.open(),
    ...comments.handlers,
  });
  root.append(toolbar.element, body);

  let unsubscribeStats: (() => void) | undefined;
  if (statusBar) {
    const words = h('span', { 'data-stat': 'words' });
    const chars = h('span', { 'data-stat': 'characters' });
    const bar = h('div', { class: 'ax-statusbar', 'aria-live': 'polite', 'aria-atomic': 'true' }, [
      words,
      h('span', { class: 'ax-statusbar__dot', 'aria-hidden': 'true' }, ['·']),
      chars,
    ]);
    if (prepared.autosave) {
      saveState = h('span', { class: 'ax-statusbar__save', 'data-stat': 'save' });
      bar.prepend(saveState);
    }
    root.append(bar);
    const render = (): void => {
      const stats = editor.getStats();
      words.textContent = t(stats.words === 1 ? '{count} word' : '{count} words', {
        count: numberFormat(stats.words),
      });
      chars.textContent = t(stats.characters === 1 ? '{count} character' : '{count} characters', {
        count: numberFormat(stats.characters),
      });
    };
    render();
    // Counting words reads the whole document, so it waits until typing pauses
    // (keeps keystrokes fast in long documents, and doesn't flood screen readers).
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = editor.on('change', () => {
      clearTimeout(timer);
      timer = setTimeout(render, 300);
    });
    unsubscribeStats = () => {
      clearTimeout(timer);
      off();
    };
  }

  return {
    editor,
    toolbar,
    element: root,
    ...(ui.autosave ? { autosave: ui.autosave } : {}),
    showShortcuts: () => ui.shortcuts.open(),
    comments: comments.ui,
    reader,
    destroy() {
      void comments.ui?.then((c) => c.destroy());
      void reader?.then((v) => v.destroy());
      ui.destroy();
      unsubscribeStats?.();
      toolbar.destroy();
      editor.destroy();
      root.remove();
    },
  };
}

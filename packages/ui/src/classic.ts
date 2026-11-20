import { createEditor } from '@axiomtext/view';
import type { Editor, EditorOptions } from '@axiomtext/view';
import { h } from './dom';
import { createLinkUI } from './link-popover';
import type { LinkUI } from './link-popover';
import { createToolbar } from './toolbar';
import type { Toolbar, ToolbarItemName } from './toolbar';

export interface ClassicEditorOptions extends Omit<EditorOptions, 'element'> {
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
    ...editorOptions
  } = options;

  const body = h('div', { class: 'ax-editor__body' });
  const root = h('div', { class: `ax-editor${paper ? ' ax-editor--document' : ''}` });
  host.append(root);

  const editor = createEditor({ ...editorOptions, element: body });
  const linkUI: LinkUI | undefined = editor.commandNames.includes('setLink')
    ? createLinkUI(editor)
    : undefined;
  const toolbar = createToolbar(editor, {
    ...(toolbarItems ? { items: toolbarItems } : {}),
    ...(linkUI ? { onLink: linkUI.open } : {}),
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
    root.append(bar);
    const render = (): void => {
      const stats = editor.getStats();
      words.textContent = `${numberFormat(stats.words)} ${stats.words === 1 ? 'word' : 'words'}`;
      chars.textContent = `${numberFormat(stats.characters)} ${stats.characters === 1 ? 'character' : 'characters'}`;
    };
    render();
    unsubscribeStats = editor.on('change', render);
  }

  return {
    editor,
    toolbar,
    element: root,
    destroy() {
      unsubscribeStats?.();
      linkUI?.destroy();
      toolbar.destroy();
      editor.destroy();
      root.remove();
    },
  };
}

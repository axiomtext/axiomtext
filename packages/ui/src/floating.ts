import { createEditor } from '@axiomtext/view';
import type { Autosave, Editor } from '@axiomtext/view';
import { h } from './dom';
import { loadCommentsUI, loadReaderView } from './comments-loader';
import type { CommentsUI } from './comments-loader';
import type { Viewer } from '@axiomtext/viewer';
import { icon } from './icons';
import { attachEditorUI, prepare } from './setup';
import type { CommonEditorOptions } from './setup';
import { createToolbar } from './toolbar';
import type { Toolbar, ToolbarItemName } from './toolbar';

/** Balloon editor: formatting shown next to selected text. */
export const BALLOON_TOOLBAR: readonly ToolbarItemName[] = [
  'blockStyle',
  '|',
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'textColor',
  'highlight',
  '|',
  'link',
  'math',
  'comment',
  'more',
];

/** Balloon editor: what the "+" button on an empty line can insert. */
export const BLOCK_INSERT_TOOLBAR: readonly ToolbarItemName[] = [
  'image',
  'table',
  'mathBlock',
  'bulletedList',
  'numberedList',
  'todoList',
  'blockquote',
  'horizontalRule',
];

export interface FloatingEditorOptions extends CommonEditorOptions {
  /** Element that becomes editable. Its own styling (fonts, width) is kept. */
  element: HTMLElement;
  /** Toolbar items (defaults: full toolbar for inline, `BALLOON_TOOLBAR` for balloon). */
  toolbar?: readonly ToolbarItemName[];
}

export interface FloatingEditor {
  readonly editor: Editor;
  readonly toolbar: Toolbar;
  readonly element: HTMLElement;
  readonly autosave?: Autosave;
  showShortcuts(): void;
  /** The comments UI, when the editor was created with `comments`. */
  readonly comments: Promise<CommentsUI> | null;
  /** Read-only editors: comment threads on click and readers' highlights (see `highlights`). */
  readonly reader: Promise<Viewer> | null;
  destroy(): void;
}

/** Overlays that belong to the editor UI: focus moving into them keeps the toolbar open. */
const OVERLAYS =
  '.ax-comments-panel, .ax-floating-toolbar, .ax-popover, .ax-menu, .ax-math-editor, .ax-math-bar, .ax-shortcuts-backdrop, .ax-balloon, math-field, .ML__keyboard';

const GAP = 8;

type Kind = 'inline' | 'balloon';

function createFloatingEditor(options: FloatingEditorOptions, kind: Kind): FloatingEditor {
  const { element: host, toolbar: toolbarItems, ...common } = options;
  const prepared = prepare(common);
  const root = h('div', {
    class: `ax-${kind}-editor`,
    lang: prepared.locale,
    dir: prepared.dir,
  });
  host.append(root);
  const editor = createEditor({ ...prepared.editorOptions, element: root });
  const ui = attachEditorUI(editor, prepared.autosave);

  const items = toolbarItems ?? (kind === 'balloon' ? BALLOON_TOOLBAR : undefined);
  const comments = loadCommentsUI(editor, prepared.comments, document.body);
  const reader = loadReaderView(editor, prepared.highlights, !prepared.comments);
  const toolbar = createToolbar(editor, {
    ...(items ? { items } : {}),
    ...(ui.linkUI ? { onLink: ui.linkUI.open } : {}),
    onShortcuts: () => ui.shortcuts.open(),
    ...comments.handlers,
    // The inline toolbar is as wide as the editor; the balloon sizes to its buttons.
    overflow: kind === 'inline',
  });
  const bar = h('div', { class: 'ax-floating-toolbar', 'data-kind': kind, dir: prepared.dir }, [
    toolbar.element,
  ]);
  document.body.append(bar);

  // Balloon editor: "+" on empty lines opens the insert toolbar.
  let inserter: { button: HTMLButtonElement; panel: HTMLElement; toolbar: Toolbar } | null = null;
  if (kind === 'balloon') {
    const insertToolbar = createToolbar(editor, {
      items: BLOCK_INSERT_TOOLBAR,
      more: [],
      overflow: false,
      ariaLabel: 'Insert',
    });
    const panel = h('div', { class: 'ax-floating-toolbar ax-inserter-panel', dir: prepared.dir }, [
      insertToolbar.element,
    ]);
    const button = h(
      'button',
      {
        type: 'button',
        class: 'ax-inserter',
        'aria-label': 'Insert',
        'aria-expanded': 'false',
        'data-tooltip': 'Insert',
      },
      [icon('plus', 18)],
    );
    button.addEventListener('mousedown', (e) => e.preventDefault());
    button.addEventListener('click', () => {
      const open = !panel.classList.contains('is-visible');
      panel.classList.toggle('is-visible', open);
      button.setAttribute('aria-expanded', String(open));
      button.classList.toggle('is-open', open);
      if (open) {
        place();
        insertToolbar.focus();
      }
    });
    document.body.append(button, panel);
    inserter = { button, panel, toolbar: insertToolbar };
  }

  // Shared overlays (math bar, popovers, menus) count as "inside" only for the editor that
  // opened them: the one that had focus when focus moved into the overlay. Otherwise every
  // inline editor on the page would show its toolbar when one opens the math bar.
  let ownsOverlay = false;
  const ownToolbar = (node: Element): boolean =>
    toolbar.element.contains(node) ||
    !!inserter?.button.contains(node) ||
    !!inserter?.panel.contains(node);
  const onOwnership = (event: FocusEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (root.contains(target) || ownToolbar(target)) ownsOverlay = true;
    else if (!target.closest(OVERLAYS)) ownsOverlay = false;
    // Focus moving into a shared overlay keeps the current owner.
  };
  const focusInside = (): boolean => {
    if (editor.hasFocus()) return true;
    const active = document.activeElement;
    if (!active || active === document.body) return false;
    if (ownToolbar(active)) return true;
    return ownsOverlay && !!active.closest(OVERLAYS);
  };

  let visible = false;
  const place = (): void => {
    const rootRect = root.getBoundingClientRect();
    const rtl = prepared.dir === 'rtl';
    if (kind === 'inline') {
      // Above the editable area; sticks to the top of the window while scrolling through it.
      bar.style.width = `${Math.max(320, rootRect.width)}px`;
      bar.style.left = `${rootRect.left}px`;
      const height = bar.offsetHeight;
      const above = rootRect.top - height - GAP;
      bar.style.top = `${above >= GAP ? above : Math.min(GAP, rootRect.bottom - height)}px`;
    } else {
      // Centered over the selected text; below it when there's no room above.
      const sel = editor.getSelectionRect();
      const width = bar.offsetWidth;
      const height = bar.offsetHeight;
      const center = (sel.left + sel.right) / 2;
      const left = Math.max(GAP, Math.min(center - width / 2, innerWidth - width - GAP));
      const top = sel.top - height - GAP >= GAP ? sel.top - height - GAP : sel.bottom + GAP;
      bar.style.left = `${left}px`;
      bar.style.top = `${top}px`;
    }
    if (inserter) {
      const sel = editor.getSelectionRect();
      const size = 30;
      const x = rtl ? rootRect.right + GAP : rootRect.left - size - GAP;
      inserter.button.style.left = `${Math.max(GAP / 2, x)}px`;
      inserter.button.style.top = `${(sel.top + sel.bottom) / 2 - size / 2}px`;
      const panelLeft = rtl
        ? x - inserter.panel.offsetWidth - GAP
        : Math.max(GAP / 2, x) + size + GAP;
      inserter.panel.style.left = `${Math.max(GAP, panelLeft)}px`;
      inserter.panel.style.top = `${(sel.top + sel.bottom) / 2 - inserter.panel.offsetHeight / 2}px`;
    }
  };

  const update = (): void => {
    const state = editor.getSelectionState();
    const focused = focusInside();
    const show =
      kind === 'inline'
        ? focused
        : focused &&
          // In the text: only with a selection. In the balloon's own menus: stay as it is.
          (editor.hasFocus() ? !state.empty && !state.nodeSelected : visible);
    visible = show;
    bar.classList.toggle('is-visible', show);
    bar.setAttribute('aria-hidden', String(!show));
    if (inserter) {
      const showPlus = focused && state.emptyBlock;
      inserter.button.classList.toggle('is-visible', showPlus);
      if (!showPlus && !inserter.panel.contains(document.activeElement)) {
        inserter.panel.classList.remove('is-visible');
        inserter.button.setAttribute('aria-expanded', 'false');
        inserter.button.classList.remove('is-open');
      }
    }
    if (show || inserter?.button.classList.contains('is-visible')) place();
  };

  let pending = 0;
  const schedule = (): void => {
    cancelAnimationFrame(pending);
    // Wait a frame so focus has settled (e.g. moving from the text into a menu).
    pending = requestAnimationFrame(update);
  };
  const offs = [
    editor.on('selectionChange', schedule),
    editor.on('focus', schedule),
    editor.on('blur', schedule),
  ];
  const onFocusChange = (): void => schedule();
  const onViewport = (): void => {
    if (visible || inserter?.button.classList.contains('is-visible')) place();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && inserter?.panel.classList.contains('is-visible')) {
      inserter.panel.classList.remove('is-visible');
      inserter.button.setAttribute('aria-expanded', 'false');
      editor.focus();
    }
  };
  document.addEventListener('focusin', onOwnership, true);
  document.addEventListener('focusin', onFocusChange);
  document.addEventListener('focusout', onFocusChange);
  document.addEventListener('keydown', onKey);
  window.addEventListener('scroll', onViewport, true);
  window.addEventListener('resize', onViewport);

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
      cancelAnimationFrame(pending);
      offs.forEach((off) => off());
      document.removeEventListener('focusin', onOwnership, true);
      document.removeEventListener('focusin', onFocusChange);
      document.removeEventListener('focusout', onFocusChange);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onViewport, true);
      window.removeEventListener('resize', onViewport);
      ui.destroy();
      toolbar.destroy();
      inserter?.toolbar.destroy();
      inserter?.button.remove();
      inserter?.panel.remove();
      bar.remove();
      editor.destroy();
      root.remove();
    },
  };
}

/**
 * Inline editor (UI-001): the element itself becomes editable and the toolbar floats above it
 * while it has focus — for editing a page in place.
 */
export const createInlineEditor = (options: FloatingEditorOptions): FloatingEditor =>
  createFloatingEditor(options, 'inline');

/**
 * Balloon editor (UI-001): no fixed toolbar. Formatting appears next to selected text, and a
 * "+" button on empty lines inserts images, tables, equations and lists.
 */
export const createBalloonEditor = (options: FloatingEditorOptions): FloatingEditor =>
  createFloatingEditor(options, 'balloon');

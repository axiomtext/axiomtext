import type { Editor } from '@axiomtext/view';
import type { CommentsUI } from './comments-ui';
import type { Viewer, ViewerOptions } from '@axiomtext/viewer';
import type { CommentsOptions } from './setup';

export type { CommentsUI };

/**
 * Loads the comments UI on demand (only editors created with `comments` pay for it) and
 * returns the toolbar handlers that open it.
 */
export function loadCommentsUI(
  editor: Editor,
  options: CommentsOptions | null,
  panelHost: HTMLElement,
): {
  ui: Promise<CommentsUI> | null;
  handlers: { onComment?: () => void; onCommentsPanel?: () => void };
} {
  if (!options || !editor.commandNames.includes('addComment')) return { ui: null, handlers: {} };
  const ui = import('./comments-ui').then((m) => m.createCommentsUI(editor, options, panelHost));
  return {
    ui,
    handlers: {
      onComment: () => void ui.then((c) => c.openComposer()),
      onCommentsPanel: () => void ui.then((c) => c.togglePanel()),
    },
  };
}

/**
 * On read-only editors: comment threads open on click, and readers can highlight and take notes
 * (loaded on demand). Editors with the comments UI handle comments themselves.
 */
export function loadReaderView(
  editor: Editor,
  highlights: ViewerOptions['highlights'] | null,
  handleComments: boolean,
  extra: Pick<ViewerOptions, 'marks' | 'selectionActions' | 'onSelectionAction'> = {},
): Promise<Viewer> | null {
  if (editor.dom.isContentEditable) return null;
  const actions = (extra.selectionActions?.length ?? 0) > 0;
  if (!highlights && !handleComments && !extra.marks && !actions) return null;
  return import('@axiomtext/viewer').then((m) =>
    m.createViewer(editor.dom, {
      comments: handleComments,
      ...(highlights ? { highlights } : {}),
      ...extra,
    }),
  );
}

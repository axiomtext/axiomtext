import type { ViewerOptions } from '@axiomtext/viewer';
import type { CommentThreadSummary } from '@axiomtext/plugin-comments/data';
import type {
  MarkClickEvent,
  MarkFilter,
  MarkStateStyle,
  MarkTypeDef,
} from '@axiomtext/plugin-marks';
import { DEFAULT_MARK_TYPES } from '@axiomtext/plugin-marks/data';
import { getLanguage, setLanguage, t } from '@axiomtext/i18n';
import type { Messages } from '@axiomtext/i18n';
import { createAutosave, loadDraft } from '@axiomtext/view';
import type {
  Autosave,
  AutosaveOptions,
  AutosaveStatus,
  Editor,
  EditorOptions,
} from '@axiomtext/view';
import { createImageBalloon, createTableBalloon } from './image-ui';
import { setIcons } from './icons';
import type { IconName, WrapIconName } from './icons';
import { createLinkUI } from './link-popover';
import { createPageBalloon } from './page-ui';
import type { LinkUI } from './link-popover';
import { createShortcutDialog } from './shortcut-dialog';
import type { ShortcutDialog } from './shortcut-dialog';

/** Options shared by the classic, inline and balloon editors. */
export interface CommonEditorOptions extends Omit<EditorOptions, 'element'> {
  /**
   * UI language, e.g. `'bn'` with `translations` from `axiomtext/locales/bn`.
   * Right-to-left languages (Arabic, Urdu, Hebrew, Persian) switch the whole editor to RTL.
   */
  language?: string;
  translations?: Messages;
  /**
   * Save automatically. `true` keeps a draft in the browser and restores it when no `content`
   * is given; pass options to save to your server instead.
   */
  autosave?: boolean | AutosaveOptions;
  /** Replace built-in icons with your own SVGs. */
  icons?: Partial<Record<IconName | WrapIconName, SVGElement | string>>;
  /**
   * Turn on comments: who is commenting, and optional settings. Adds the Comment and Comments
   * buttons; threads are saved in the document. See `CommentsOptions`.
   */
  comments?: CommentsOptions;
  /**
   * Readers' own highlights and notes on read-only content (like a marked-up book). Shown when
   * the editor isn't editable; store them per reader with `onChange`. See `axiomtext/viewer`.
   */
  highlights?: ViewerOptions['highlights'];
  /**
   * Named mark types for marked books ("Important", "Marked", …): a Mark menu for writers, and
   * for readers a legend, a filter and a tap event. See `MarksOptions`.
   */
  marks?: MarksOptions;
  /**
   * Read-only editors: extra items in the menu shown when a reader selects text
   * (e.g. `{ id: 'ask', label: 'Ask AI' }`). See `ViewerOptions.selectionActions`.
   */
  selectionActions?: ViewerOptions['selectionActions'];
  /** Called when a reader picks one of your `selectionActions`. */
  onSelectionAction?: ViewerOptions['onSelectionAction'];
}

/** Marks settings (marked books). */
export interface MarksOptions {
  /**
   * The kinds of marks you offer, e.g.
   * `{ id: 'PREVIOUS_YEAR', label: 'পূর্বের বছরের প্রশ্ন', color: '#b45309', style: 'box' }`.
   * The id is stored in documents, so keep it stable; labels and colours can change.
   * Default: `DEFAULT_MARK_TYPES` (Important, Marked, Past exam question).
   */
  types?: readonly MarkTypeDef[];
  /** A reader clicked or tapped a mark (read-only editors): show your own popup. */
  onClick?: (event: MarkClickEvent) => void;
  /** Which marks to show while reading; other paragraphs fold away. Default: `'all'`. */
  filter?: MarkFilter;
  /** Show the legend of mark types above read-only content. Default: true. */
  legend?: boolean;
  /**
   * How readers' own states look, e.g. `{ learned: { fade: true, badge: '✓' } }`. Set them on a
   * read-only editor with `editor.execute('setMarkState', 'm42', 'learned')`.
   */
  states?: Record<string, MarkStateStyle>;
}

/** Comments settings (COL-001…006). */
export interface CommentsOptions {
  /** The person commenting. */
  author: { name: string; id?: string };
  /** May edit and delete other people's messages. Default: false (own messages only). */
  moderator?: boolean;
  /** Commenting only: people can comment but not change the text. */
  only?: boolean;
  /** Put the comments list in your own element instead of beside the editor. */
  panel?: HTMLElement;
  /** Open the comments list when the editor starts. */
  panelOpen?: boolean;
  /** Called with every thread whenever comments change (to notify people, sync, …). */
  onChange?: (threads: CommentThreadSummary[]) => void;
}

export interface Prepared {
  locale: string;
  dir: 'ltr' | 'rtl';
  autosave: AutosaveOptions | null;
  editorOptions: Omit<EditorOptions, 'element'>;
  comments: CommentsOptions | null;
  highlights: NonNullable<ViewerOptions['highlights']> | null;
  /** With `types` filled in (the defaults when the app gave none). */
  marks: (MarksOptions & { types: readonly MarkTypeDef[] }) | null;
  selectionActions: Pick<ViewerOptions, 'selectionActions' | 'onSelectionAction'>;
}

/** Applies language and icons, and picks the starting content (a saved draft if any). */
export function prepare(options: CommonEditorOptions): Prepared {
  const {
    language,
    translations,
    autosave,
    icons,
    comments,
    highlights,
    marks,
    selectionActions,
    onSelectionAction,
    ...editorOptions
  } = options;
  if (marks) {
    editorOptions.config = {
      ...editorOptions.config,
      marks: {
        types: marks.types ?? DEFAULT_MARK_TYPES,
        ...(marks.onClick ? { onClick: marks.onClick } : {}),
        ...(marks.filter ? { filter: marks.filter } : {}),
        ...(marks.states ? { states: marks.states } : {}),
      },
    };
  }
  if (comments?.only) editorOptions.editable = false;
  if (language) setLanguage(language, translations);
  if (icons) setIcons(icons);
  const autosaveOptions = autosave === true ? {} : autosave ? autosave : null;
  if (autosaveOptions && !editorOptions.content && !autosaveOptions.save) {
    const draft = loadDraft(autosaveOptions);
    if (draft) editorOptions.content = draft;
  }
  return {
    ...getLanguage(),
    autosave: autosaveOptions,
    editorOptions,
    comments: comments ?? null,
    highlights: highlights ?? null,
    marks: marks ? { ...marks, types: marks.types ?? DEFAULT_MARK_TYPES } : null,
    selectionActions: {
      ...(selectionActions ? { selectionActions } : {}),
      ...(onSelectionAction ? { onSelectionAction } : {}),
    },
  };
}

export const saveStatusText = (status: AutosaveStatus): string =>
  status === 'saving' || status === 'pending'
    ? t('Saving…')
    : status === 'saved'
      ? t('Saved')
      : status === 'error'
        ? t('Not saved — will retry')
        : '';

export interface EditorUI {
  linkUI?: LinkUI;
  shortcuts: ShortcutDialog;
  autosave?: Autosave;
  destroy(): void;
}

/** Link popover, image & table balloons, shortcut dialog and autosave for any editor type. */
export function attachEditorUI(
  editor: Editor,
  autosaveOptions: AutosaveOptions | null,
  onSaveStatus?: (status: AutosaveStatus) => void,
): EditorUI {
  const linkUI = editor.commandNames.includes('setLink') ? createLinkUI(editor) : undefined;
  const shortcuts = createShortcutDialog(editor);
  const imageBalloon = editor.commandNames.includes('updateImage')
    ? createImageBalloon(editor)
    : undefined;
  const tableBalloon = editor.commandNames.includes('insertTable')
    ? createTableBalloon(editor)
    : undefined;
  const pageBalloon = editor.commandNames.includes('setPageNumber')
    ? createPageBalloon(editor)
    : undefined;
  const autosave = autosaveOptions
    ? createAutosave(editor, {
        ...autosaveOptions,
        onStatus(status, error) {
          onSaveStatus?.(status);
          autosaveOptions.onStatus?.(status, error);
        },
      })
    : undefined;
  return {
    ...(linkUI ? { linkUI } : {}),
    shortcuts,
    ...(autosave ? { autosave } : {}),
    destroy() {
      autosave?.destroy();
      shortcuts.destroy();
      linkUI?.destroy();
      imageBalloon?.destroy();
      tableBalloon?.destroy();
      pageBalloon?.destroy();
    },
  };
}

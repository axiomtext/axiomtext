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
import type { LinkUI } from './link-popover';
import { createShortcutDialog } from './shortcut-dialog';
import type { ShortcutDialog } from './shortcut-dialog';

/** Options shared by the classic, inline and balloon editors. */
export interface CommonEditorOptions extends Omit<EditorOptions, 'element'> {
  /**
   * UI language, e.g. `'bn'` with `translations` from `@axiomtext/ui/locales/bn`.
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
}

export interface Prepared {
  locale: string;
  dir: 'ltr' | 'rtl';
  autosave: AutosaveOptions | null;
  editorOptions: Omit<EditorOptions, 'element'>;
}

/** Applies language and icons, and picks the starting content (a saved draft if any). */
export function prepare(options: CommonEditorOptions): Prepared {
  const { language, translations, autosave, icons, ...editorOptions } = options;
  if (language) setLanguage(language, translations);
  if (icons) setIcons(icons);
  const autosaveOptions = autosave === true ? {} : autosave ? autosave : null;
  if (autosaveOptions && !editorOptions.content && !autosaveOptions.save) {
    const draft = loadDraft(autosaveOptions);
    if (draft) editorOptions.content = draft;
  }
  return { ...getLanguage(), autosave: autosaveOptions, editorOptions };
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
    },
  };
}

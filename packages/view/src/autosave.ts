import { isDocumentJSON } from '@axiomtext/core';
import type { DocumentJSON } from '@axiomtext/core';
import type { Editor } from './editor';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface AutosaveOptions {
  /**
   * Your own save function (e.g. POST to your server). Without it, drafts are kept in the
   * browser (`localStorage`) under `key`.
   */
  save?: (content: DocumentJSON) => void | Promise<void>;
  /** Storage key for browser drafts. Default `axiomtext:draft`. */
  key?: string;
  /** Wait this long after the last change before saving (ms). Default 1000. */
  delay?: number;
  /** Browser storage to use. Default `localStorage` (null when unavailable). */
  storage?: StorageLike | null;
  /** Called whenever the status changes, e.g. to show "Saving…" / "Saved". */
  onStatus?: (status: AutosaveStatus, error?: unknown) => void;
}

export interface Autosave {
  readonly status: AutosaveStatus;
  /** The draft saved in the browser, if any (validated). */
  restore(): DocumentJSON | null;
  /** Saves now if there are unsaved changes. */
  flush(): Promise<void>;
  /** Removes the browser draft (e.g. after the user submits the form). */
  clear(): void;
  destroy(): void;
}

const defaultStorage = (): StorageLike | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // blocked (privacy mode, sandboxed iframe)
  }
};

/** Reads a browser draft saved by `createAutosave` (validated; null if none or invalid). */
export function loadDraft(
  options: Pick<AutosaveOptions, 'key' | 'storage'> = {},
): DocumentJSON | null {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  try {
    const raw = storage?.getItem(options.key ?? 'axiomtext:draft');
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDocumentJSON(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Saves the document automatically after changes (PRD-007), on page hide, and before unload.
 * Saves never overlap: changes made during a save are saved right after it.
 */
export function createAutosave(editor: Editor, options: AutosaveOptions = {}): Autosave {
  const key = options.key ?? 'axiomtext:draft';
  const delay = options.delay ?? 1000;
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  let status: AutosaveStatus = 'idle';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  let running: Promise<void> | null = null;

  const setStatus = (next: AutosaveStatus, error?: unknown): void => {
    status = next;
    options.onStatus?.(next, error);
  };

  const write = async (content: DocumentJSON): Promise<void> => {
    if (options.save) await options.save(content);
    else storage?.setItem(key, JSON.stringify(content));
  };

  const run = async (): Promise<void> => {
    if (running) {
      await running;
      if (!dirty) return;
    }
    if (!dirty) return;
    dirty = false;
    setStatus('saving');
    running = write(editor.getJSON())
      .then(() => setStatus(dirty ? 'pending' : 'saved'))
      .catch((error: unknown) => {
        dirty = true; // try again with the next change or flush
        setStatus('error', error);
      })
      .finally(() => {
        running = null;
      });
    await running;
    if (dirty && status !== 'error') schedule();
  };

  const schedule = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => void run(), delay);
  };

  const unsubscribe = editor.on('change', () => {
    dirty = true;
    setStatus('pending');
    schedule();
  });

  const onHide = (): void => {
    if (document.visibilityState === 'hidden') void run();
  };
  const onUnload = (): void => {
    // Browser drafts can be written synchronously; async saves are best-effort here.
    if (dirty && !options.save && storage) {
      storage.setItem(key, JSON.stringify(editor.getJSON()));
      dirty = false;
    }
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onHide);
  if (typeof window !== 'undefined') window.addEventListener('pagehide', onUnload);

  return {
    get status() {
      return status;
    },
    restore: () => loadDraft({ key, storage }),
    async flush() {
      clearTimeout(timer);
      await run();
    },
    clear() {
      storage?.removeItem(key);
    },
    destroy() {
      clearTimeout(timer);
      unsubscribe();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onHide);
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', onUnload);
    },
  };
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAutosave, createEditor, loadDraft } from '../src';
import type { AutosaveStatus, Editor } from '../src';

const memory = (): Storage => {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  };
};

let editor: Editor | undefined;
afterEach(() => {
  editor?.destroy();
  vi.useRealTimers();
});

const type = (e: Editor, text: string): void => {
  e.insertText(text);
};

describe('autosave', () => {
  it('keeps a draft in browser storage after changes and restores it', async () => {
    vi.useFakeTimers();
    const storage = memory();
    editor = createEditor({ element: document.createElement('div') });
    const statuses: AutosaveStatus[] = [];
    const autosave = createAutosave(editor, {
      storage,
      delay: 500,
      onStatus: (s) => statuses.push(s),
    });
    type(editor, 'Hello draft');
    expect(autosave.status).toBe('pending');
    await vi.advanceTimersByTimeAsync(600);
    expect(autosave.status).toBe('saved');
    expect(statuses).toEqual(['pending', 'saving', 'saved']);
    expect(loadDraft({ storage })?.doc.content?.[0]?.content?.[0]?.text).toBe('Hello draft');
    autosave.clear();
    expect(autosave.restore()).toBeNull();
    autosave.destroy();
  });

  it('uses your save function, never overlaps saves and retries after errors', async () => {
    const saved: string[] = [];
    let fail = true;
    editor = createEditor({ element: document.createElement('div') });
    const autosave = createAutosave(editor, {
      delay: 10_000,
      save: async (doc) => {
        await new Promise((r) => setTimeout(r, 5));
        if (fail) {
          fail = false;
          throw new Error('offline');
        }
        saved.push(JSON.stringify(doc).includes('two') ? 'two' : 'one');
      },
    });
    type(editor, 'one');
    await autosave.flush();
    expect(autosave.status).toBe('error');
    type(editor, ' two');
    await autosave.flush();
    expect(autosave.status).toBe('saved');
    expect(saved).toEqual(['two']);
    autosave.destroy();
  });

  it('ignores corrupt drafts', () => {
    const storage = memory();
    storage.setItem('axiomtext:draft', '{"not":"a document"}');
    expect(loadDraft({ storage })).toBeNull();
    storage.setItem('axiomtext:draft', '{broken');
    expect(loadDraft({ storage })).toBeNull();
  });
});

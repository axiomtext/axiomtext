/**
 * The AxiomText editor engine for the Flutter SDK.
 *
 * Runs inside a WebView (Android, iOS, macOS) or an iframe (Flutter Web), loaded from files
 * bundled in the Dart package, so it works offline. It talks to Dart only through the
 * bridge protocol: JSON messages checked against a fixed list of methods (FLT-017).
 *
 *   WebView: Dart → `window.axiomReceive(json)`, engine → `AxiomBridge.postMessage(json)`
 *   iframe:  `postMessage` both ways, same origin only.
 */
import {
  ALL_PLUGINS,
  FONT_FAMILIES,
  FONT_SIZES,
  HIGHLIGHT_COLORS,
  MATH_INPUT_COMMANDS,
  TEXT_COLORS,
  createClassicEditor,
  createEmptyDocument,
  createImagePlugin,
  fromMarkdown,
  getLanguage,
  isDocumentJSON,
  listCommentThreads,
  migrateDocument,
  setImagePicker,
  setLanguage,
  setMathInputHost,
  setMathLiveLoader,
  t,
  toMarkdown,
} from 'axiomtext';
import type {
  ClassicEditor,
  CommentColor,
  DocumentJSON,
  ReaderHighlight,
  Editor,
  MathInputCommand,
  MathInputControls,
  Messages,
  ToolbarItemName,
} from 'axiomtext';
import ar from 'axiomtext/locales/ar';
import bn from 'axiomtext/locales/bn';
import de from 'axiomtext/locales/de';
import es from 'axiomtext/locales/es';
import fr from 'axiomtext/locales/fr';
import hi from 'axiomtext/locales/hi';
import ja from 'axiomtext/locales/ja';
import pt from 'axiomtext/locales/pt';
import zh from 'axiomtext/locales/zh';
import { errorMessage, eventMessage, parseCall, resultMessage } from '@axiomtext/bridge-protocol';
import type {
  EditorState,
  EventName,
  InitParams,
  JsonValue,
  Method,
  ThemeParams,
} from '@axiomtext/bridge-protocol';

type Params = Record<string, JsonValue>;
type MathLiveModule = Awaited<ReturnType<Parameters<typeof setMathLiveLoader>[0] & {}>>;

declare global {
  interface Window {
    /** Injected by webview_flutter for the JavaScript channel. */
    AxiomBridge?: { postMessage(message: string): void };
    /** Called by Dart with one JSON message. */
    axiomReceive?: (message: string) => void;
    MathLive?: MathLiveModule;
  }
}

const LOCALES: Record<string, Messages> = { ar, bn, de, es, fr, hi, ja, pt, zh };

// ── Transport ─────────────────────────────────────────────────────

const inIframe = window.parent !== window && !window.AxiomBridge;

function post(message: object): void {
  const json = JSON.stringify(message);
  if (window.AxiomBridge) window.AxiomBridge.postMessage(json);
  else if (inIframe) window.parent.postMessage(json, location.origin);
}

const emit = (name: EventName, data?: Record<string, JsonValue>): void =>
  post(eventMessage(name, data));

// ── Editor ────────────────────────────────────────────────────────

const root = document.getElementById('editor') as HTMLElement;
let classic: ClassicEditor | null = null;
let init: InitParams | null = null;
let mathControls: MathInputControls | null = null;
let uploadId = 0;
const uploads = new Map<number, { resolve(url: string): void; reject(error: Error): void }>();

const editor = (): Editor => {
  if (!classic) throw new Error('The editor is not ready yet.');
  return classic.editor;
};

/** Reads a document in any supported format; throws with a clear message otherwise. */
function toDocument(params: { json?: JsonValue; html?: string; markdown?: string }):
  | DocumentJSON
  | {
      html: string;
    }
  | null {
  if (params.json !== undefined && params.json !== null) {
    if (!isDocumentJSON(params.json)) throw new Error('This is not an AxiomText document.');
    return migrateDocument(params.json);
  }
  if (typeof params.markdown === 'string') return fromMarkdown(params.markdown);
  if (typeof params.html === 'string') return { html: params.html };
  return null;
}

function setContent(content: DocumentJSON | { html: string }): void {
  const e = editor();
  if ('html' in content) {
    e.setJSON(createEmptyDocument());
    e.insertHTML(content.html);
  } else e.setJSON(content);
}

// Uploads of pasted/dropped images go to Dart when the app handles uploads (FLT-008).
const hostUploadAdapter = {
  upload(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('Could not read the image.'));
      reader.onload = () => {
        const id = ++uploadId;
        uploads.set(id, { resolve, reject });
        const dataUrl = String(reader.result);
        emit('uploadImage', {
          requestId: id,
          name: file.name,
          mime: file.type,
          base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
        });
      };
      reader.readAsDataURL(file);
    });
  },
};

// MathLive is a separate file, loaded the first time an equation is edited (fast startup).
setMathLiveLoader(
  () =>
    new Promise<MathLiveModule | null>((resolve) => {
      if (window.MathLive) return resolve(window.MathLive);
      const script = document.createElement('script');
      script.src = 'mathlive.js';
      script.onload = () => resolve(window.MathLive ?? null);
      script.onerror = () => resolve(null);
      document.head.append(script);
    }),
);

function applyTheme(theme: ThemeParams | undefined): void {
  if (!theme) return;
  const html = document.documentElement;
  html.dataset['theme'] = theme.dark ? 'dark' : 'light';
  for (const [key, value] of Object.entries(theme.vars ?? {})) {
    // Only `--ax-*` variables with plain values: no url(), no breaking out of the declaration.
    if (!/^[a-z][a-z0-9-]{0,40}$/.test(key)) continue;
    if (typeof value !== 'string' || !/^[^;{}<>\\]{0,200}$/.test(value)) continue;
    if (/url\s*\(|expression\s*\(|@import/i.test(value)) continue;
    html.style.setProperty(`--ax-${key}`, value);
  }
}

function applyLanguage(language: string | undefined, translations: Messages | undefined): void {
  const locale = language || 'en';
  const base = locale.split(/[-_]/)[0] ?? locale;
  setLanguage(locale, { ...(LOCALES[locale] ?? LOCALES[base] ?? {}), ...(translations ?? {}) });
  const { dir } = getLanguage();
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
}

function create(params: InitParams, content: DocumentJSON | { html: string } | null): void {
  const plugins = params.hostUploads
    ? ALL_PLUGINS.map((p) =>
        p.name === 'image' ? createImagePlugin({ upload: hostUploadAdapter }) : p,
      )
    : ALL_PLUGINS;
  const nativeToolbar = params.toolbar === 'none';
  document.body.classList.toggle('ax-host-toolbar', nativeToolbar);
  classic = createClassicEditor({
    element: root,
    plugins,
    ...(params.placeholder ? { placeholder: params.placeholder } : {}),
    editable: params.editable ?? true,
    ...(params.ariaLabel ? { ariaLabel: params.ariaLabel } : {}),
    statusBar: params.statusBar ?? false,
    document: params.document ?? false,
    ...(nativeToolbar
      ? { toolbar: [] }
      : params.toolbarItems
        ? { toolbar: params.toolbarItems as ToolbarItemName[] }
        : {}),
    ...(content && !('html' in content) ? { content } : {}),
    ...(params.comments
      ? {
          comments: {
            author: params.comments.author,
            ...(params.comments.moderator ? { moderator: true } : {}),
            ...(params.comments.only ? { only: true } : {}),
            onChange: (threads) =>
              emit('commentsChange', { threads: threads as unknown as JsonValue }),
          },
        }
      : {}),
    ...(params.highlights
      ? {
          highlights: {
            items: (params.highlights.items ?? []) as unknown as ReaderHighlight[],
            ...(params.highlights.readOnly ? { readOnly: true } : {}),
            onChange: (items) => emit('highlightsChange', { items: items as unknown as JsonValue }),
          },
        }
      : {}),
  });
  if (content && 'html' in content) setContent(content);
  wireEvents(classic.editor);
}

// ── Events, batched once per frame (FLT-016) ──────────────────────

let pendingChange = false;
let pendingState = false;
let frame = 0;
let lastState = '';
let lastHeight = 0;

function flush(): void {
  frame = 0;
  if (!classic) return;
  const e = classic.editor;
  if (pendingChange) {
    pendingChange = false;
    const stats = e.getStats();
    emit('change', { words: stats.words, characters: stats.characters });
  }
  if (pendingState) {
    pendingState = false;
    const state = JSON.stringify(readState(e));
    if (state !== lastState) {
      lastState = state;
      emit('state', JSON.parse(state) as Record<string, JsonValue>);
    }
  }
}

const schedule = (): void => {
  frame ||= requestAnimationFrame(flush);
};

function readState(e: Editor): EditorState {
  const marks: Record<string, boolean> = {};
  for (const name of [
    'bold',
    'italic',
    'underline',
    'strikethrough',
    'code',
    'subscript',
    'superscript',
    'link',
  ])
    marks[name] = e.isActive(name);
  let block = 'paragraph';
  for (let level = 1; level <= 6; level++)
    if (e.isActive('heading', { level })) block = `heading${level}`;
  const markAttr = (mark: string, attr: string): string | null => {
    const value = e.getMarkAttrs(mark)?.[attr];
    return typeof value === 'string' ? value : null;
  };
  const align = e.getBlockAttrs()['textAlign'];
  const selection = e.getSelectionState();
  return {
    marks,
    block,
    list: e.isAncestor('task_list')
      ? 'task'
      : e.isAncestor('ordered_list')
        ? 'ordered'
        : e.isAncestor('bullet_list')
          ? 'bullet'
          : null,
    blockquote: e.isAncestor('blockquote'),
    align: typeof align === 'string' ? align : 'left',
    fontFamily: markAttr('font_family', 'family'),
    fontSize: markAttr('font_size', 'size'),
    textColor: markAttr('text_color', 'color'),
    highlight: markAttr('highlight', 'color'),
    link: markAttr('link', 'href'),
    canUndo: e.canUndo(),
    canRedo: e.canRedo(),
    empty: selection.empty,
    selectedNode: e.getSelectedNode()?.type ?? null,
    inTable: e.isAncestor('table'),
    focused: e.hasFocus(),
  };
}

function reportHeight(): void {
  if (!init?.reportHeight) return;
  const height = Math.ceil(document.documentElement.scrollHeight);
  if (height !== lastHeight) {
    lastHeight = height;
    emit('height', { height });
  }
}

function wireEvents(e: Editor): void {
  e.on('change', () => {
    pendingChange = true;
    pendingState = true;
    schedule();
  });
  e.on('update', () => {
    pendingState = true;
    schedule();
  });
  e.on('focus', () => {
    emit('focus');
    pendingState = true;
    schedule();
  });
  e.on('blur', () => {
    emit('blur');
    pendingState = true;
    schedule();
  });
  pendingState = true;
  schedule();
}

// Keep the cursor visible when the soft keyboard resizes the view (FLT-006).
addEventListener('resize', () => {
  if (classic?.editor.hasFocus()) {
    classic.editor.getSelectionElement()?.scrollIntoView({ block: 'nearest' });
  }
});
new ResizeObserver(reportHeight).observe(document.body);

// Links never navigate inside the editor. In read-only mode a tap is reported to Dart.
document.addEventListener(
  'click',
  (event) => {
    const link = (event.target as Element | null)?.closest?.('a[href]');
    if (!link) return;
    event.preventDefault();
    const href = link.getAttribute('href') ?? '';
    if (classic && !classic.editor.dom.isContentEditable && /^(https?:|mailto:|tel:)/i.test(href))
      emit('linkTap', { href });
  },
  true,
);

// ── Methods Dart may call ─────────────────────────────────────────

const str = (value: JsonValue | undefined, name: string): string => {
  if (typeof value !== 'string') throw new Error(`"${name}" must be text.`);
  return value;
};
const args = (value: JsonValue | undefined): unknown[] => (Array.isArray(value) ? value : []);

const methods: Record<
  Method,
  (p: Params) => JsonValue | undefined | Promise<JsonValue | undefined>
> = {
  init(p) {
    if (classic) throw new Error('The editor is already running.');
    init = p as unknown as InitParams;
    applyTheme(init.theme);
    applyLanguage(init.language, init.translations);
    if (init.hostImagePicker) setImagePicker(() => emit('pickImage'));
    if (init.hostMathKeyboard) {
      setMathInputHost({
        start(controls) {
          mathControls = controls;
          emit('mathEditStart', { latex: controls.latex(), display: controls.display });
        },
        change(latex) {
          emit('mathEditChange', { latex });
        },
        end() {
          mathControls = null;
          emit('mathEditEnd');
        },
      });
    }
    create(init, toDocument(init));
    if (init.autofocus) editor().focus('end');
    const ready = {
      version: 1,
      commands: [...editor().commandNames],
      comments: !!init.comments,
      language: getLanguage().locale,
      dir: getLanguage().dir,
      fontFamilies: FONT_FAMILIES.map((f) => ({ label: t(f.label), value: f.value })),
      fontSizes: FONT_SIZES.map((s) => s),
      textColors: TEXT_COLORS.map((c) => ({ name: t(c.name), value: c.value })),
      highlightColors: HIGHLIGHT_COLORS.map((c) => ({ name: t(c.name), value: c.value })),
    };
    emit('ready', ready);
    requestAnimationFrame(reportHeight);
    return ready;
  },
  getJson: () => editor().getJSON() as unknown as JsonValue,
  getHtml: () => editor().getHTML(),
  getMarkdown: () => toMarkdown(editor().getJSON()),
  getText: () => editor().getText(),
  getStats: () => ({ ...editor().getStats() }),
  setJson(p) {
    const json = p['json'];
    const content = json === undefined ? null : toDocument({ json });
    if (content) setContent(content);
  },
  setHtml(p) {
    setContent({ html: str(p['html'], 'html') });
  },
  setMarkdown(p) {
    setContent(fromMarkdown(str(p['markdown'], 'markdown')));
  },
  execute(p) {
    const e = editor();
    const command = str(p['command'], 'command');
    if (!e.commandNames.includes(command)) throw new Error(`Unknown command "${command}".`);
    return e.execute(command, ...args(p['args']));
  },
  canExecute(p) {
    const e = editor();
    const command = str(p['command'], 'command');
    return e.commandNames.includes(command) && e.can(command, ...args(p['args']));
  },
  undo: () => editor().undo(),
  redo: () => editor().redo(),
  focus(p) {
    const position = p['position'];
    editor().focus(position === 'start' || position === 'end' ? position : undefined);
  },
  blur() {
    editor().dom.blur();
  },
  setEditable(p) {
    editor().setEditable(p['editable'] !== false);
  },
  insertHtml(p) {
    editor().insertHTML(str(p['html'], 'html'));
  },
  insertText(p) {
    editor().insertText(str(p['text'], 'text'));
  },
  insertImage(p) {
    const alt = typeof p['alt'] === 'string' ? p['alt'] : '';
    return editor().execute('insertImage', str(p['src'], 'src'), alt);
  },
  insertMath(p) {
    const latex = typeof p['latex'] === 'string' ? p['latex'] : '';
    return editor().execute(p['block'] === true ? 'insertMathBlock' : 'insertMath', latex);
  },
  setTheme(p) {
    applyTheme(p as unknown as ThemeParams);
  },
  async setLanguage(p) {
    // Interface texts are set when the editor is built, so rebuild it with the same content.
    const translations = p['translations'];
    applyLanguage(
      typeof p['language'] === 'string' ? p['language'] : 'en',
      translations && typeof translations === 'object' && !Array.isArray(translations)
        ? (translations as Messages)
        : undefined,
    );
    if (!classic || !init) return;
    const json = classic.editor.getJSON();
    const editable = classic.editor.dom.isContentEditable;
    const items = (await classic.reader)?.highlights;
    classic.destroy();
    root.replaceChildren();
    create(
      {
        ...init,
        editable,
        ...(init.highlights && items
          ? { highlights: { ...init.highlights, items: items as unknown as JsonValue[] } }
          : {}),
      },
      json,
    );
    return { language: getLanguage().locale, dir: getLanguage().dir };
  },
  translate(p) {
    const texts = Array.isArray(p['texts']) ? p['texts'] : [];
    const out: Record<string, string> = {};
    for (const text of texts) if (typeof text === 'string') out[text] = t(text);
    return out;
  },
  resolveUpload(p) {
    const id = p['requestId'];
    const pending = typeof id === 'number' ? uploads.get(id) : undefined;
    if (!pending || typeof id !== 'number') return false;
    uploads.delete(id);
    if (typeof p['url'] === 'string') pending.resolve(p['url']);
    else pending.reject(new Error(typeof p['error'] === 'string' ? p['error'] : 'Upload failed.'));
    return true;
  },
  getComments: () => listCommentThreads(editor().getJSON()) as unknown as JsonValue,
  addComment(p) {
    const author = init?.comments?.author;
    if (!author) throw new Error('Comments are not turned on.');
    return editor().execute('addComment', {
      text: str(p['text'], 'text'),
      author,
      ...(typeof p['color'] === 'string' ? { color: p['color'] as CommentColor } : {}),
      ...(typeof p['fill'] === 'boolean' ? { fill: p['fill'] } : {}),
    });
  },
  setCommentStyle(p) {
    const id = str(p['id'], 'id');
    let ok = true;
    if (typeof p['color'] === 'string')
      ok = editor().execute('setCommentColor', id, p['color'] as CommentColor) && ok;
    if (typeof p['fill'] === 'boolean')
      ok = editor().execute('setCommentFill', id, p['fill']) && ok;
    return ok;
  },
  replyToComment(p) {
    const author = init?.comments?.author;
    if (!author) throw new Error('Comments are not turned on.');
    return editor().execute('replyToComment', str(p['id'], 'id'), str(p['text'], 'text'), author);
  },
  resolveComment: (p) =>
    editor().execute('resolveComment', str(p['id'], 'id'), p['resolved'] !== false),
  deleteCommentThread: (p) => editor().execute('deleteCommentThread', str(p['id'], 'id')),
  async openCommentComposer() {
    (await classic?.comments)?.openComposer();
  },
  async toggleCommentsPanel(p) {
    const open = typeof p['open'] === 'boolean' ? p['open'] : undefined;
    (await classic?.comments)?.togglePanel(open);
  },
  async getHighlights() {
    return ((await classic?.reader)?.highlights ?? []) as unknown as JsonValue;
  },
  async setHighlights(p) {
    const items = Array.isArray(p['items']) ? p['items'] : [];
    (await classic?.reader)?.setHighlights(items as unknown as ReaderHighlight[]);
  },
  mathInsert(p) {
    mathControls?.insert(str(p['latex'], 'latex'));
  },
  mathCommand(p) {
    const name = str(p['command'], 'command');
    if (!(MATH_INPUT_COMMANDS as readonly string[]).includes(name))
      throw new Error(`Unknown math command "${name}".`);
    mathControls?.command(name as MathInputCommand);
  },
  mathCommit() {
    mathControls?.commit();
  },
  mathCancel() {
    mathControls?.cancel();
  },
  mathToggleLatex() {
    mathControls?.toggleLatex();
  },
};

async function receive(raw: unknown): Promise<void> {
  const call = parseCall(raw);
  if (!call) return; // not an allowed, well-formed call: ignored
  try {
    const value = await methods[call.method](call.params ?? {});
    post(resultMessage(call.id, value));
  } catch (error) {
    post(errorMessage(call.id, error instanceof Error ? error.message : String(error)));
  }
  // Calls usually change something the toolbar shows; send it with the next frame.
  if (classic) {
    pendingState = true;
    schedule();
  }
}

window.axiomReceive = (message: string) => void receive(message);
if (inIframe) {
  addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window.parent || event.origin !== location.origin) return;
    void receive(event.data);
  });
}

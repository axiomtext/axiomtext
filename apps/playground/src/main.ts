import { MathPlugin } from '@axiomtext/math';
import { BasicStyles } from '@axiomtext/plugin-basic-styles';
import { TextAlignment, Indent } from '@axiomtext/plugin-block-format';
import { Blockquote, PageBreak } from '@axiomtext/plugin-blockquote';
import { FontFamily, FontSize, Highlight, TextColor } from '@axiomtext/plugin-font';
import { Image } from '@axiomtext/plugin-image';
import { Columns } from '@axiomtext/plugin-columns';
import { Table } from '@axiomtext/plugin-table';
import { Link } from '@axiomtext/plugin-link';
import { List } from '@axiomtext/plugin-list';
import { Heading } from '@axiomtext/plugin-heading';
import { Comments } from '@axiomtext/plugin-comments';
import { Marks, Pages } from '@axiomtext/plugin-marks';
import { BijoyPaste } from '@axiomtext/plugin-bijoy';
import { createBalloonEditor, createClassicEditor, createInlineEditor } from '@axiomtext/ui';
import type { Messages } from '@axiomtext/ui';
import type { DocumentJSON } from '@axiomtext/core';
import type { Editor } from '@axiomtext/view';
import { toMarkdown } from '@axiomtext/convert';
import { Braces, Moon, Sun, X, createElement } from 'lucide';
import type { IconNode } from 'lucide';
import { sampleDocument } from './sample';
import './style.css';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};
const svg = (node: IconNode): SVGElement =>
  createElement(node, { width: 18, height: 18, 'aria-hidden': 'true', focusable: 'false' });

// ── Theme ──────────────────────────────────────────────
type Theme = 'light' | 'dark';
const THEME_KEY = 'axiomtext-playground-theme';
const storage = {
  get(): string | null {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  },
  set(value: string): void {
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch {
      /* storage may be unavailable (private mode) */
    }
  },
};
const systemTheme = (): Theme =>
  matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
let theme: Theme =
  storage.get() === 'dark' || storage.get() === 'light' ? (storage.get() as Theme) : systemTheme();

const themeToggle = $<HTMLButtonElement>('theme-toggle');
const applyTheme = (): void => {
  document.documentElement.dataset['theme'] = theme;
  themeToggle.replaceChildren(svg(theme === 'dark' ? Sun : Moon));
  themeToggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
  );
};
applyTheme();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
themeToggle.addEventListener('click', () => {
  const apply = (): void => {
    theme = theme === 'dark' ? 'light' : 'dark';
    storage.set(theme);
    applyTheme();
  };
  // Switch every colour at once: per-element transitions would fade at different speeds.
  const root = document.documentElement;
  root.classList.add('theme-switching');
  const done = (): void => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.remove('theme-switching'));
    });
  };
  const doc = document as Document & {
    startViewTransition?: (update: () => void) => { finished: Promise<void> };
  };
  if (doc.startViewTransition && !reducedMotion.matches) {
    // One smooth cross-fade of the whole page where the browser supports it.
    void doc.startViewTransition(apply).finished.finally(done);
  } else {
    apply();
    done();
  }
});

// ── Language ───────────────────────────────────────────
const params = new URLSearchParams(location.search);
const LOCALES: Record<string, () => Promise<{ default: Messages }>> = {
  bn: () => import('@axiomtext/ui/locales/bn'),
  hi: () => import('@axiomtext/ui/locales/hi'),
  ar: () => import('@axiomtext/ui/locales/ar'),
  es: () => import('@axiomtext/ui/locales/es'),
  fr: () => import('@axiomtext/ui/locales/fr'),
  de: () => import('@axiomtext/ui/locales/de'),
  pt: () => import('@axiomtext/ui/locales/pt'),
  zh: () => import('@axiomtext/ui/locales/zh'),
  ja: () => import('@axiomtext/ui/locales/ja'),
};
const loadTranslations = async (lang: string): Promise<Messages | undefined> =>
  LOCALES[lang] ? (await LOCALES[lang]()).default : undefined;

const langSelect = $<HTMLSelectElement>('lang-select');
const modeSelect = $<HTMLSelectElement>('mode-select');
type Mode = 'classic' | 'inline' | 'balloon';
const readMode = (value: string | null): Mode =>
  value === 'inline' || value === 'balloon' ? value : 'classic';

let language = LOCALES[params.get('lang') ?? ''] ? (params.get('lang') as string) : 'en';
let mode: Mode = readMode(params.get('mode'));
langSelect.value = language;
modeSelect.value = mode;

const plugins = [
  BasicStyles,
  Heading,
  List,
  Blockquote,
  PageBreak,
  Link,
  MathPlugin,
  Table,
  Image,
  Columns,
  FontFamily,
  FontSize,
  TextColor,
  Highlight,
  TextAlignment,
  Indent,
  Comments,
  Marks,
  Pages,
  BijoyPaste,
];

// ── Editor ─────────────────────────────────────────────
// ?mode=inline | balloon picks the editor type, ?lang=bn the UI language. Both can also be
// changed from the header: the editor is rebuilt in place and keeps your text.
// Both are set by mount() before anything else uses them.
let instance!: { editor: Editor; destroy(): void };
let editor!: Editor;
let offChange: (() => void) | undefined;

async function mount(content: DocumentJSON | undefined): Promise<void> {
  const translations = await loadTranslations(language);
  const options = {
    language,
    ...(translations ? { translations } : {}),
    // ?autosave keeps your draft in this browser between visits.
    ...(params.has('autosave') ? { autosave: true } : {}),
    // Comments: on by default in the playground. ?comments=only lets you comment but not edit.
    ...(params.get('comments') === 'off'
      ? {}
      : {
          comments: {
            author: { name: 'You', id: 'you' },
            ...(params.get('comments') === 'only' ? { only: true } : {}),
          },
        }),
    // Marked books: three mark types like a school textbook (Mark menu, Alt+1/2/3).
    marks: {
      types: [
        { id: 'important', label: 'Important', color: '#16a34a', style: 'fill' as const },
        { id: 'marked', label: 'Marked', color: '#2563eb', style: 'underline' as const },
        { id: 'pyq', label: 'Past exam question', color: '#b45309', style: 'box' as const },
      ],
    },
    plugins,
    placeholder: 'Start writing…',
    ariaLabel: 'Document body',
    ...(content ? { content } : {}),
    element: $('editor'),
  };
  document.body.dataset['mode'] = mode;
  instance =
    mode === 'inline'
      ? createInlineEditor(options)
      : mode === 'balloon'
        ? createBalloonEditor(options)
        : createClassicEditor({ ...options, document: true });
  editor = instance.editor;
  // Handy for debugging in the browser console: window.axiomEditor
  (window as unknown as { axiomEditor: Editor }).axiomEditor = editor;
  offChange = editor.on('change', scheduleRender);
}

async function remount(): Promise<void> {
  const content = editor.getJSON();
  const scroll = window.scrollY;
  offChange?.();
  instance.destroy();
  await mount(content);
  window.scrollTo(0, scroll);
  render();
  // Keep the address shareable without reloading the page.
  const url = new URL(location.href);
  if (language === 'en') url.searchParams.delete('lang');
  else url.searchParams.set('lang', language);
  if (mode === 'classic') url.searchParams.delete('mode');
  else url.searchParams.set('mode', mode);
  history.replaceState(null, '', url);
}

langSelect.addEventListener('change', () => {
  language = langSelect.value;
  void remount();
});
modeSelect.addEventListener('change', () => {
  mode = readMode(modeSelect.value);
  void remount();
});

await mount(params.has('empty') ? undefined : sampleDocument);

// ── Developer panel ────────────────────────────────────
const panel = $('dev-panel');
const panelToggle = $<HTMLButtonElement>('panel-toggle');
const panelClose = $<HTMLButtonElement>('panel-close');
const jsonOut = $('out-json');
const htmlOut = $('out-html');
const mdOut = $('out-md');
panelToggle.append(svg(Braces));
panelClose.append(svg(X));

const setPanel = (open: boolean): void => {
  document.body.classList.toggle('panel-open', open);
  panel.setAttribute('aria-hidden', String(!open));
  panelToggle.setAttribute('aria-expanded', String(open));
  if (open) render();
};
panelToggle.addEventListener('click', () =>
  setPanel(!document.body.classList.contains('panel-open')),
);
panelClose.addEventListener('click', () => {
  setPanel(false);
  panelToggle.focus();
});

const tabs = [...panel.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
const selectTab = (tab: HTMLButtonElement): void => {
  for (const t of tabs) {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    const target = document.getElementById(t.getAttribute('aria-controls') ?? '');
    if (target) target.hidden = !selected;
  }
};
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    if (next) {
      selectTab(next);
      next.focus();
    }
  });
});

function render(): void {
  jsonOut.textContent = JSON.stringify(editor.getJSON(), null, 2);
  htmlOut.textContent = editor.getHTML();
  mdOut.textContent = toMarkdown(editor.getJSON());
}
// Serializing the whole document is only worth it while the panel is open, and not on every key.
let renderTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleRender(): void {
  if (!document.body.classList.contains('panel-open')) return;
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 150);
}
render();
if (params.has('panel')) setPanel(true);
editor.focus();

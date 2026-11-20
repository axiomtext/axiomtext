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
import { createClassicEditor } from '@axiomtext/ui';
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
themeToggle.addEventListener('click', () => {
  themeToggle.classList.add('is-switching');
  window.setTimeout(() => {
    theme = theme === 'dark' ? 'light' : 'dark';
    storage.set(theme);
    applyTheme();
    themeToggle.classList.remove('is-switching');
  }, 140);
});

// ── Editor ─────────────────────────────────────────────
const params = new URLSearchParams(location.search);
const { editor } = createClassicEditor({
  element: $('editor'),
  plugins: [
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
  ],
  document: true,
  placeholder: 'Start writing…',
  ariaLabel: 'Document body',
  ...(params.has('empty') ? {} : { content: sampleDocument }),
});

// ── Developer panel ────────────────────────────────────
const panel = $('dev-panel');
const panelToggle = $<HTMLButtonElement>('panel-toggle');
const panelClose = $<HTMLButtonElement>('panel-close');
const jsonOut = $('out-json');
const htmlOut = $('out-html');
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
}
editor.on('change', render);
// Handy for debugging in the browser console: window.axiomEditor
(window as unknown as { axiomEditor: typeof editor }).axiomEditor = editor;
render();
if (params.has('panel')) setPanel(true);
editor.focus();

/**
 * axiomtext/viewer — for pages that show saved AxiomText content.
 *
 *   import { createViewer } from 'axiomtext/viewer';
 *   import 'axiomtext/content.css';
 *
 *   const viewer = createViewer(document.querySelector('.axiomtext-content'), {
 *     highlights: { items: await loadMyHighlights(), onChange: saveMyHighlights },
 *   });
 *
 * - Clicking commented text shows its comment thread (comments are saved in the HTML).
 * - Readers can highlight passages in colours and add private notes, like a marked-up book.
 *   Highlights never change the page: they're drawn with the CSS Highlight API and stored by
 *   your app (per reader), anchored by quote and position so they survive later edits.
 */
import { getLanguage, setLanguage, t } from '@axiomtext/i18n';
import type { Messages } from '@axiomtext/i18n';
import {
  COMMENT_COLORS,
  colorStyle,
  createId,
  hexToRgba,
  isPreset,
  normalizeColor,
  sanitizeComments,
} from '@axiomtext/plugin-comments/data';
import type { CommentColor, CommentEntry, PresetColor } from '@axiomtext/plugin-comments/data';
import { anchor, describe, offsetOf, rangeOf, textModel } from './anchor';
import type { TextAnchor, TextModel } from './anchor';
import { avatar, createColorPicker, setHighlightVars } from './picker';
import type { ColorChoice } from './picker';

export type { TextAnchor } from './anchor';
export { anchor, describe as describeAnchor } from './anchor';
export type { CommentColor, PresetColor } from '@axiomtext/plugin-comments/data';
export { createColorPicker } from './picker';
export type { ColorChoice, ColorPickerOptions } from './picker';

/** A reader's highlight, with an optional private note. Store these per reader. */
export interface ReaderHighlight {
  id: string;
  /** A preset name or any colour as `#rrggbb`. */
  color: CommentColor;
  /** Colour the background (default), or `false` to only underline the text. */
  fill?: boolean;
  /** The reader's note, if any. */
  note?: string;
  /** Where it is: quote with context, and position (W3C Web Annotation selectors). */
  anchor: TextAnchor;
  /** Milliseconds since 1970. */
  created: number;
  updated?: number;
}

/** A highlight in reading order, for a "notebook" view. */
export interface NotebookEntry {
  highlight: ReaderHighlight;
  /** The highlighted text as it is now. */
  text: string;
  /** True when the text is no longer in the document (the highlight can't be shown). */
  orphaned: boolean;
}

export interface ViewerOptions {
  /** Show comment threads when commented text is clicked. Default: true. */
  comments?: boolean;
  /** Let readers highlight and add notes. Off unless given. */
  highlights?: {
    /** Highlights to show (e.g. loaded from your database for this reader). */
    items?: ReaderHighlight[];
    /** Called with all highlights after every change — save them. */
    onChange?: (items: ReaderHighlight[]) => void;
    /** Preset colours offered (readers can also pick any colour). Default: all six. */
    colors?: readonly PresetColor[];
    /** Read-only: show highlights and notes but don't allow changes. */
    readOnly?: boolean;
  };
  /** Interface language and texts (e.g. `'bn'` with `axiomtext/locales/bn`). */
  language?: string;
  translations?: Messages;
}

export interface Viewer {
  /** Current highlights. */
  readonly highlights: ReaderHighlight[];
  /** Replaces all highlights (e.g. after loading them). */
  setHighlights(items: ReaderHighlight[]): void;
  /** Highlights in reading order with their current text — for a notebook / "my notes" list. */
  notebook(): NotebookEntry[];
  /** Scrolls a highlight into view and briefly shows its note. */
  reveal(id: string): void;
  /** Re-anchors highlights after the content changed. */
  refresh(): void;
  destroy(): void;
}

// ── Small DOM helpers ───────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

function relativeTime(time: number): string {
  const seconds = Math.round((time - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const locale = getLanguage().locale;
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 45) return t('just now');
  if (abs < 3600) return format.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return format.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 7) return format.format(Math.round(seconds / 86400), 'day');
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(time);
}

type Rect = { left: number; top: number; bottom: number; right: number };

/** A floating bubble that closes on outside click, Escape or when the page scrolls it away. */
function openBubble(
  content: HTMLElement[],
  at: Rect,
  label: string,
  onClose?: () => void,
): { element: HTMLElement; close(): void } {
  closeBubble?.();
  const element = el(
    'div',
    { class: 'ax-bubble', role: 'dialog', 'aria-label': t(label) },
    content,
  );
  document.body.append(element);
  const place = (): void => {
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    element.style.left = `${Math.max(8, Math.min(at.left, window.innerWidth - width - 8))}px`;
    const below = at.bottom + 8;
    element.style.top = `${below + height > window.innerHeight - 8 && at.top - height - 8 > 8 ? at.top - height - 8 : below}px`;
  };
  place();
  requestAnimationFrame(() => element.classList.add('is-open'));
  const onPointer = (event: PointerEvent): void => {
    if (!element.contains(event.target as Node)) close();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') close();
  };
  // The page scrolling closes it; scrolling inside the bubble doesn't.
  const onScroll = (event: Event): void => {
    if (!(event.target instanceof Node && element.contains(event.target))) close();
  };
  // Stays in place as its content grows (e.g. the colour picker opening).
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => place()) : null;
  resize?.observe(element);
  const close = (): void => {
    if (!element.isConnected) return;
    element.remove();
    resize?.disconnect();
    document.removeEventListener('pointerdown', onPointer, true);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', onScroll, true);
    if (closeBubble === close) closeBubble = null;
    onClose?.();
  };
  // Opened by a pointer event: start listening after it has finished.
  setTimeout(() => {
    document.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('scroll', onScroll, true);
  }, 0);
  document.addEventListener('keydown', onKey);
  closeBubble = close;
  return { element, close };
}
let closeBubble: (() => void) | null = null;

// ── Drawing highlights without changing the page ────────────────

type HighlightRegistryLike = {
  set(name: string, value: unknown): void;
  delete(name: string): void;
};
type HighlightCtor = new (...ranges: Range[]) => unknown;
const cssHighlights = (): { registry: HighlightRegistryLike; Highlight: HighlightCtor } | null => {
  const registry = (globalThis.CSS as unknown as { highlights?: HighlightRegistryLike } | undefined)
    ?.highlights;
  const Highlight = (globalThis as unknown as { Highlight?: HighlightCtor }).Highlight;
  return registry && Highlight ? { registry, Highlight } : null;
};

/** The highlight name for a colour: `ax-hl-yellow`, `ax-hl-yellow-line`, `ax-hl-c1e88e5`… */
const highlightName = (color: CommentColor, fill: boolean): string =>
  `ax-hl-${isPreset(color) ? color : `c${color.slice(1)}`}${fill ? '' : '-line'}`;

/**
 * Rules for custom colours, added at run time (presets are in content.css). A constructed style
 * sheet is used where possible, so pages with a strict Content-Security-Policy still work.
 */
const customRules = new Map<string, string>();
let customSheet: CSSStyleSheet | HTMLStyleElement | null = null;
function ensureCustomRule(color: CommentColor, fill: boolean): void {
  if (isPreset(color)) return;
  const name = highlightName(color, fill);
  if (customRules.has(name)) return;
  customRules.set(
    name,
    fill
      ? `::highlight(${name}) { background-color: ${hexToRgba(color, 0.35)}; }`
      : `::highlight(${name}) { text-decoration: underline 2px ${color}; text-underline-offset: 3px; }`,
  );
  const css = [...customRules.values()].join('\n');
  try {
    if (!customSheet && typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in document) {
      const sheet = new CSSStyleSheet();
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      customSheet = sheet;
    }
    if (customSheet instanceof CSSStyleSheet) {
      customSheet.replaceSync(css);
      return;
    }
  } catch {
    // Fall through to a <style> element.
  }
  let style = customSheet instanceof HTMLStyleElement ? customSheet : null;
  if (!style) {
    style = el('style', { 'data-axiomtext': 'highlights' });
    document.head.append(style);
    customSheet = style;
  }
  style.textContent = css;
}

/** All viewers on the page share the named highlights; each contributes its ranges. */
const drawn = new Map<object, Map<string, Range[]>>();
const used = new Set<string>([...COMMENT_COLORS.map((c) => `ax-hl-${c}`), 'ax-hl-note']);
function redraw(): void {
  const api = cssHighlights();
  if (!api) return;
  for (const m of drawn.values()) for (const name of m.keys()) used.add(name);
  for (const name of used) {
    const ranges = [...drawn.values()].flatMap((m) => m.get(name) ?? []);
    if (ranges.length) api.registry.set(name, new api.Highlight(...ranges));
    else api.registry.delete(name);
  }
}

/** Fallback for old browsers on plain pages: wrap highlighted text in spans. */
function unwrapFallback(root: Element): void {
  for (const span of root.querySelectorAll('span.ax-reader-hl')) {
    span.replaceWith(...span.childNodes);
  }
  root.normalize();
}
function wrapFallback(model: TextModel, start: number, end: number, h: ReaderHighlight): void {
  for (const { node, start: nodeStart } of [...model.nodes]) {
    const nodeEnd = nodeStart + node.data.length;
    if (nodeEnd <= start || nodeStart >= end) continue;
    let target = node;
    const from = Math.max(start - nodeStart, 0);
    const to = Math.min(end - nodeStart, node.data.length);
    if (to < target.data.length) target.splitText(to);
    if (from > 0) target = target.splitText(from);
    const custom = colorStyle(h.color);
    const span = el('span', {
      class: 'ax-reader-hl',
      'data-highlight-id': h.id,
      'data-color': custom ? 'custom' : h.color,
    });
    if (custom) span.setAttribute('style', custom);
    if (h.fill === false) span.setAttribute('data-fill', 'false');
    if (h.note) span.setAttribute('data-note', '');
    target.replaceWith(span);
    span.append(target);
  }
}

// ── The viewer ──────────────────────────────────────────────────

export function createViewer(root: HTMLElement, options: ViewerOptions = {}): Viewer {
  if (options.language) setLanguage(options.language, options.translations);
  const showComments = options.comments !== false;
  const hl = options.highlights;
  const colors = hl?.colors?.length ? hl.colors : COMMENT_COLORS;
  // New highlights use the colour picked last.
  let lastChoice: ColorChoice = { color: colors[0] ?? 'yellow', fill: true };
  const canEdit = !!hl && hl.readOnly !== true;
  // Inside the editor (read-only) the DOM belongs to the editor engine: never change it.
  const managedDom = !!root.closest('.ProseMirror') || root.classList.contains('ProseMirror');
  const useApi = cssHighlights() !== null;
  const key = {};

  const clean = (list: readonly ReaderHighlight[]): ReaderHighlight[] =>
    list.map((h) => ({ ...h, color: normalizeColor(h.color) }));
  let items: ReaderHighlight[] = clean(hl?.items ?? []);
  let model = textModel(root);
  let placed = new Map<string, { start: number; end: number }>();
  let muting = false;

  const emit = (): void => hl?.onChange?.([...items]);

  const render = (): void => {
    muting = true;
    if (!useApi && !managedDom) unwrapFallback(root);
    model = textModel(root);
    placed = new Map();
    const byName = new Map<string, Range[]>();
    const sorted = [...items].sort((a, b) => a.anchor.start - b.anchor.start);
    for (const h of sorted) {
      const found = anchor(model.text, h.anchor);
      if (!found) continue;
      placed.set(h.id, found);
      if (useApi) {
        const range = rangeOf(model, found.start, found.end);
        if (!range) continue;
        const fill = h.fill !== false;
        ensureCustomRule(h.color, fill);
        const name = highlightName(h.color, fill);
        byName.set(name, [...(byName.get(name) ?? []), range]);
        if (h.note) byName.set('ax-hl-note', [...(byName.get('ax-hl-note') ?? []), range]);
      }
    }
    if (useApi) {
      drawn.set(key, byName);
      redraw();
    } else if (!managedDom) {
      // Wrap from the end so earlier offsets stay valid.
      for (const h of sorted.reverse()) {
        const at = placed.get(h.id);
        if (at) wrapFallback(model, at.start, at.end, h);
      }
      model = textModel(root);
    }
    muting = false;
  };

  const highlightsAt = (offset: number): ReaderHighlight[] =>
    items.filter((h) => {
      const at = placed.get(h.id);
      return at && offset >= at.start && offset < at.end;
    });

  const rectOf = (start: number, end: number): Rect => {
    const range = rangeOf(model, start, end);
    return range?.getBoundingClientRect() ?? root.getBoundingClientRect();
  };

  // ── Reader: a highlight's note ──
  const openHighlight = (h: ReaderHighlight, focusNote = false): void => {
    const at = placed.get(h.id);
    if (!at) return;
    const content: HTMLElement[] = [];
    const box = el('div', { class: 'ax-reader-note' });
    const quote = el('q', { class: 'ax-thread__quote' }, [model.text.slice(at.start, at.end)]);
    box.append(quote);
    if (canEdit) {
      box.append(
        createColorPicker({
          value: { color: h.color, fill: h.fill !== false },
          colors,
          onChange: (v) => {
            lastChoice = v;
            update(h.id, { color: v.color, fill: v.fill });
          },
        }).element,
      );
      const area = el('textarea', {
        class: 'ax-comment-input',
        rows: '3',
        placeholder: t('Add a note…'),
        'aria-label': t('Note'),
      });
      area.value = h.note ?? '';
      const save = el('button', { type: 'button', class: 'ax-btn is-primary' }, [t('Save')]);
      const remove = el('button', { type: 'button', class: 'ax-btn' }, [t('Delete highlight')]);
      save.addEventListener('click', () => {
        update(h.id, { note: area.value.trim() });
        bubble.close();
      });
      area.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) save.click();
      });
      remove.addEventListener('click', () => {
        items = items.filter((x) => x.id !== h.id);
        render();
        emit();
        bubble.close();
      });
      box.append(area, el('div', { class: 'ax-comment-actions' }, [remove, save]));
      content.push(box);
      const bubble = openBubble(content, rectOf(at.start, at.end), 'Note');
      if (focusNote) area.focus();
      return;
    }
    if (h.note) box.append(el('p', { class: 'ax-comment__text' }, [h.note]));
    content.push(box);
    openBubble(content, rectOf(at.start, at.end), 'Note');
  };

  const update = (
    id: string,
    change: Partial<Pick<ReaderHighlight, 'color' | 'fill' | 'note'>>,
  ): void => {
    items = items.map((h) => {
      if (h.id !== id) return h;
      const next: ReaderHighlight = { ...h, ...change, updated: Date.now() };
      if (!next.note) delete next.note;
      if (next.fill !== false) delete next.fill;
      return next;
    });
    render();
    emit();
  };

  // ── Reader: selecting text ──
  const selectionOffsets = (): { start: number; end: number } | null => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
    const start = offsetOf(model, range.startContainer, range.startOffset);
    const end = offsetOf(model, range.endContainer, range.endOffset);
    if (start === null || end === null || end <= start) return null;
    // Trim spaces at the edges.
    let s = start;
    let e = end;
    while (s < e && /\s/.test(model.text[s] ?? '')) s++;
    while (e > s && /\s/.test(model.text[e - 1] ?? '')) e--;
    return e > s ? { start: s, end: e } : null;
  };

  const create = (start: number, end: number, choice: ColorChoice): ReaderHighlight => {
    const h: ReaderHighlight = {
      id: createId(),
      color: choice.color,
      anchor: describe(model.text, start, end),
      created: Date.now(),
    };
    if (!choice.fill) h.fill = false;
    items = [...items, h];
    window.getSelection()?.removeAllRanges();
    render();
    emit();
    return h;
  };

  let menuTimer: ReturnType<typeof setTimeout> | undefined;
  const showSelectionMenu = (): void => {
    const at = selectionOffsets();
    if (!at) return;
    // The first colour picked creates the highlight; later picks (any colour, background on or
    // off) change it while the menu is open.
    let made: ReaderHighlight | null = null;
    const note = el('button', { type: 'button', class: 'ax-btn' }, [t('Add note')]);
    const highlight = el('button', { type: 'button', class: 'ax-btn is-primary' }, [
      t('Highlight'),
    ]);
    const picker = createColorPicker({
      value: lastChoice,
      colors,
      onChange: (v) => {
        lastChoice = v;
        if (made) update(made.id, { color: v.color, fill: v.fill });
        else made = create(at.start, at.end, v);
        highlight.hidden = true;
      },
    });
    const menu = el('div', { class: 'ax-reader-menu' }, [
      picker.element,
      el('div', { class: 'ax-comment-actions' }, [note, highlight]),
    ]);
    highlight.addEventListener('click', () => {
      bubble.close();
      create(at.start, at.end, lastChoice);
    });
    note.addEventListener('click', () => {
      bubble.close();
      const h = made ?? create(at.start, at.end, lastChoice);
      const current = items.find((x) => x.id === h.id);
      if (current) openHighlight(current, true);
    });
    const bubble = openBubble([menu], rectOf(at.start, at.end), 'Highlight');
  };
  const onSelectionEnd = (): void => {
    clearTimeout(menuTimer);
    menuTimer = setTimeout(showSelectionMenu, 10);
  };

  // ── Comments saved in the content ──
  const openComments = (mark: HTMLElement): void => {
    const threads: {
      color: CommentColor;
      fill: boolean;
      quote: string;
      comments: CommentEntry[];
    }[] = [];
    for (
      let node: HTMLElement | null = mark;
      node && root.contains(node);
      node = node.parentElement
    ) {
      if (!node.matches('mark.ax-comment') || node.getAttribute('data-resolved') === 'true')
        continue;
      try {
        const comments = sanitizeComments(JSON.parse(node.getAttribute('data-thread') ?? '[]'));
        if (comments.length)
          threads.push({
            color: normalizeColor(
              node.getAttribute('data-color-value') ?? node.getAttribute('data-color'),
            ),
            fill: node.getAttribute('data-fill') !== 'false',
            quote: node.textContent ?? '',
            comments,
          });
      } catch {
        // Not a valid thread: ignore.
      }
    }
    if (!threads.length) return;
    const sections = threads.map((thread) => {
      const section = el('section', { class: 'ax-thread' }, [
        el('header', { class: 'ax-thread__header' }, [
          el('q', { class: 'ax-thread__quote' }, [thread.quote.trim()]),
        ]),
        el(
          'ol',
          { class: 'ax-thread__comments' },
          thread.comments.map((c) => {
            const name = c.author || t('Someone');
            return el('li', { class: 'ax-comment' }, [
              avatar(name, 28),
              el('div', { class: 'ax-comment__main' }, [
                el('div', { class: 'ax-comment__meta' }, [
                  el('strong', {}, [name]),
                  el('time', { datetime: new Date(c.time).toISOString() }, [
                    c.time ? relativeTime(c.time) : '',
                  ]),
                ]),
                el('p', { class: 'ax-comment__text' }, [c.text]),
              ]),
            ]);
          }),
        ),
      ]);
      setHighlightVars(section, thread.color);
      if (!thread.fill) section.setAttribute('data-line', '');
      return section;
    });
    openBubble(sections, mark.getBoundingClientRect(), 'Comments');
  };

  // ── Clicks ──
  const caretOffset = (x: number, y: number): number | null => {
    const doc = document as Document & {
      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => { offsetNode: Node; offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    const pos = doc.caretPositionFromPoint?.(x, y);
    if (pos) return offsetOf(model, pos.offsetNode, pos.offset);
    const range = doc.caretRangeFromPoint?.(x, y);
    return range ? offsetOf(model, range.startContainer, range.startOffset) : null;
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.shiftKey) onSelectionEnd();
  };
  const onClick = (event: MouseEvent): void => {
    if (window.getSelection()?.isCollapsed === false) return; // finishing a selection
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (hl && items.length) {
      const offset = caretOffset(event.clientX, event.clientY);
      const found = offset === null ? [] : highlightsAt(offset);
      const h = found.at(-1);
      if (h) {
        openHighlight(h);
        return;
      }
    }
    const mark = target?.closest<HTMLElement>('mark.ax-comment');
    if (showComments && mark && root.contains(mark)) openComments(mark);
  };
  root.addEventListener('click', onClick);
  if (canEdit) {
    root.addEventListener('mouseup', onSelectionEnd);
    root.addEventListener('touchend', onSelectionEnd);
    root.addEventListener('keyup', onKeyUp);
  }

  // Content changes (e.g. the editor showing a new document): re-anchor.
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver(() => {
    if (muting) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(render, 100);
  });
  observer.observe(root, { childList: true, characterData: true, subtree: true });
  render();

  return {
    get highlights() {
      return [...items];
    },
    setHighlights(next) {
      items = clean(next);
      render();
    },
    notebook() {
      return [...items]
        .map((h) => {
          const at = placed.get(h.id);
          return {
            highlight: h,
            text: at ? model.text.slice(at.start, at.end) : h.anchor.exact,
            orphaned: !at,
            start: at?.start ?? Number.MAX_SAFE_INTEGER,
          };
        })
        .sort((a, b) => a.start - b.start)
        .map(({ highlight, text, orphaned }) => ({ highlight, text, orphaned }));
    },
    reveal(id) {
      const at = placed.get(id);
      const h = items.find((x) => x.id === id);
      if (!at || !h) return;
      const range = rangeOf(model, at.start, at.end);
      const target = range?.startContainer.parentElement;
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(() => openHighlight(h), 350);
    },
    refresh: render,
    destroy() {
      observer.disconnect();
      clearTimeout(refreshTimer);
      clearTimeout(menuTimer);
      root.removeEventListener('click', onClick);
      root.removeEventListener('mouseup', onSelectionEnd);
      root.removeEventListener('touchend', onSelectionEnd);
      root.removeEventListener('keyup', onKeyUp);
      closeBubble?.();
      drawn.delete(key);
      redraw();
      if (!useApi && !managedDom) unwrapFallback(root);
    },
  };
}

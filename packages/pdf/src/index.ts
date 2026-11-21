/**
 * axiomtext/pdf — mark up an existing PDF with the same marks, highlights and notes as
 * AxiomText documents, without retyping it. Uses pdf.js (`pdfjs-dist`, install it yourself).
 *
 *   import { createPdfAnnotator } from 'axiomtext/pdf';
 *
 *   const pdf = await createPdfAnnotator(element, {
 *     source: '/books/biology-chapter-3.pdf',
 *     markTypes,                       // the same mark types as your documents
 *     mode: 'mark',                    // teachers mark; 'read' for students
 *     annotations: await api.load(),   // marks and highlights saved by your app
 *     onChange: (items) => api.save(items),
 *     onMarkClick: ({ annotation }) => showQuestions(annotation.data),
 *   });
 *
 * Annotations are anchored by page, quoted text (with context) and rectangles on the page, so
 * they stay in place and can be found again in a new edition of the file.
 */
import { getLanguage, t } from '@axiomtext/i18n';
import { hexToRgba, isPreset, normalizeColor } from '@axiomtext/plugin-comments/data';
import type { CommentColor } from '@axiomtext/plugin-comments/data';
import {
  createMarkId,
  localizeNumber,
  normalizeMarkTypes,
  sanitizeBadge,
  sanitizeMarkData,
} from '@axiomtext/plugin-marks/data';
import type { MarkData, MarkTypeDef } from '@axiomtext/plugin-marks/data';
import { describe, offsetOf, textModel } from '@axiomtext/viewer/anchor';
import type { TextAnchor } from '@axiomtext/viewer/anchor';
import { createColorPicker } from '@axiomtext/viewer/picker';
import type { ColorChoice } from '@axiomtext/viewer/picker';

/** A rectangle on a page, as fractions of the page's width and height (0…1). */
export interface PdfRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A mark or highlight on a PDF. Store these (per book, or per reader for highlights). */
export interface PdfAnnotation {
  id: string;
  /** `mark`: one of your mark types (teachers). `highlight`: a reader's own highlight. */
  kind: 'mark' | 'highlight';
  /** Mark type id (marks). */
  type?: string;
  /** Colour (highlights): a preset name or `#rrggbb`. */
  color?: CommentColor;
  /** Highlights: colour the background (default) or underline. */
  fill?: boolean;
  /** 1-based page number. */
  page: number;
  /** The quoted text with context, within the page's text. */
  anchor: TextAnchor;
  /** Where it is on the page. */
  rects: PdfRect[];
  /** Your app's data (marks), e.g. linked question ids. */
  data?: MarkData | null;
  badge?: string | null;
  /** A note (highlights). */
  note?: string;
  created: number;
  updated?: number;
}

/** What `onMarkClick` receives. */
export interface PdfMarkClickEvent {
  annotation: PdfAnnotation;
  rect: { top: number; bottom: number; left: number; right: number };
}

/** What `onSelectionAction` receives. */
export interface PdfSelectionActionEvent {
  actionId: string;
  text: string;
  page: number;
  anchor: TextAnchor;
  rects: PdfRect[];
}

/** The parts of pdf.js used here (so any recent pdfjs-dist version works). */
interface PdfJs {
  getDocument(src: unknown): { promise: Promise<PdfDocument>; destroy(): Promise<void> };
  GlobalWorkerOptions: { workerSrc: string };
  TextLayer: new (options: {
    textContentSource: unknown;
    container: HTMLElement;
    viewport: unknown;
  }) => { render(): Promise<unknown>; cancel(): void };
}
interface PdfDocument {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
  destroy(): Promise<void>;
}
interface PdfPage {
  getViewport(o: { scale: number }): { width: number; height: number; scale: number };
  render(o: { canvas: HTMLCanvasElement; viewport: unknown; transform?: number[] }): {
    promise: Promise<void>;
    cancel(): void;
  };
  getTextContent(): Promise<unknown>;
}

export interface PdfAnnotatorOptions {
  /** The PDF: a URL or its bytes. */
  source: string | ArrayBuffer | Uint8Array;
  /** pdf.js, if you load it yourself. Default: `import('pdfjs-dist')`. */
  pdfjs?: unknown;
  /** URL of pdf.js's worker (`pdfjs-dist/build/pdf.worker.min.mjs`), if your bundler needs it. */
  workerSrc?: string;
  /** Your mark types (the same as in your documents). */
  markTypes?: readonly MarkTypeDef[];
  /** `mark`: selecting text offers your mark types (teachers). `read` (default): highlights only. */
  mode?: 'read' | 'mark';
  /** Let readers highlight and add notes. Default: true. */
  highlights?: boolean;
  /** Saved annotations to show. */
  annotations?: readonly PdfAnnotation[];
  /** Called with all annotations after every change: save them. */
  onChange?: (annotations: PdfAnnotation[]) => void;
  /** A mark was tapped (show the linked questions, a note…). */
  onMarkClick?: (event: PdfMarkClickEvent) => void;
  /** Your items in the menu for selected text, e.g. `{ id: 'ask', label: 'Ask AI' }`. */
  selectionActions?: readonly { id: string; label: string }[];
  onSelectionAction?: (event: PdfSelectionActionEvent) => void;
  /** Called when a page comes into view (1-based). */
  onPageChange?: (page: number) => void;
}

export interface PdfAnnotator {
  readonly pageCount: number;
  readonly annotations: PdfAnnotation[];
  setAnnotations(items: readonly PdfAnnotation[]): void;
  /** Shows a page (1-based). */
  scrollToPage(page: number): void;
  /** Scrolls to an annotation. */
  reveal(id: string): void;
  /** Re-lays out the pages (e.g. after the container was resized). */
  refresh(): void;
  destroy(): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
};

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** Valid stored annotations only. */
export function sanitizeAnnotations(items: readonly unknown[]): PdfAnnotation[] {
  const out: PdfAnnotation[] = [];
  for (const raw of items) {
    if (typeof raw !== 'object' || raw === null) continue;
    const a = raw as Record<string, unknown>;
    const page = Number(a['page']);
    const anchor = a['anchor'] as TextAnchor | undefined;
    if (typeof a['id'] !== 'string' || !Number.isInteger(page) || page < 1) continue;
    if (!anchor || typeof anchor.exact !== 'string') continue;
    const rects = Array.isArray(a['rects'])
      ? (a['rects'] as unknown[]).flatMap((r) => {
          if (typeof r !== 'object' || r === null) return [];
          const { x, y, w, h } = r as Record<string, unknown>;
          return [x, y, w, h].every((v) => typeof v === 'number' && Number.isFinite(v))
            ? [
                {
                  x: clamp01(x as number),
                  y: clamp01(y as number),
                  w: clamp01(w as number),
                  h: clamp01(h as number),
                },
              ]
            : [];
        })
      : [];
    out.push({
      id: a['id'],
      kind: a['kind'] === 'mark' ? 'mark' : 'highlight',
      ...(typeof a['type'] === 'string' ? { type: a['type'] } : {}),
      ...(a['color'] !== undefined ? { color: normalizeColor(a['color']) } : {}),
      ...(a['fill'] === false ? { fill: false } : {}),
      page,
      anchor,
      rects,
      ...(a['data'] !== undefined ? { data: sanitizeMarkData(a['data']) } : {}),
      ...(a['badge'] !== undefined ? { badge: sanitizeBadge(a['badge']) } : {}),
      ...(typeof a['note'] === 'string' && a['note'] ? { note: a['note'].slice(0, 10_000) } : {}),
      created: typeof a['created'] === 'number' ? a['created'] : Date.now(),
      ...(typeof a['updated'] === 'number' ? { updated: a['updated'] } : {}),
    });
  }
  return out;
}

/** Joins the selection's line boxes into one rectangle per line, relative to the page. */
function selectionRects(range: Range, page: HTMLElement): PdfRect[] {
  const box = page.getBoundingClientRect();
  if (!box.width || !box.height) return [];
  const lines: DOMRect[] = [];
  for (const r of range.getClientRects()) {
    if (r.width < 1 || r.height < 1) continue;
    const line = lines.find(
      (l) =>
        Math.abs(l.top - r.top) < r.height * 0.5 && Math.abs(l.bottom - r.bottom) < r.height * 0.5,
    );
    if (line) {
      const left = Math.min(line.left, r.left);
      const right = Math.max(line.right, r.right);
      const top = Math.min(line.top, r.top);
      const bottom = Math.max(line.bottom, r.bottom);
      lines[lines.indexOf(line)] = new DOMRect(left, top, right - left, bottom - top);
    } else {
      lines.push(DOMRect.fromRect(r));
    }
  }
  return lines.map((r) => ({
    x: clamp01((r.left - box.left) / box.width),
    y: clamp01((r.top - box.top) / box.height),
    w: clamp01(r.width / box.width),
    h: clamp01(r.height / box.height),
  }));
}

/** Opens a PDF in `element` with marks, highlights and notes on top. */
export async function createPdfAnnotator(
  element: HTMLElement,
  options: PdfAnnotatorOptions,
): Promise<PdfAnnotator> {
  const pdfjs = (options.pdfjs ?? (await import('pdfjs-dist'))) as PdfJs;
  if (options.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = options.workerSrc;
  else if (
    !pdfjs.GlobalWorkerOptions.workerSrc &&
    !(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker
  ) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).href;
  }
  const source =
    typeof options.source === 'string' ? { url: options.source } : { data: options.source };
  // No eval (works under a strict Content-Security-Policy, as in the Flutter engine).
  const task = pdfjs.getDocument({ ...source, isEvalSupported: false });
  const doc = await task.promise;

  const types = normalizeMarkTypes(options.markTypes);
  const canMark = options.mode === 'mark' && types.length > 0;
  const canHighlight = options.highlights !== false;
  const actions = options.selectionActions ?? [];
  let items = sanitizeAnnotations(options.annotations ?? []);
  let lastChoice: ColorChoice = { color: 'yellow', fill: true };

  const root = el('div', { class: 'ax-pdf', role: 'document', 'aria-label': t('PDF document') });
  element.append(root);

  interface PageState {
    n: number;
    page: PdfPage;
    box: HTMLElement;
    canvas: HTMLCanvasElement;
    text: HTMLElement;
    overlay: HTMLElement;
    rendered: boolean;
    task?: { cancel(): void };
    layer?: { cancel(): void };
  }
  const pages: PageState[] = [];

  const widthFor = (): number =>
    Math.max(240, Math.min(root.clientWidth || element.clientWidth || 800, 1100));

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const canvas = el('canvas', { class: 'ax-pdf__canvas', 'aria-hidden': 'true' });
    const text = el('div', { class: 'textLayer ax-pdf__text' });
    const overlay = el('div', { class: 'ax-pdf__overlay', 'aria-hidden': 'true' });
    const label = el('div', { class: 'ax-pdf__number' }, [
      t('Page {number}', { number: localizeNumber(n, getLanguage().locale) }),
    ]);
    const box = el(
      'section',
      { class: 'ax-pdf__page', 'data-page': String(n), 'aria-label': label.textContent ?? '' },
      [canvas, overlay, text, label],
    );
    root.append(box);
    pages.push({ n, page, box, canvas, text, overlay, rendered: false });
  }

  const layout = (): void => {
    const width = widthFor();
    for (const p of pages) {
      const v = p.page.getViewport({ scale: 1 });
      const scale = width / v.width;
      p.box.style.width = `${Math.floor(v.width * scale)}px`;
      p.box.style.height = `${Math.floor(v.height * scale)}px`;
      p.box.style.setProperty('--total-scale-factor', String(scale));
      p.box.style.setProperty('--scale-factor', String(scale));
    }
  };

  const renderPage = async (p: PageState): Promise<void> => {
    if (p.rendered) return;
    p.rendered = true;
    const width = widthFor();
    const v1 = p.page.getViewport({ scale: 1 });
    const scale = width / v1.width;
    const viewport = p.page.getViewport({ scale });
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    p.canvas.width = Math.floor(viewport.width * ratio);
    p.canvas.height = Math.floor(viewport.height * ratio);
    p.canvas.style.width = `${Math.floor(viewport.width)}px`;
    p.canvas.style.height = `${Math.floor(viewport.height)}px`;
    const task = p.page.render({
      canvas: p.canvas,
      viewport,
      ...(ratio !== 1 ? { transform: [ratio, 0, 0, ratio, 0, 0] } : {}),
    });
    p.task = task;
    p.text.replaceChildren();
    const layer = new pdfjs.TextLayer({
      textContentSource: await p.page.getTextContent(),
      container: p.text,
      viewport,
    });
    p.layer = layer;
    try {
      await Promise.all([task.promise, layer.render()]);
      p.box.classList.add('is-rendered');
    } catch {
      // Cancelled (scrolled away or destroyed).
      p.rendered = false;
    }
    drawPage(p);
  };

  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const p = pages.find((x) => x.box === entry.target);
              if (p) {
                void renderPage(p);
                options.onPageChange?.(p.n);
              }
            }
          },
          { root: null, rootMargin: '600px 0px' },
        )
      : null;

  // ── Drawing annotations ──
  const drawPage = (p: PageState): void => {
    p.overlay.replaceChildren();
    const onPage = items.filter((a) => a.page === p.n);
    for (const a of onPage) {
      const def = a.kind === 'mark' ? types.find((x) => x.id === a.type) : undefined;
      a.rects.forEach((r, i) => {
        const part = el('div', {
          class: `ax-pdf__hl${a.kind === 'mark' ? ' is-mark' : ''}`,
          'data-annotation-id': a.id,
        });
        part.style.left = `${r.x * 100}%`;
        part.style.top = `${r.y * 100}%`;
        part.style.width = `${r.w * 100}%`;
        part.style.height = `${r.h * 100}%`;
        if (def) {
          part.style.setProperty('--ax-mark', def.color);
          part.dataset['markStyle'] = def.style;
        } else {
          const color = normalizeColor(a.color);
          part.style.setProperty(
            '--ax-hl',
            isPreset(color) ? `var(--ax-hl-${color})` : hexToRgba(color, 0.35),
          );
          part.style.setProperty(
            '--ax-hl-line',
            isPreset(color) ? `var(--ax-hl-${color}-line)` : color,
          );
          if (a.fill === false) part.dataset['fill'] = 'false';
          if (a.note) part.dataset['note'] = '';
        }
        p.overlay.append(part);
        const badge = a.badge ? sanitizeBadge(a.badge) : null;
        if (badge && i === a.rects.length - 1) {
          const b = el('span', { class: 'ax-mark-badge ax-pdf__badge' }, [badge]);
          b.style.left = `${(r.x + r.w) * 100}%`;
          b.style.top = `${r.y * 100}%`;
          if (def) b.style.setProperty('--ax-mark', def.color);
          p.overlay.append(b);
        }
      });
    }
  };
  const drawAll = (): void => pages.forEach((p) => drawPage(p));
  const emit = (): void => options.onChange?.(items.map((a) => ({ ...a })));

  // ── Bubble (menus and notes) ──
  let bubble: HTMLElement | null = null;
  const closeBubble = (): void => {
    bubble?.remove();
    bubble = null;
  };
  const openBubble = (
    content: HTMLElement[],
    at: { left: number; bottom: number; top: number },
    label: string,
  ): HTMLElement => {
    closeBubble();
    const b = el(
      'div',
      { class: 'ax-bubble ax-pdf__bubble', role: 'dialog', 'aria-label': t(label) },
      content,
    );
    document.body.append(b);
    const width = b.offsetWidth;
    const height = b.offsetHeight;
    b.style.left = `${Math.max(8, Math.min(at.left, window.innerWidth - width - 8))}px`;
    const below = at.bottom + 8;
    b.style.top = `${below + height > window.innerHeight - 8 && at.top - height - 8 > 8 ? at.top - height - 8 : below}px`;
    requestAnimationFrame(() => b.classList.add('is-open'));
    bubble = b;
    return b;
  };
  const onOutside = (event: PointerEvent): void => {
    if (bubble && !bubble.contains(event.target as Node)) closeBubble();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') closeBubble();
  };
  document.addEventListener('pointerdown', onOutside, true);
  document.addEventListener('keydown', onKey);

  const update = (id: string, change: Partial<PdfAnnotation>): void => {
    items = items.map((a) => (a.id === id ? { ...a, ...change, updated: Date.now() } : a));
    drawAll();
    emit();
  };
  const remove = (id: string): void => {
    items = items.filter((a) => a.id !== id);
    drawAll();
    emit();
  };

  const openNote = (a: PdfAnnotation, at: DOMRect): void => {
    const area = el('textarea', {
      class: 'ax-comment-input',
      rows: '3',
      placeholder: t('Add a note…'),
      'aria-label': t('Note'),
    });
    area.value = a.note ?? '';
    const save = el('button', { type: 'button', class: 'ax-btn is-primary' }, [t('Save')]);
    const del = el('button', { type: 'button', class: 'ax-btn' }, [t('Delete highlight')]);
    const picker = createColorPicker({
      value: { color: normalizeColor(a.color), fill: a.fill !== false },
      onChange: (v) => update(a.id, { color: v.color, fill: v.fill }),
    });
    save.addEventListener('click', () => {
      const note = area.value.trim();
      update(a.id, note ? { note } : { note: '' });
      closeBubble();
    });
    del.addEventListener('click', () => {
      remove(a.id);
      closeBubble();
    });
    openBubble(
      [
        el('div', { class: 'ax-reader-note' }, [
          el('q', { class: 'ax-thread__quote' }, [a.anchor.exact]),
          picker.element,
          area,
          el('div', { class: 'ax-comment-actions' }, [del, save]),
        ]),
      ],
      at,
      'Note',
    );
    area.focus();
  };

  // ── Selecting text ──
  const selectionOnPage = (): {
    p: PageState;
    range: Range;
    start: number;
    end: number;
    text: string;
  } | null => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const pageBox = (
      range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement
    )?.closest<HTMLElement>('.ax-pdf__page');
    const p = pages.find((x) => x.box === pageBox);
    if (!p) return null;
    const model = textModel(p.text);
    const start = offsetOf(model, range.startContainer, range.startOffset);
    const end = offsetOf(model, range.endContainer, range.endOffset);
    if (start === null || end === null || end <= start) return null;
    return { p, range, start, end, text: model.text };
  };

  const showSelectionMenu = (): void => {
    const found = selectionOnPage();
    if (!found) return;
    const { p, range, start, end, text } = found;
    const rects = selectionRects(range, p.box);
    if (!rects.length) return;
    const anchor = describe(text, start, end);
    const at = range.getBoundingClientRect();
    const make = (extra: Partial<PdfAnnotation> & Pick<PdfAnnotation, 'kind'>): PdfAnnotation => {
      const a: PdfAnnotation = {
        id: createMarkId(),
        page: p.n,
        anchor,
        rects,
        created: Date.now(),
        ...extra,
      };
      items = [...items, a];
      window.getSelection()?.removeAllRanges();
      drawPage(p);
      emit();
      return a;
    };
    const content: HTMLElement[] = [];
    if (canMark) {
      const chips = types.map((type) => {
        const chip = el('button', { type: 'button', class: 'ax-legend__item' }, [
          el('span', { class: 'ax-mark ax-legend__sample', 'data-mark-style': type.style }, [
            type.label,
          ]),
        ]);
        chip.style.setProperty('--ax-mark', type.color);
        chip
          .querySelector<HTMLElement>('.ax-legend__sample')
          ?.style.setProperty('--ax-mark', type.color);
        chip.addEventListener('click', () => {
          make({ kind: 'mark', type: type.id });
          closeBubble();
        });
        return chip;
      });
      content.push(
        el('div', { class: 'ax-pdf__marks', role: 'group', 'aria-label': t('Mark') }, chips),
      );
    }
    if (canHighlight) {
      let made: PdfAnnotation | null = null;
      const picker = createColorPicker({
        value: lastChoice,
        onChange: (v) => {
          lastChoice = v;
          if (made) update(made.id, { color: v.color, fill: v.fill });
          else
            made = make({ kind: 'highlight', color: v.color, ...(v.fill ? {} : { fill: false }) });
        },
      });
      const note = el('button', { type: 'button', class: 'ax-btn' }, [t('Add note')]);
      note.addEventListener('click', () => {
        const a = made ?? make({ kind: 'highlight', color: lastChoice.color });
        openNote(a, at);
      });
      content.push(picker.element, el('div', { class: 'ax-comment-actions' }, [note]));
    }
    if (actions.length) {
      content.push(
        el(
          'div',
          { class: 'ax-reader-actions' },
          actions.map((action) => {
            const b = el('button', { type: 'button', class: 'ax-btn', 'data-action': action.id }, [
              action.label,
            ]);
            b.addEventListener('click', () => {
              closeBubble();
              options.onSelectionAction?.({
                actionId: action.id,
                text: anchor.exact,
                page: p.n,
                anchor,
                rects,
              });
            });
            return b;
          }),
        ),
      );
    }
    if (!content.length) return;
    openBubble([el('div', { class: 'ax-reader-menu' }, content)], at, 'Highlight');
  };

  let selectTimer: ReturnType<typeof setTimeout> | undefined;
  const onPointerUp = (): void => {
    clearTimeout(selectTimer);
    selectTimer = setTimeout(showSelectionMenu, 10);
  };

  // ── Taps on annotations (the text layer is on top, so find them by position) ──
  const onClick = (event: MouseEvent): void => {
    if (window.getSelection()?.isCollapsed === false) return;
    const pageBox = (event.target as Element | null)?.closest<HTMLElement>('.ax-pdf__page');
    const p = pages.find((x) => x.box === pageBox);
    if (!p) return;
    const box = p.box.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    const hit = items
      .filter(
        (a) =>
          a.page === p.n &&
          a.rects.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h),
      )
      .at(-1);
    if (!hit) return;
    const rect = {
      top: event.clientY - 8,
      bottom: event.clientY + 8,
      left: event.clientX,
      right: event.clientX,
    };
    if (hit.kind === 'mark') {
      options.onMarkClick?.({ annotation: { ...hit }, rect });
      if (options.mode === 'mark') {
        // Teachers can remove a mark.
        const removeButton = el('button', { type: 'button', class: 'ax-btn' }, [t('Remove mark')]);
        removeButton.addEventListener('click', () => {
          remove(hit.id);
          closeBubble();
        });
        openBubble(
          [el('div', { class: 'ax-reader-menu' }, [removeButton])],
          new DOMRect(rect.left, rect.top, 0, 16),
          'Mark',
        );
      }
    } else if (canHighlight) {
      openNote(hit, new DOMRect(rect.left, rect.top, 0, 16));
    }
  };

  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('keyup', (event) => {
    if (event.shiftKey) onPointerUp();
  });
  root.addEventListener('click', onClick);

  layout();
  for (const p of pages) {
    if (observer) observer.observe(p.box);
    else void renderPage(p);
  }
  const resize =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          const width = widthFor();
          if (Math.abs(width - Number(root.dataset['width'] ?? 0)) < 4) return;
          root.dataset['width'] = String(width);
          for (const p of pages) {
            p.task?.cancel();
            p.layer?.cancel();
            p.rendered = false;
            p.box.classList.remove('is-rendered');
          }
          layout();
          for (const p of pages) {
            observer?.unobserve(p.box);
            observer?.observe(p.box);
          }
        })
      : null;
  root.dataset['width'] = String(widthFor());
  resize?.observe(root);

  return {
    pageCount: doc.numPages,
    get annotations() {
      return items.map((a) => ({ ...a }));
    },
    setAnnotations(next) {
      items = sanitizeAnnotations(next);
      drawAll();
    },
    scrollToPage(n) {
      pages[Math.min(Math.max(n, 1), pages.length) - 1]?.box.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      });
    },
    reveal(id) {
      const a = items.find((x) => x.id === id);
      const p = a ? pages[a.page - 1] : undefined;
      if (!a || !p) return;
      p.box.scrollIntoView({ block: 'center', behavior: 'smooth' });
      void renderPage(p).then(() => {
        p.overlay
          .querySelectorAll<HTMLElement>(`[data-annotation-id="${CSS.escape(id)}"]`)
          .forEach((part) => {
            part.classList.remove('is-flash');
            void part.offsetWidth;
            part.classList.add('is-flash');
          });
      });
    },
    refresh() {
      layout();
      drawAll();
    },
    destroy() {
      observer?.disconnect();
      resize?.disconnect();
      clearTimeout(selectTimer);
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onKey);
      closeBubble();
      for (const p of pages) {
        p.task?.cancel();
        p.layer?.cancel();
      }
      void task.destroy();
      root.remove();
    },
  };
}

/**
 * Marks in shown content (axiomtext/viewer): tap events, badges, the legend and the reading
 * filter. On plain web pages these work on the page itself; inside a read-only editor the
 * editor's own marks plugin draws badges and folds, and these only report and drive it.
 */
import { t } from '@axiomtext/i18n';
import {
  localizeNumber,
  markColorStyle,
  normalizeMarkTypes,
  parseMarkData,
  sanitizeBadge,
} from '@axiomtext/plugin-marks/data';
import type { MarkData, MarkStyle, MarkTypeDef } from '@axiomtext/plugin-marks/data';
import { getLanguage } from '@axiomtext/i18n';

export type { MarkData, MarkStyle, MarkTypeDef };

/** What the app gets when a reader taps a mark. */
export interface MarkClickEvent {
  id: string;
  type: string;
  text: string;
  data: MarkData | null;
  badge: string | null;
  page: number | null;
  rect: { top: number; bottom: number; left: number; right: number };
}

/** `'all'`, `'marked'` (paragraphs with any mark) or the mark type ids to show. */
export type MarkFilter = 'all' | 'marked' | readonly string[];

const MARK = 'mark.ax-mark[data-mark-id]';

/** Number of the page block before a node, or null. */
export function pageOf(root: Element, node: Node): number | null {
  let page: number | null = null;
  for (const el of root.querySelectorAll<HTMLElement>('[data-page]')) {
    if (el === node || el.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) {
      const n = Number(el.getAttribute('data-page'));
      if (Number.isFinite(n)) page = n;
    } else {
      break;
    }
  }
  return page;
}

/** Every element of a mark, in order. */
const partsOf = (root: Element, id: string): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>(MARK)].filter(
    (el) => el.getAttribute('data-mark-id') === id,
  );

export function markClickEvent(root: Element, el: HTMLElement): MarkClickEvent | null {
  const id = el.getAttribute('data-mark-id');
  const type = el.getAttribute('data-mark-type');
  if (!id || !type) return null;
  const parts = partsOf(root, id);
  const data = parseMarkData(el.getAttribute('data-mark'));
  const rect = el.getBoundingClientRect();
  return {
    id,
    type,
    text: parts
      .map((p) => p.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
    data,
    badge: sanitizeBadge(el.getAttribute('data-badge')),
    page: pageOf(root, parts[0] ?? el),
    rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
  };
}

/** Plain pages: applies the app's mark types (colour and style) to saved marks. */
export function styleMarks(root: Element, types: readonly MarkTypeDef[]): void {
  const defs = normalizeMarkTypes(types);
  for (const el of root.querySelectorAll<HTMLElement>(MARK)) {
    const def = defs.find((d) => d.id === el.getAttribute('data-mark-type'));
    if (!def) continue;
    el.style.setProperty('--ax-mark', def.color);
    el.setAttribute('data-mark-style', def.style);
    el.title = def.label;
  }
}

/** Plain pages: draws each mark's badge after its last part. Returns a cleanup function. */
export function drawBadges(root: Element): () => void {
  root.querySelectorAll('.ax-mark-badge[data-viewer]').forEach((b) => b.remove());
  const last = new Map<string, HTMLElement>();
  for (const el of root.querySelectorAll<HTMLElement>(MARK)) {
    if (el.hasAttribute('data-badge')) last.set(el.getAttribute('data-mark-id') ?? '', el);
  }
  const added: HTMLElement[] = [];
  for (const el of last.values()) {
    const badge = sanitizeBadge(el.getAttribute('data-badge'));
    if (!badge) continue;
    const span = document.createElement('span');
    span.className = 'ax-mark-badge';
    span.dataset['viewer'] = '';
    span.setAttribute('aria-hidden', 'true');
    const color = el.style.getPropertyValue('--ax-mark');
    if (color) span.setAttribute('style', markColorStyle(color));
    span.textContent = badge;
    el.after(span);
    added.push(span);
  }
  return () => added.forEach((s) => s.remove());
}

const shows = (block: Element, filter: MarkFilter): boolean => {
  if (filter === 'all' || block.matches('[data-page]')) return true;
  const marks = [...block.querySelectorAll(MARK)];
  if (filter === 'marked') return marks.length > 0;
  return marks.some((m) => filter.includes(m.getAttribute('data-mark-type') ?? ''));
};

/**
 * Plain pages: folds top-level blocks without a shown mark into "… 3 paragraphs" buttons that
 * expand. Returns a cleanup function.
 */
export function foldBlocks(root: Element, filter: MarkFilter): () => void {
  const folded: Element[] = [];
  const buttons: HTMLElement[] = [];
  if (filter !== 'all') {
    let group: Element[] = [];
    const flush = (): void => {
      if (!group.length) return;
      const members = group;
      const first = members[0];
      if (!first) return;
      members.forEach((b) => b.classList.add('ax-folded'));
      folded.push(...members);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ax-fold';
      button.setAttribute('aria-expanded', 'false');
      button.textContent = t(
        members.length === 1 ? '… {count} paragraph' : '… {count} paragraphs',
        {
          count: localizeNumber(members.length, getLanguage().locale),
        },
      );
      button.addEventListener('click', () => {
        members.forEach((b) => {
          b.classList.remove('ax-folded');
          b.classList.add('ax-unfolded');
        });
        button.remove();
      });
      first.before(button);
      buttons.push(button);
      group = [];
    };
    for (const block of [...root.children]) {
      if (block.matches('.ax-fold, .ax-legend')) continue;
      if (shows(block, filter)) flush();
      else group.push(block);
    }
    flush();
  }
  return () => {
    folded.forEach((b) => b.classList.remove('ax-folded', 'ax-unfolded'));
    buttons.forEach((b) => b.remove());
  };
}

/**
 * The legend: each mark type with a sample and how many there are. Tapping a type shows or
 * hides paragraphs with it; "Only marked" folds paragraphs without any mark.
 */
export function createLegend(
  types: readonly MarkTypeDef[],
  counts: () => Map<string, number>,
  filter: MarkFilter,
  onChange: (filter: MarkFilter) => void,
): { element: HTMLElement; update(): void; setFilter(filter: MarkFilter): void } {
  const defs = normalizeMarkTypes(types);
  const element = document.createElement('div');
  element.className = 'ax-legend';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', t('Marks'));
  let current: MarkFilter = filter;

  const selected = (): Set<string> =>
    new Set(current === 'all' || current === 'marked' ? defs.map((d) => d.id) : current);

  const buttons = defs.map((def) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ax-legend__item';
    button.style.setProperty('--ax-mark', def.color);
    const sample = document.createElement('mark');
    sample.className = 'ax-mark ax-legend__sample';
    sample.setAttribute('data-mark-style', def.style);
    sample.style.setProperty('--ax-mark', def.color);
    sample.textContent = def.label;
    const count = document.createElement('span');
    count.className = 'ax-legend__count';
    button.append(sample, count);
    button.addEventListener('click', () => {
      const set = selected();
      if (set.has(def.id)) set.delete(def.id);
      else set.add(def.id);
      current = set.size === defs.length ? 'all' : [...set];
      render();
      onChange(current);
    });
    return { def, button, count };
  });
  const only = document.createElement('button');
  only.type = 'button';
  only.className = 'ax-legend__filter';
  only.addEventListener('click', () => {
    current = current === 'marked' ? 'all' : 'marked';
    render();
    onChange(current);
  });
  element.append(...buttons.map((b) => b.button), only);

  const render = (): void => {
    const set = selected();
    const n = counts();
    for (const { def, button, count } of buttons) {
      button.setAttribute('aria-pressed', String(set.has(def.id)));
      count.textContent = localizeNumber(n.get(def.id) ?? 0, getLanguage().locale);
    }
    only.textContent = current === 'marked' ? t('Show everything') : t('Only marked');
    only.setAttribute('aria-pressed', String(current === 'marked'));
  };
  render();
  return {
    element,
    update: render,
    setFilter(next) {
      current = next;
      render();
    },
  };
}

/** How many marks of each type there are (each mark once, however many parts it has). */
export function countMarks(root: Element): Map<string, number> {
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  for (const el of root.querySelectorAll<HTMLElement>(MARK)) {
    const id = el.getAttribute('data-mark-id') ?? '';
    if (seen.has(id)) continue;
    seen.add(id);
    const type = el.getAttribute('data-mark-type') ?? '';
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return counts;
}

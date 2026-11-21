/**
 * Marks and pages without the editor engine: shared by the editor, axiomtext/viewer, server-side
 * rendering and the Flutter SDK.
 *
 * A mark is a named kind of highlight that the app defines ("Important", "Marked", "Past exam
 * question"). Writers apply marks; readers see them and can tap them. Each marked range carries
 * `{ type, id }` and optional app data and a badge, saved inside the document.
 */
import type { DocumentJSON, MarkData, MarkInfo, NodeJSON, PageInfo } from '@axiomtext/core';

/** How a mark looks. */
export type MarkStyle = 'fill' | 'underline' | 'double' | 'box';
export const MARK_STYLES: readonly MarkStyle[] = ['fill', 'underline', 'double', 'box'];

/** A kind of mark your app offers, e.g. `{ id: 'important', label: 'Important', color: '#16a34a' }`. */
export interface MarkTypeDef {
  /** Stable id stored in documents (letters, digits, `-` and `_`). */
  id: string;
  /** Name shown in the menu and legend. */
  label: string;
  /** `#rrggbb`. */
  color: string;
  /** Default: `fill`. */
  style?: MarkStyle;
}

/**
 * Used when the app turns marks on without its own types. They're only a starting point: give
 * your own `types` with your labels and colours. Keep each `id` stable, since it's what documents
 * store; labels and colours can change at any time.
 */
export const DEFAULT_MARK_TYPES: readonly MarkTypeDef[] = [
  { id: 'important', label: 'Important', color: '#16a34a', style: 'fill' },
  { id: 'marked', label: 'Marked', color: '#2563eb', style: 'underline' },
  { id: 'pyq', label: 'Past exam question', color: '#b45309', style: 'box' },
];

export type { MarkData, MarkInfo, PageInfo } from '@axiomtext/core';

const ID = /^[\w-]{1,64}$/;
const COLOR = /^#[0-9a-f]{6}$/i;
const MAX_DATA = 32_000;
const MAX_BADGE = 8;
const CONTEXT = 32;

export const isMarkStyle = (value: unknown): value is MarkStyle =>
  typeof value === 'string' && (MARK_STYLES as readonly string[]).includes(value);

/** Valid mark types only, with defaults filled in; later duplicates of an id are dropped. */
export function normalizeMarkTypes(types: readonly unknown[] | undefined): Required<MarkTypeDef>[] {
  const out: Required<MarkTypeDef>[] = [];
  for (const raw of types ?? []) {
    if (typeof raw !== 'object' || raw === null) continue;
    const t = raw as Record<string, unknown>;
    const id = t['id'];
    if (typeof id !== 'string' || !ID.test(id) || out.some((x) => x.id === id)) continue;
    const color = typeof t['color'] === 'string' ? t['color'].trim().toLowerCase() : '';
    out.push({
      id,
      label: typeof t['label'] === 'string' && t['label'] ? t['label'].slice(0, 80) : id,
      color: COLOR.test(color)
        ? color
        : /^#[0-9a-f]{3}$/.test(color)
          ? `#${[...color.slice(1)].map((c) => c + c).join('')}`
          : '#eab308',
      style: isMarkStyle(t['style']) ? t['style'] : 'fill',
    });
  }
  return out;
}

/** Plain JSON objects only, at most 32 KB; anything else becomes null. */
export function sanitizeMarkData(value: unknown): MarkData | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  try {
    const json = JSON.stringify(value);
    if (json.length > MAX_DATA) return null;
    const copy = JSON.parse(json) as unknown;
    return typeof copy === 'object' && copy !== null && !Array.isArray(copy)
      ? (copy as MarkData)
      : null;
  } catch {
    return null;
  }
}

/** Reads mark data saved as JSON in HTML (`data-mark`), or null. */
export function parseMarkData(json: string | null): MarkData | null {
  if (!json) return null;
  try {
    return sanitizeMarkData(JSON.parse(json));
  } catch {
    return null;
  }
}

/** A short badge (up to 8 characters), or null. */
export function sanitizeBadge(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).slice(0, MAX_BADGE);
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v ? [...v].slice(0, MAX_BADGE).join('') : null;
}

export const isMarkId = (value: unknown): value is string =>
  typeof value === 'string' && ID.test(value);

let counter = 0;
/** A short unique id for a new mark. */
export function createMarkId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  counter = (counter + 1) % 1296;
  return `m${random}${counter.toString(36)}`;
}

/** Inline CSS for a mark type's colour (`--ax-mark`), so saved HTML shows it on any page. */
export const markColorStyle = (color: string): string => `--ax-mark: ${color};`;

/** A number in the locale's digits ("২৩" in Bangla, "٢٣" in Arabic). */
export function localizeNumber(value: number, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { useGrouping: false }).format(value);
  } catch {
    return String(value);
  }
}

// ── Filters and reader states ────────────────────────────────────

/**
 * Which marks to show while reading; paragraphs without a shown mark fold into "… 3 paragraphs".
 * - `'all'`: everything, no folding. `'marked'`: paragraphs with any mark.
 * - A list of mark type ids: paragraphs with a mark of those types.
 * - `{ types?, states?, excludeStates? }`: marks of those types (any when left out) whose reader
 *   state is in `states` and not in `excludeStates`, e.g. `{ excludeStates: ['learned'] }` for
 *   "not learned yet". A mark without a state has none of the states.
 */
export type MarkFilter = 'all' | 'marked' | readonly string[] | MarkFilterQuery;

export interface MarkFilterQuery {
  types?: readonly string[];
  states?: readonly string[];
  excludeStates?: readonly string[];
}

/**
 * How marks look for a reader state set with `setMarkState(id, state)` (e.g. `learned`). The
 * mark also gets `data-mark-state="learned"` for your own CSS.
 */
export interface MarkStateStyle {
  /** Fade the mark and its text. */
  fade?: boolean;
  /** A badge after the mark, e.g. `'✓'` (shown after the mark's own badge). */
  badge?: string;
}

/** Whether a mark of `type` with reader state `state` passes a filter. */
export function markMatches(filter: MarkFilter, type: string, state: string | null): boolean {
  if (filter === 'all' || filter === 'marked') return true;
  if (isFilterList(filter)) return filter.includes(type);
  if (filter.types && !filter.types.includes(type)) return false;
  if (filter.states && (state === null || !filter.states.includes(state))) return false;
  if (filter.excludeStates && state !== null && filter.excludeStates.includes(state)) return false;
  return true;
}

const isFilterList = (filter: MarkFilter): filter is readonly string[] => Array.isArray(filter);

const stringList = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : undefined;

/** A filter from untrusted JSON (the Flutter bridge, saved settings). */
export function parseMarkFilter(value: unknown): MarkFilter {
  if (value === 'marked') return 'marked';
  if (Array.isArray(value)) return stringList(value) ?? [];
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    const query: MarkFilterQuery = {};
    const types = stringList(v['types']);
    const states = stringList(v['states']);
    const excludeStates = stringList(v['excludeStates']);
    if (types) query.types = types;
    if (states) query.states = states;
    if (excludeStates) query.excludeStates = excludeStates;
    return query;
  }
  return 'all';
}

/** Reader states from untrusted JSON: `{ markId: 'learned' }` (null or '' clears). */
export function parseMarkStates(value: unknown): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return out;
  for (const [id, state] of Object.entries(value)) {
    if (!isMarkId(id)) continue;
    out[id] = typeof state === 'string' && state ? state.slice(0, 64) : null;
  }
  return out;
}

/** State styles from untrusted JSON. */
export function parseMarkStateStyles(value: unknown): Record<string, MarkStateStyle> {
  const out: Record<string, MarkStateStyle> = {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return out;
  for (const [state, raw] of Object.entries(value)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const badge = sanitizeBadge(r['badge']);
    out[state] = { ...(r['fade'] === true ? { fade: true } : {}), ...(badge ? { badge } : {}) };
  }
  return out;
}

/** The badge text for a mark: its own badge, then its state's badge. */
export function combinedBadge(
  badge: string | null,
  state: string | null,
  styles: Readonly<Record<string, MarkStateStyle>> | undefined,
): string | null {
  const extra = state ? (styles?.[state]?.badge ?? null) : null;
  return [badge, extra].filter(Boolean).join(' ') || null;
}

// ── Reading documents ────────────────────────────────────────────

interface Walk {
  text: string;
  pages: PageInfo[];
  marks: Map<string, MarkInfo & { start: number; end: number; lastEnd: number; block: number }>;
}

function walk(json: DocumentJSON | NodeJSON): Walk {
  const root = ('doc' in json ? json.doc : json) as NodeJSON;
  const state: Walk = { text: '', pages: [], marks: new Map() };
  let page: number | null = null;
  // Counts container nodes, so parts of a mark in different paragraphs are joined with a space.
  let block = 0;

  const visit = (node: NodeJSON, topIndex: number): void => {
    if (node.type === 'page') {
      const n = Number(node.attrs?.['number']);
      if (Number.isFinite(n)) {
        page = n;
        state.pages.push({ number: n, index: topIndex });
      }
      return;
    }
    if (node.type === 'text' && typeof node.text === 'string') {
      const start = state.text.length;
      state.text += node.text;
      for (const mark of node.marks ?? []) {
        if (mark.type !== 'marker') continue;
        const attrs = mark.attrs ?? {};
        const id = attrs['id'];
        if (!isMarkId(id)) continue;
        const found = state.marks.get(id);
        if (!found) {
          state.marks.set(id, {
            id,
            type: typeof attrs['type'] === 'string' ? attrs['type'] : '',
            text: node.text,
            data: sanitizeMarkData(attrs['data']),
            badge: sanitizeBadge(attrs['badge']),
            page,
            anchor: { exact: '', prefix: '', suffix: '' },
            start,
            end: state.text.length,
            lastEnd: state.text.length,
            block,
          });
        } else {
          const joined =
            (found.lastEnd === start && found.block === block) ||
            /\s$/.test(found.text) ||
            /^\s/.test(node.text);
          found.text += joined ? node.text : ` ${node.text}`;
          found.end = state.text.length;
          found.lastEnd = state.text.length;
          found.block = block;
        }
      }
      return;
    }
    if (node.content) block++;
    node.content?.forEach((child) => visit(child, topIndex));
  };
  root.content?.forEach((child, i) => visit(child, i));
  return state;
}

/** Every mark in the document, in reading order. Works on the server too. */
export function listMarks(json: DocumentJSON | NodeJSON): MarkInfo[] {
  const { text, marks } = walk(json);
  return [...marks.values()].map(({ start, end, lastEnd: _lastEnd, block: _block, ...mark }) => ({
    ...mark,
    anchor: {
      exact: text.slice(start, end),
      prefix: text.slice(Math.max(0, start - CONTEXT), start),
      suffix: text.slice(end, end + CONTEXT),
    },
  }));
}

/** Every page-number block, in order. */
export const listPages = (json: DocumentJSON | NodeJSON): PageInfo[] => walk(json).pages;

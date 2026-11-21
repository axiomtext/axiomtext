/**
 * Marks and pages without the editor engine: shared by the editor, axiomtext/viewer, server-side
 * rendering and the Flutter SDK.
 *
 * A mark is a named kind of highlight that the app defines ("Important", "Marked", "Past exam
 * question"). Writers apply marks; readers see them and can tap them. Each marked range carries
 * `{ type, id }` and optional app data and a badge, saved inside the document.
 */
import type { DocumentJSON, NodeJSON } from '@axiomtext/core';

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

/** Any JSON object your app keeps on a mark (question ids, a note, …). */
export type MarkData = Record<string, unknown>;

/** A mark in the document. */
export interface MarkInfo {
  /** Unique id of this mark. */
  id: string;
  /** The mark type's id. */
  type: string;
  /** The marked text (parts in different paragraphs joined with a space). */
  text: string;
  /** Your app's data, or null. */
  data: MarkData | null;
  /** Small label shown on the mark (e.g. a number), or null. */
  badge: string | null;
  /** Number of the page block before it, or null when there's none. */
  page: number | null;
  /** The quote with some context, to find it again (W3C TextQuoteSelector). */
  anchor: { exact: string; prefix: string; suffix: string };
}

/** A page-number block. */
export interface PageInfo {
  number: number;
  /** Index among the document's top-level blocks. */
  index: number;
}

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

// ── Reading documents ────────────────────────────────────────────

interface Walk {
  text: string;
  pages: PageInfo[];
  marks: Map<string, MarkInfo & { start: number; end: number; lastEnd: number }>;
}

function walk(json: DocumentJSON | NodeJSON): Walk {
  const root = ('doc' in json ? json.doc : json) as NodeJSON;
  const state: Walk = { text: '', pages: [], marks: new Map() };
  let page: number | null = null;

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
          });
        } else {
          found.text += found.lastEnd === start ? node.text : ` ${node.text}`;
          found.end = state.text.length;
          found.lastEnd = state.text.length;
        }
      }
      return;
    }
    node.content?.forEach((child) => visit(child, topIndex));
  };
  root.content?.forEach((child, i) => visit(child, i));
  return state;
}

/** Every mark in the document, in reading order. Works on the server too. */
export function listMarks(json: DocumentJSON | NodeJSON): MarkInfo[] {
  const { text, marks } = walk(json);
  return [...marks.values()].map(({ start, end, lastEnd: _lastEnd, ...mark }) => ({
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

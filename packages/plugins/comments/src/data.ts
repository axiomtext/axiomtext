import type { DocumentJSON, NodeJSON } from '@axiomtext/core';
/** Comment data shared with axiomtext/viewer (no editor engine needed). */

/** Preset highlight colours (they adapt to light and dark themes). */
export const COMMENT_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple', 'orange'] as const;
export type PresetColor = (typeof COMMENT_COLORS)[number];
/** A preset name or any colour as `#rrggbb`. */
export type CommentColor = PresetColor | `#${string}`;

/** Light and dark-friendly values of the presets, for apps drawing them natively. */
export const PRESET_HEX: Record<PresetColor, string> = {
  yellow: '#facc15',
  green: '#22c55e',
  blue: '#3b82f6',
  pink: '#ec4899',
  purple: '#a855f7',
  orange: '#f97316',
};

/** One message in a thread. */
export interface CommentEntry {
  /** Unique id of the message. */
  id: string;
  /** Display name of the person who wrote it. */
  author: string;
  /** Your app's id for that person (used to decide who may edit). */
  authorId?: string;
  /** The text (plain text; shown as typed). */
  text: string;
  /** When it was written, in milliseconds since 1970. */
  time: number;
  /** When it was last edited, if ever. */
  edited?: number;
}

/** A discussion attached to a range of text. */
export interface CommentThread {
  id: string;
  color: CommentColor;
  /** Colour the background (default), or only underline the text. */
  fill: boolean;
  /** Resolved threads are kept (and can be reopened) but no longer highlighted. */
  resolved: boolean;
  comments: CommentEntry[];
}

/** Who is commenting (passed by the app). */
export interface CommentAuthor {
  name: string;
  id?: string;
}

const MAX_TEXT = 10_000;
const MAX_COMMENTS = 500;

export const isPreset = (value: unknown): value is PresetColor =>
  typeof value === 'string' && (COMMENT_COLORS as readonly string[]).includes(value);

/** A preset name or a `#rrggbb` colour. */
export const isColor = (value: unknown): value is CommentColor =>
  isPreset(value) || (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value));

/** Cleans a colour: presets as is, hex in lower case (`#abc` becomes `#aabbcc`); else yellow. */
export function normalizeColor(value: unknown): CommentColor {
  if (isPreset(value)) return value;
  if (typeof value !== 'string') return 'yellow';
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v as CommentColor;
  if (/^#[0-9a-f]{3}$/.test(v))
    return `#${[...v.slice(1)].map((c) => c + c).join('')}` as CommentColor;
  return 'yellow';
}

/** `#rrggbb` → `rgb(r g b / alpha)`. */
export function hexToRgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${alpha})`;
}

/**
 * CSS custom properties for a colour (used inline for custom colours, so saved HTML shows them
 * on any website): `--ax-hl` fills the background, `--ax-hl-line` is the underline.
 */
export function colorStyle(color: CommentColor): string | null {
  if (isPreset(color)) return null;
  return `--ax-hl: ${hexToRgba(color, 0.35)}; --ax-hl-line: ${color}`;
}

let counter = 0;
/** A short unique id (random, with a counter so ids made in the same millisecond differ). */
export function createId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  counter = (counter + 1) % 1296;
  return `c${random}${counter.toString(36)}`;
}

/** Cleans untrusted thread data (pasted HTML, stored JSON): strings only, sane sizes. */
export function sanitizeComments(value: unknown): CommentEntry[] {
  if (!Array.isArray(value)) return [];
  const out: CommentEntry[] = [];
  for (const raw of value.slice(0, MAX_COMMENTS)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const c = raw as Record<string, unknown>;
    if (typeof c['text'] !== 'string' || typeof c['id'] !== 'string') continue;
    const entry: CommentEntry = {
      id: c['id'].slice(0, 64),
      author: typeof c['author'] === 'string' ? c['author'].slice(0, 200) : '',
      text: c['text'].slice(0, MAX_TEXT),
      time: typeof c['time'] === 'number' && Number.isFinite(c['time']) ? c['time'] : 0,
    };
    if (typeof c['authorId'] === 'string') entry.authorId = c['authorId'].slice(0, 200);
    if (typeof c['edited'] === 'number' && Number.isFinite(c['edited'])) entry.edited = c['edited'];
    out.push(entry);
  }
  return out;
}

/** A thread as listed from saved JSON: everything but document positions. */
export interface CommentThreadSummary extends CommentThread {
  /** The commented text. */
  quote: string;
}

/**
 * Every thread in a saved document, in reading order. Works on stored JSON without an editor
 * (e.g. on your server, to send notifications or show a list).
 */
export function listCommentThreads(document: DocumentJSON): CommentThreadSummary[] {
  const byId = new Map<string, CommentThreadSummary>();
  let lastIds = new Set<string>();
  const walk = (node: NodeJSON): void => {
    const ids = new Set<string>();
    if (typeof node.text === 'string') {
      for (const mark of node.marks ?? []) {
        if (mark.type !== 'comment') continue;
        const attrs = mark.attrs ?? {};
        const id = attrs['id'];
        if (typeof id !== 'string') continue;
        ids.add(id);
        const existing = byId.get(id);
        if (existing) {
          existing.quote += lastIds.has(id) ? node.text : ` ${node.text}`;
        } else {
          byId.set(id, {
            id,
            color: normalizeColor(attrs['color']),
            fill: attrs['fill'] !== false,
            resolved: attrs['resolved'] === true,
            comments: sanitizeComments(attrs['comments']),
            quote: node.text,
          });
        }
      }
      lastIds = ids;
      return;
    }
    lastIds = new Set();
    for (const child of node.content ?? []) walk(child);
    lastIds = new Set();
  };
  walk(document.doc);
  return [...byId.values()];
}

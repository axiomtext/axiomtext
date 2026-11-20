import { definePlugin, sanitizeUrl } from '@axiomtext/core';
import type { EditorCommand } from '@axiomtext/core';
import { InputRule, inputRules } from 'prosemirror-inputrules';
import type { MarkType, Node as PMNode } from 'prosemirror-model';
import { Plugin, TextSelection } from 'prosemirror-state';
import type { EditorState } from 'prosemirror-state';

/** Matches a URL or e-mail address typed as plain text. */
const URL_PATTERN = /^(?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?)\]]$/i;
const EMAIL_PATTERN = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i;

/** Normalizes user input: `www.x.com` → `https://www.x.com`, `a@b.co` → `mailto:a@b.co`. */
export function normalizeHref(input: string): string | null {
  const value = input.trim();
  if (value === '') return null;
  if (EMAIL_PATTERN.test(value) && !value.includes(':')) return `mailto:${value}`;
  if (/^www\./i.test(value)) return sanitizeUrl(`https://${value}`);
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(value) && !value.startsWith('/')) {
    return sanitizeUrl(`https://${value}`);
  }
  return sanitizeUrl(value);
}

const linkType = (state: EditorState): MarkType | undefined => state.schema.marks['link'];

/** Range of the link mark around a position (for editing a link with an empty selection). */
function linkRange(doc: PMNode, pos: number, type: MarkType): { from: number; to: number } | null {
  const $pos = doc.resolve(pos);
  const { parent, parentOffset } = $pos;
  const start = parent.childAfter(parentOffset);
  const child = start.node ?? parent.childBefore(parentOffset).node;
  const mark = child && type.isInSet(child.marks);
  if (!mark) return null;
  let index = start.node ? start.index : $pos.index() - 1;
  let from = $pos.start() + (start.node ? start.offset : parent.childBefore(parentOffset).offset);
  while (index > 0 && mark.isInSet(parent.child(index - 1).marks)) {
    index--;
    from -= parent.child(index).nodeSize;
  }
  let to = from;
  for (let i = index; i < parent.childCount && mark.isInSet(parent.child(i).marks); i++) {
    to += parent.child(i).nodeSize;
  }
  return { from, to };
}

/**
 * Adds or updates a link. With an empty selection inside a link the whole link is updated;
 * with an empty selection outside a link the URL is inserted as linked text.
 * Returns false for unsafe URLs (e.g. `javascript:`).
 */
export const setLink =
  (href: string): EditorCommand =>
  (state, dispatch) => {
    const type = linkType(state);
    const safe = normalizeHref(href);
    if (!type || !safe) return false;
    const { from, to, empty } = state.selection;
    if (!dispatch) return true;
    const tr = state.tr;
    if (empty) {
      const range = linkRange(state.doc, from, type);
      if (range) {
        tr.removeMark(range.from, range.to, type).addMark(
          range.from,
          range.to,
          type.create({ href: safe }),
        );
      } else {
        const text = href.trim();
        tr.insert(from, state.schema.text(text, [type.create({ href: safe })]));
        tr.setSelection(TextSelection.create(tr.doc, from + text.length));
      }
    } else {
      tr.removeMark(from, to, type).addMark(from, to, type.create({ href: safe }));
    }
    tr.removeStoredMark(type);
    dispatch(tr.scrollIntoView());
    return true;
  };

/** Removes the link at the selection (the whole link when the cursor is inside one). */
export const unsetLink = (): EditorCommand => (state, dispatch) => {
  const type = linkType(state);
  if (!type) return false;
  const { from, to, empty } = state.selection;
  const range = empty ? linkRange(state.doc, from, type) : { from, to };
  if (!range || !state.doc.rangeHasMark(range.from, range.to, type)) return false;
  dispatch?.(state.tr.removeMark(range.from, range.to, type).scrollIntoView());
  return true;
};

/** LNK-001, LNK-002, SEC-001: links with safe URLs, auto-linking while typing and pasting. */
export const Link = definePlugin({
  name: 'link',
  marks: {
    link: {
      attrs: { href: { validate: 'string' } },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs: (dom) => {
            const href = sanitizeUrl((dom as HTMLElement).getAttribute('href') ?? '');
            // Unsafe links are dropped (their text is kept).
            return href ? { href } : false;
          },
        },
      ],
      toDOM: (mark) => [
        'a',
        {
          href: sanitizeUrl(mark.attrs['href'] as string) ?? '#',
          rel: 'noopener noreferrer nofollow',
        },
        0,
      ],
    },
  },
  commands: { setLink, unsetLink },
  enginePlugins: (schema) => {
    const type = schema.marks['link'];
    if (!type) return [];
    // Auto-link a URL when the user types a space or punctuation after it.
    const autolink = new InputRule(
      /(?:^|\s)((?:https?:\/\/|www\.)[^\s]+|[^\s@]+@[^\s@]+\.[a-z]{2,})([\s,;])$/i,
      (state, match, start, end) => {
        const url = match[1];
        const trailing = match[2] ?? ' ';
        if (!url || (!URL_PATTERN.test(url) && !EMAIL_PATTERN.test(url))) return null;
        const href = normalizeHref(url);
        if (!href) return null;
        const urlStart = start + match[0].indexOf(url);
        const urlEnd = urlStart + url.length;
        if (state.doc.rangeHasMark(urlStart, urlEnd, type)) return null;
        return state.tr
          .addMark(urlStart, urlEnd, type.create({ href }))
          .insertText(trailing, end)
          .removeStoredMark(type);
      },
    );
    return [
      inputRules({ rules: [autolink] }),
      new Plugin({
        props: {
          // Pasting a single URL over selected text turns the text into a link.
          handlePaste(view, event) {
            const text = event.clipboardData?.getData('text/plain')?.trim() ?? '';
            if (!text || !(URL_PATTERN.test(text) || EMAIL_PATTERN.test(text))) return false;
            const href = normalizeHref(text);
            if (!href) return false;
            const { state } = view;
            if (state.selection.empty) {
              const { from } = state.selection;
              const tr = state.tr.insert(from, state.schema.text(text, [type.create({ href })]));
              view.dispatch(tr.removeStoredMark(type).scrollIntoView());
              return true;
            }
            const { from, to } = state.selection;
            view.dispatch(state.tr.addMark(from, to, type.create({ href })).scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },
  messages: { en: { 'link.link': 'Link', 'link.remove': 'Remove link', 'link.apply': 'Apply' } },
});

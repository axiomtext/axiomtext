/**
 * Pasted Bijoy Bangla (SutonnyMJ and other legacy "MJ" fonts) becomes Unicode automatically.
 *
 * Detection: text in a Bijoy font (Word and web pages say so in the HTML), or plain text that
 * clearly looks like Bijoy. English is never converted. After converting, a small notice offers
 * "Keep original" to paste the text exactly as it was.
 */
import { definePlugin, trustedHTML } from '@axiomtext/core';
import type { EditorCommand } from '@axiomtext/core';
import {
  convertBijoy,
  hasBanglaUnicode,
  isBijoyFont,
  looksLikeBijoy,
} from '@axiomtext/convert/bijoy';
import { t } from '@axiomtext/i18n';
import { undo } from 'prosemirror-history';
import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

export { convertBijoy, isBijoyFont, looksLikeBijoy } from '@axiomtext/convert/bijoy';

/** Words that mark a text node as English, so it's left alone in mixed pastes. */
const ENGLISH = /\b(the|and|of|is|to|in|for|with|that|this|are|was|you|from)\b/i;

const fontOf = (el: Element | null): string => {
  for (let node = el; node; node = node.parentElement) {
    const family = (node as HTMLElement).style?.fontFamily || node.getAttribute('face') || '';
    if (family) return family;
  }
  return '';
};

/**
 * Converts the Bijoy parts of pasted HTML. Returns the new HTML, or null when there was
 * nothing to convert.
 */
export function convertBijoyHTML(html: string): string | null {
  // Through the editor's Trusted Types policy (pages that enforce Trusted Types require it).
  const doc = new DOMParser().parseFromString(trustedHTML(html), 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  const anyFont = nodes.some((n) => fontOf(n.parentElement) !== '');
  const plainBijoy = !anyFont && looksLikeBijoy(doc.body.textContent ?? '');
  let changed = false;
  for (const node of nodes) {
    const text = node.data;
    if (!text.trim() || hasBanglaUnicode(text)) continue;
    const font = fontOf(node.parentElement);
    const bijoyFont = font !== '' && isBijoyFont(font);
    if (
      bijoyFont ||
      (plainBijoy && !ENGLISH.test(text)) ||
      (!bijoyFont && looksLikeBijoy(text) && !font)
    ) {
      node.data = convertBijoy(text);
      changed = true;
    }
  }
  if (!changed) return null;
  // Drop the Bijoy font so the Unicode text shows in a Bangla font.
  doc.body.querySelectorAll<HTMLElement>('[style*="font-family"], font[face]').forEach((el) => {
    if (isBijoyFont(el.style.fontFamily || el.getAttribute('face') || '')) {
      el.style.removeProperty('font-family');
      el.removeAttribute('face');
    }
  });
  return doc.body.innerHTML;
}

type Pending = { kind: 'html' | 'text'; original: string };
const key = new PluginKey('axBijoyPaste');
/** The original of the last converted paste, per editor, until its notice is shown. */
const pastes = new WeakMap<EditorView, Pending>();
/** Editors pasting an original as it was ("Keep original"). */
const skipping = new WeakSet<EditorView>();

/** Converts the selected Bijoy text to Unicode (for text that was pasted as it was). */
export const convertSelectionFromBijoy = (): EditorCommand => (state, dispatch) => {
  const { from, to, empty } = state.selection;
  if (empty) return false;
  const text = state.doc.textBetween(from, to, '\n');
  if (hasBanglaUnicode(text)) return false;
  if (!dispatch) return true;
  const tr = state.tr;
  // Convert each text run separately so formatting is kept.
  const runs: { from: number; to: number; text: string }[] = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return true;
    const start = Math.max(from, pos);
    const end = Math.min(to, pos + node.nodeSize);
    runs.push({ from: start, to: end, text: (node.text ?? '').slice(start - pos, end - pos) });
    return false;
  });
  for (const run of runs.reverse()) {
    const marks = state.doc.resolve(run.from).marks();
    tr.replaceWith(run.from, run.to, state.schema.text(convertBijoy(run.text), marks));
  }
  dispatch(tr);
  return true;
};

function noticeView(view: EditorView): { update(): void; destroy(): void } {
  let notice: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const close = (): void => {
    clearTimeout(timer);
    if (!notice) return;
    const el = notice;
    notice = null;
    el.classList.remove('is-open');
    setTimeout(() => el.remove(), 200);
  };
  const show = (pending: Pending): void => {
    close();
    const el = document.createElement('div');
    el.className = 'ax-notice';
    el.setAttribute('role', 'status');
    const text = document.createElement('span');
    text.textContent = t('Bijoy text converted to Unicode');
    const keep = document.createElement('button');
    keep.type = 'button';
    keep.className = 'ax-notice__action';
    keep.textContent = t('Keep original');
    keep.addEventListener('mousedown', (e) => e.preventDefault());
    keep.addEventListener('click', () => {
      close();
      undo(view.state, view.dispatch);
      skipping.add(view);
      try {
        if (pending.kind === 'html') view.pasteHTML(pending.original);
        else view.pasteText(pending.original);
      } finally {
        skipping.delete(view);
      }
      view.focus();
    });
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'ax-notice__close';
    dismiss.setAttribute('aria-label', t('Close'));
    dismiss.textContent = '×';
    dismiss.addEventListener('click', close);
    el.append(text, keep, dismiss);
    (view.dom.parentElement ?? document.body).append(el);
    requestAnimationFrame(() => el.classList.add('is-open'));
    notice = el;
    timer = setTimeout(close, 9000);
  };
  return {
    update() {
      const pending = pastes.get(view);
      if (pending) {
        pastes.delete(view);
        show(pending);
      }
    },
    destroy: close,
  };
}

/** Pasted Bijoy text becomes Unicode, with a "Keep original" notice. */
export const BijoyPaste = definePlugin({
  name: 'bijoy-paste',
  commands: { convertSelectionFromBijoy },
  enginePlugins: () => [
    new Plugin({
      key,
      props: {
        transformPastedHTML(html, view) {
          if (skipping.has(view)) return html;
          const converted = convertBijoyHTML(html);
          if (converted === null) return html;
          pastes.set(view, { kind: 'html', original: html });
          return converted;
        },
        transformPastedText(text, _plain, view) {
          if (skipping.has(view) || !looksLikeBijoy(text)) return text;
          pastes.set(view, { kind: 'text', original: text });
          return convertBijoy(text);
        },
      },
      view: noticeView,
    }),
  ],
});

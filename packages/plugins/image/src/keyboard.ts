import type { Node as PMNode } from 'prosemirror-model';
import { NodeSelection, Plugin, Selection, TextSelection } from 'prosemirror-state';
import type { Command, EditorState, Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

export type MoveDirection = 'left' | 'right' | 'up' | 'down';

const selectedImage = (state: EditorState): { pos: number; node: PMNode } | null => {
  const sel = state.selection;
  return sel instanceof NodeSelection && sel.node.type.name === 'image'
    ? { pos: sel.from, node: sel.node }
    : null;
};

/** The paragraph-start (down) or paragraph-end (up) of the neighbouring textblock. */
const neighbourBlockPos = (state: EditorState, pos: number, dir: 1 | -1): number | null => {
  const $pos = state.doc.resolve(pos);
  if ($pos.depth < 1) return null;
  const edge = dir > 0 ? $pos.after() : $pos.before();
  const found = Selection.findFrom(state.doc.resolve(edge), dir, true);
  return found ? found.from : null;
};

/** Where the image at `pos` should go, in the coordinates of the current document. */
function targetPos(
  state: EditorState,
  pos: number,
  direction: MoveDirection,
  view?: EditorView,
): number | null {
  const $pos = state.doc.resolve(pos);
  const node = state.doc.nodeAt(pos);
  if (!node) return null;
  if (direction === 'right') {
    // Step over the next character; at the end of a paragraph, go to the next one.
    return pos + node.nodeSize < $pos.end()
      ? pos + node.nodeSize + 1
      : neighbourBlockPos(state, pos, 1);
  }
  if (direction === 'left') {
    return pos > $pos.start() ? pos - 1 : neighbourBlockPos(state, pos, -1);
  }
  const dir = direction === 'down' ? 1 : -1;
  // In line with text: move one visual line, keeping the horizontal position.
  if (view && node.attrs['wrap'] === 'inline') {
    const dom = view.nodeDOM(pos);
    if (dom instanceof HTMLElement) {
      const rect = dom.getBoundingClientRect();
      const lineHeight =
        parseFloat(getComputedStyle(dom.parentElement ?? dom).lineHeight) || rect.height / 2;
      const top = dir > 0 ? rect.bottom + lineHeight * 0.6 : rect.top - lineHeight * 0.6;
      const hit = view.posAtCoords({ left: rect.left + 2, top });
      if (hit && (hit.pos < pos || hit.pos > pos + node.nodeSize)) {
        const $hit = state.doc.resolve(hit.pos);
        if ($hit.parent.inlineContent) return hit.pos;
      }
    }
  }
  // Wrapped or centered images (or no line found): move to the neighbouring paragraph.
  return neighbourBlockPos(state, pos, dir);
}

/** Builds the transaction that moves the selected image one step, or null at the edges. */
export function moveImageTransaction(
  state: EditorState,
  direction: MoveDirection,
  view?: EditorView,
): Transaction | null {
  const found = selectedImage(state);
  if (!found) return null;
  const target = targetPos(state, found.pos, direction, view);
  if (target === null) return null;
  const tr = state.tr.delete(found.pos, found.pos + found.node.nodeSize);
  const insertAt = tr.mapping.map(target);
  const $at = tr.doc.resolve(insertAt);
  if (!$at.parent.canReplaceWith($at.index(), $at.index(), found.node.type)) return null;
  tr.insert(insertAt, found.node);
  tr.setSelection(NodeSelection.create(tr.doc, insertAt));
  return tr.scrollIntoView();
}

/** Escape: put the caret right after the selected image. */
export const caretAfterImage: Command = (state, dispatch) => {
  const found = selectedImage(state);
  if (!found) return false;
  const at = found.pos + found.node.nodeSize;
  dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, at)));
  return true;
};

/** Enter: keep the image and start a new line after it (instead of replacing it). */
export const newLineAfterImage: Command = (state, dispatch) => {
  const found = selectedImage(state);
  if (!found) return false;
  if (dispatch) {
    const at = found.pos + found.node.nodeSize;
    const tr = state.tr.setSelection(TextSelection.create(state.doc, at));
    if (!tr.selection.$from.parent.type.spec.code) tr.split(at);
    dispatch(tr.scrollIntoView());
  }
  return true;
};

const ARROWS: Record<string, MoveDirection> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

export interface ImageKeyboardOptions {
  /**
   * When an image was selected by clicking it, plain arrow keys move it through the text
   * (default true). Alt+Shift+arrows always move a selected image.
   */
  arrowKeysMove?: boolean;
}

/**
 * Keyboard behaviour for a selected image:
 * - arrow keys move it (after a click), Alt+Shift+arrows always do;
 * - typing continues after the image instead of replacing it;
 * - Enter starts a new line after the image instead of deleting it;
 * - Escape puts the caret right after the image.
 */
export function imageKeyboardPlugin(options: ImageKeyboardOptions = {}): Plugin {
  const arrowKeysMove = options.arrowKeysMove ?? true;
  // Position of an image the user clicked. Arrow keys only move images picked this way, so
  // walking through text with the keyboard never drags an image along by accident.
  let clicked: number | null = null;
  // Set on mousedown on an image; the selection it produces (on mousedown or mouseup,
  // depending on whether the image is draggable) then counts as "clicked".
  let pointerOnImage = false;

  return new Plugin({
    view: () => ({
      update: (view) => {
        const found = selectedImage(view.state);
        if (found && pointerOnImage) clicked = found.pos;
        else if (!found || found.pos !== clicked) clicked = null;
      },
    }),
    props: {
      handleDOMEvents: {
        mousedown: (view, event) => {
          pointerOnImage = !!(event.target as HTMLElement | null)?.closest?.('.ax-image');
          if (pointerOnImage) {
            window.addEventListener(
              'mouseup',
              () => {
                // Let ProseMirror finish selecting first.
                setTimeout(() => {
                  pointerOnImage = false;
                  const found = selectedImage(view.state);
                  if (found) clicked = found.pos;
                });
              },
              { once: true },
            );
          }
          return false;
        },
      },
      handleKeyDown: (view, event) => {
        const found = selectedImage(view.state);
        if (!found || event.isComposing) return false;
        const direction = ARROWS[event.key];
        if (direction) {
          const chord = event.altKey && event.shiftKey && !event.metaKey && !event.ctrlKey;
          const plain = !event.altKey && !event.shiftKey && !event.metaKey && !event.ctrlKey;
          if (!(chord || (plain && arrowKeysMove && clicked === found.pos))) return false;
          event.preventDefault();
          const tr = moveImageTransaction(view.state, direction, view);
          if (tr) {
            clicked = tr.selection.from;
            view.dispatch(tr);
          }
          return true; // at the document edge: stay put rather than jump the caret
        }
        return false;
      },
      // Typing while an image is selected continues after it rather than replacing it.
      handleTextInput: (view, from, to, text) => {
        const found = selectedImage(view.state);
        if (!found || from !== found.pos || to !== found.pos + found.node.nodeSize) return false;
        const at = found.pos + found.node.nodeSize;
        const tr = view.state.tr.insertText(text, at);
        tr.setSelection(TextSelection.create(tr.doc, at + text.length));
        view.dispatch(tr.scrollIntoView());
        return true;
      },
    },
  });
}

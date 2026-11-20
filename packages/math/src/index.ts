import { definePlugin } from '@axiomtext/core';
import type { EditorCommand, NodeDefinition } from '@axiomtext/core';
import { InputRule, inputRules } from 'prosemirror-inputrules';
import type { DOMOutputSpec, Node as PMNode } from 'prosemirror-model';
import { NodeSelection, Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import type { EditorView, NodeView } from 'prosemirror-view';
import { openMathEditor } from './editor-popover';
import type { MathEditorHandle } from './editor-popover';
import { createMathBar } from './math-bar';
import type { MathBar } from './math-bar';
import { loadMathLive } from './mathlive';
import type { MathfieldElement } from './mathlive';
import { isKatexLoaded, loadKatex, renderLatex } from './render';

export { loadKatex, renderLatex, validateLatex, SAFE_KATEX_OPTIONS } from './render';
export type { RenderResult } from './render';
export { MATH_TEMPLATES, openMathEditor } from './editor-popover';
export { GREEK_TEMPLATES, STRUCTURE_TEMPLATES, SYMBOL_TEMPLATES } from './math-bar';
export type { MathTemplate } from './math-bar';
export { loadMathLive } from './mathlive';

const latexAttr = { latex: { default: '', validate: 'string' } } as const;

/**
 * HTML for saved documents (MATH-035): when KaTeX is loaded the equation is pre-rendered, so a
 * website only needs `katex.min.css` to show it — no JavaScript. The LaTeX source is kept in
 * `data-latex` so pasting the HTML back into AxiomText restores the editable equation.
 */
function mathToDOM(node: PMNode, display: boolean): DOMOutputSpec {
  const latex = node.attrs['latex'] as string;
  const attrs = {
    'data-type': display ? 'math-block' : 'math-inline',
    'data-latex': latex,
    class: display ? 'ax-math ax-math--block' : 'ax-math',
  };
  const rendered =
    isKatexLoaded() && typeof document !== 'undefined' ? renderLatex(latex, display).html : null;
  if (rendered) {
    const el = document.createElement(display ? 'div' : 'span');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.innerHTML = rendered; // KaTeX output, trust:false
    return el;
  }
  return [display ? 'div' : 'span', attrs, display ? `\\[${latex}\\]` : `\\(${latex}\\)`];
}

const nodes: Record<string, NodeDefinition> = {
  math_inline: {
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    attrs: latexAttr,
    // Copying an equation puts `$latex$` on the plain-text clipboard (MATH-029).
    leafText: (node) => `$${node.attrs['latex'] as string}$`,
    parseDOM: [
      {
        tag: 'span[data-type="math-inline"]',
        getAttrs: (dom) => ({ latex: (dom as HTMLElement).getAttribute('data-latex') ?? '' }),
      },
    ],
    toDOM: (node) => mathToDOM(node, false),
  },
  math_block: {
    group: 'block',
    atom: true,
    selectable: true,
    attrs: latexAttr,
    leafText: (node) => `$$${node.attrs['latex'] as string}$$`,
    parseDOM: [
      {
        tag: 'div[data-type="math-block"]',
        getAttrs: (dom) => ({ latex: (dom as HTMLElement).getAttribute('data-latex') ?? '' }),
      },
    ],
    toDOM: (node) => mathToDOM(node, true),
  },
};

const mathEditKey = new PluginKey<boolean>('axMathEdit');

/** Pending "start editing" requests (click, Enter, toolbar insert) keyed by editor view. */
/** Where the user clicked, as a fraction of the rendered formula's box (survives re-layout). */
interface ClickPoint {
  fx: number;
  fy: number;
}
const editRequests = new WeakMap<EditorView, ClickPoint | true>();

/** Tight box around the rendered formula (display math is centred in a full-width line). */
function formulaBox(dom: HTMLElement): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const parts = dom.querySelectorAll('.katex-html > .katex-base, .katex-html > .base');
  if (parts.length === 0) return dom.getBoundingClientRect();
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  parts.forEach((part) => {
    const r = part.getBoundingClientRect();
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  });
  return { left, top, width: right - left, height: bottom - top };
}
const viewsByDom = new WeakMap<HTMLElement, MathView>();
/** Views where a math editing session is opening: keystrokes must not replace the selected equation. */
const opening = new WeakSet<EditorView>();

/** Elements that belong to an editing session even though they live outside the equation. */
const isMathUi = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  target.closest(
    '.ax-math-bar, .ML__keyboard, .ML__popover, .ML__menu, .ui-menu-container, math-field',
  ) !== null;

/**
 * Shows the equation with KaTeX; when the user clicks it (or presses Enter on it), it turns into a
 * visual MathLive editor in place, with the caret where the user clicked (MATH-003, MATH-038).
 */
class MathView implements NodeView {
  dom: HTMLElement;
  private session: EditSession | null = null;

  constructor(
    public node: PMNode,
    public view: EditorView,
    public getPos: () => number | undefined,
  ) {
    const block = node.type.name === 'math_block';
    this.dom = document.createElement(block ? 'div' : 'span');
    this.dom.className = block ? 'ax-math ax-math--block' : 'ax-math';
    this.dom.dataset['type'] = block ? 'math-block' : 'math-inline';
    this.dom.contentEditable = 'false';
    this.dom.addEventListener('mousedown', (event) => {
      if (this.session || !this.view.editable) return;
      const box = formulaBox(this.dom);
      editRequests.set(this.view, {
        fx: box.width ? (event.clientX - box.left) / box.width : 1,
        fy: box.height ? (event.clientY - box.top) / box.height : 0.5,
      });
    });
    viewsByDom.set(this.dom, this);
    this.render();
    if (!isKatexLoaded()) void loadKatex().then(() => this.render());
  }

  get display(): boolean {
    return this.node.type.name === 'math_block';
  }

  render(): void {
    if (this.session) return;
    const latex = this.node.attrs['latex'] as string;
    this.dom.dataset['latex'] = latex;
    this.dom.classList.remove('is-empty', 'has-error', 'is-loading', 'is-editing');
    this.dom.removeAttribute('title');
    if (latex.trim() === '') {
      this.dom.classList.add('is-empty');
      this.dom.textContent = this.display ? 'Click to add an equation' : '𝑓(𝑥)';
      this.dom.setAttribute('aria-label', 'Empty equation');
      return;
    }
    this.dom.removeAttribute('aria-label');
    if (!isKatexLoaded()) {
      this.dom.classList.add('is-loading');
      this.dom.textContent = latex;
      return;
    }
    const result = renderLatex(latex, this.display);
    if (result.html) {
      this.dom.innerHTML = result.html; // KaTeX output, trust:false
    } else {
      this.dom.classList.add('has-error');
      this.dom.textContent = latex;
      this.dom.title = result.error ?? 'Invalid LaTeX';
    }
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false;
    const changed = node.attrs['latex'] !== this.node.attrs['latex'];
    this.node = node;
    if (changed && !this.session) this.render();
    return true;
  }

  selectNode(): void {
    this.dom.classList.add('is-selected');
    const request = editRequests.get(this.view);
    if (request && this.view.editable) {
      editRequests.delete(this.view);
      void this.startEditing(request === true ? null : request);
    }
  }

  deselectNode(): void {
    this.dom.classList.remove('is-selected');
  }

  async startEditing(point: ClickPoint | null): Promise<void> {
    if (this.session) return;
    const session = new EditSession(this, point);
    this.session = session;
    opening.add(this.view);
    try {
      await session.start();
    } finally {
      opening.delete(this.view);
    }
  }

  /** Called by the session when editing ends. */
  finish(latex: string | null, move: 'after' | 'before' = 'after'): void {
    this.session = null;
    const pos = this.getPos();
    const original = this.node.attrs['latex'] as string;
    this.render();
    if (pos === undefined) return;
    const { state } = this.view;
    let tr = state.tr;
    const value = latex === null ? original : latex.trim();
    if (value === '') {
      tr = tr.delete(pos, pos + this.node.nodeSize);
    } else {
      if (value !== original) tr = tr.setNodeMarkup(pos, undefined, { latex: value });
      const target = move === 'after' ? pos + this.node.nodeSize : pos;
      tr = tr.setSelection(TextSelection.near(tr.doc.resolve(target), move === 'after' ? 1 : -1));
    }
    this.view.dispatch(tr.scrollIntoView());
    this.view.focus();
    // Re-render now that attrs are final (update() skipped it while editing).
    this.render();
  }

  stopEvent(event: Event): boolean {
    // While editing, the visual editor owns keyboard and mouse events.
    return this.session !== null && this.dom.contains(event.target as Node);
  }

  ignoreMutation(): boolean {
    return true;
  }

  destroy(): void {
    this.session?.cancel();
    this.session = null;
  }
}

/** One editing session: MathLive in place + the math bar; falls back to the LaTeX popover. */
class EditSession {
  private field: MathfieldElement | null = null;
  private bar: MathBar | null = null;
  private latexInput: HTMLTextAreaElement | null = null;
  private fallback: MathEditorHandle | null = null;
  private closed = false;
  private readonly original: string;
  private cleanup: (() => void)[] = [];

  constructor(
    private owner: MathView,
    private point: ClickPoint | null,
  ) {
    this.original = owner.node.attrs['latex'] as string;
  }

  async start(): Promise<void> {
    const { dom } = this.owner;
    dom.classList.add('is-editing', 'is-loading-editor');
    const mathlive = await loadMathLive();
    if (this.closed) return;
    dom.classList.remove('is-loading-editor');
    if (!mathlive) {
      this.startFallback();
      return;
    }
    await loadKatex(); // template labels are rendered with KaTeX

    const field = new mathlive.MathfieldElement();
    field.value = this.original;
    field.smartFence = true;
    field.mathVirtualKeyboardPolicy = 'auto';
    field.setAttribute('aria-label', 'Equation editor');
    field.classList.add('ax-math-field');
    if (this.owner.display) field.classList.add('is-block');
    this.field = field;
    dom.replaceChildren(field);

    this.bar = createMathBar({
      insert: (template) => {
        field.executeCommand([
          'insert',
          template.insert,
          { selectionMode: 'placeholder', focus: true },
        ]);
        this.syncLatex();
      },
      toggleKeyboard: () => {
        const kb = window.mathVirtualKeyboard;
        if (kb.visible) kb.hide();
        else kb.show();
        field.focus();
      },
      toggleLatex: () => this.toggleLatex(),
      done: () => this.commit(),
    });

    field.addEventListener('input', () => {
      this.syncLatex();
      this.bar?.position(dom);
    });
    // Enter commits; arrows / Tab at the edges leave the equation (MATH-038).
    field.addEventListener('change', () => this.commit());
    field.addEventListener('move-out', (event) => {
      event.preventDefault();
      const direction = (event as CustomEvent<{ direction: string }>).detail.direction;
      this.commit(direction === 'backward' || direction === 'upward' ? 'before' : 'after');
    });
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.cancel(true);
      }
    });

    const onPointerDown = (event: PointerEvent): void => {
      const path = event.composedPath();
      if (path.includes(dom) || path.some((node) => isMathUi(node))) return;
      this.commit();
    };
    const onScroll = (): void => this.bar?.position(dom);
    const kb = window.mathVirtualKeyboard;
    const originalPadding = document.body.style.paddingBottom;
    const onKeyboardToggle = (): void => {
      this.bar?.setKeyboardOpen(kb.visible);
      // Keep the equation visible above the on-screen math keyboard.
      document.body.style.paddingBottom = kb.visible
        ? `${Math.ceil(kb.boundingRect.height) + 24}px`
        : originalPadding;
      if (kb.visible) {
        const rect = dom.getBoundingClientRect();
        const visibleBottom = window.innerHeight - kb.boundingRect.height;
        const barHeight = this.bar?.element.offsetHeight ?? 0;
        if (rect.bottom + barHeight + 24 > visibleBottom) {
          window.scrollBy({
            top: rect.bottom + barHeight + 24 - visibleBottom,
            behavior: 'smooth',
          });
        }
      }
      this.bar?.position(dom);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    kb.addEventListener('virtual-keyboard-toggle', onKeyboardToggle);
    kb.addEventListener('geometrychange', onKeyboardToggle);
    this.cleanup.push(() => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      kb.removeEventListener('virtual-keyboard-toggle', onKeyboardToggle);
      kb.removeEventListener('geometrychange', onKeyboardToggle);
      document.body.style.paddingBottom = originalPadding;
    });

    // Wait two frames so MathLive has laid out the formula before mapping the click point.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    if (this.closed) return;
    field.focus();
    if (this.point) {
      try {
        // Put the caret exactly where the user clicked on the equation.
        // Map onto MathLive's own formula box (its container adds padding).
        const rect = (
          field.shadowRoot?.querySelector('.ML__latex') ?? field
        ).getBoundingClientRect();
        const x = rect.left + Math.min(Math.max(this.point.fx, 0), 1) * rect.width;
        const y = rect.top + Math.min(Math.max(this.point.fy, 0), 1) * rect.height;
        field.position = field.getOffsetFromPoint(x, y, { bias: 0 });
      } catch {
        field.executeCommand('moveToMathfieldEnd');
      }
    } else {
      field.executeCommand('moveToMathfieldEnd');
    }
    this.bar?.position(dom);
  }

  private syncLatex(): void {
    if (this.field && this.latexInput && document.activeElement !== this.latexInput) {
      this.latexInput.value = this.currentLatex();
    }
  }

  private toggleLatex(): void {
    if (!this.bar || !this.field) return;
    if (this.latexInput) {
      this.latexInput.remove();
      this.latexInput = null;
      this.bar.setLatexOpen(false);
      this.field.focus();
      this.bar.position(this.owner.dom);
      return;
    }
    const input = document.createElement('textarea');
    input.className = 'ax-math-bar__latex';
    input.spellcheck = false;
    input.rows = 2;
    input.setAttribute('aria-label', 'LaTeX');
    input.value = this.currentLatex();
    input.addEventListener('input', () => {
      if (!this.field) return;
      this.field.value = input.value;
      this.bar?.setError(renderLatex(input.value, this.owner.display).error);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cancel(true);
      } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey || !this.owner.display)) {
        event.preventDefault();
        this.commit();
      }
    });
    this.latexInput = input;
    this.bar.element.querySelector('.ax-math-bar__header')?.after(input);
    this.bar.setLatexOpen(true);
    this.bar.position(this.owner.dom);
    input.focus();
  }

  private startFallback(): void {
    this.fallback = openMathEditor({
      latex: this.original,
      displayMode: this.owner.display,
      anchor: this.owner.dom,
      onCommit: (latex) => this.close(latex),
      onCancel: () => this.close(null),
    });
  }

  /** LaTeX of the field with unfilled placeholders removed (`\\frac{3}{}` instead of `\\placeholder`). */
  private currentLatex(): string {
    if (!this.field) return this.original;
    return this.field.getValue('latex-without-placeholders');
  }

  commit(move: 'after' | 'before' = 'after'): void {
    if (this.closed) return;
    const value = this.currentLatex();
    if (renderLatex(value, this.owner.display).error) {
      this.bar?.setError('This equation has an error. Fix it or press Esc to cancel.');
      return;
    }
    this.close(value, move);
  }

  cancel(refocus = false): void {
    if (this.closed) return;
    if (refocus) this.close(null);
    else this.teardown();
  }

  private close(latex: string | null, move: 'after' | 'before' = 'after'): void {
    if (this.closed) return;
    this.teardown();
    this.owner.finish(latex, move);
  }

  private teardown(): void {
    this.closed = true;
    this.cleanup.forEach((fn) => fn());
    this.cleanup = [];
    if (window.mathVirtualKeyboard?.visible) window.mathVirtualKeyboard.hide();
    this.bar?.destroy();
    this.bar = null;
    this.fallback?.close();
    this.fallback = null;
    this.field?.remove();
    this.field = null;
    this.owner.dom.classList.remove('is-editing', 'is-loading-editor');
  }
}

/** Opens the editor for the math node at the selection (keyboard: Enter on a selected equation). */
const editSelectedMath = (): EditorCommand => (state, _dispatch, view) => {
  const { selection } = state;
  if (!(selection instanceof NodeSelection) || !selection.node.type.name.startsWith('math_'))
    return false;
  if (!view) return true;
  const dom = view.nodeDOM(selection.from);
  const mathView = dom instanceof HTMLElement ? viewsByDom.get(dom) : undefined;
  if (!mathView) return false;
  void mathView.startEditing(null);
  return true;
};

function insertMathNode(type: 'math_inline' | 'math_block', latex: string): EditorCommand {
  return (state, dispatch, view) => {
    const nodeType = state.schema.nodes[type];
    if (!nodeType) return false;
    if (!dispatch) return true;
    const { from, to, empty } = state.selection;
    // Selected text becomes the LaTeX source.
    const source = latex || (empty ? '' : state.doc.textBetween(from, to, ' '));
    const node = nodeType.create({ latex: source });
    const tr = state.tr.replaceSelectionWith(node);
    // Select the new node so its editor opens immediately.
    let at = -1;
    tr.doc.descendants((child, pos) => {
      if (at === -1 && child === node) at = pos;
      return at === -1;
    });
    if (at !== -1) {
      tr.setSelection(NodeSelection.create(tr.doc, at));
      if (view) editRequests.set(view, true); // open the visual editor right away
    }
    dispatch(tr.scrollIntoView());
    return true;
  };
}

/** Inserts an inline equation (opens the editor). */
export const insertMath = (latex = ''): EditorCommand => insertMathNode('math_inline', latex);
/** Inserts a display (block) equation (opens the editor). */
export const insertMathBlock = (latex = ''): EditorCommand => insertMathNode('math_block', latex);

/** MATH-001, 002, 006, 029, 037, 044, 045: equations with LaTeX, live preview and lazy KaTeX. */
export const MathPlugin = definePlugin({
  name: 'math',
  nodes,
  commands: { insertMath, insertMathBlock, editSelectedMath },
  keymap: () => ({
    'Mod-Shift-m': insertMath(),
    'Mod-Alt-m': insertMathBlock(),
    Enter: editSelectedMath(),
  }),
  enginePlugins: (schema) => {
    const inline = schema.nodes['math_inline'];
    const block = schema.nodes['math_block'];
    const rules: InputRule[] = [];
    if (inline) {
      // $x^2$ → inline equation (typed closing $)
      rules.push(
        new InputRule(/(?<![$\\\w])\$([^$\s](?:[^$]*[^$\s])?)\$$/, (state, match, start, end) => {
          const latex = match[1];
          if (!latex) return null;
          return state.tr.replaceWith(start, end, inline.create({ latex }));
        }),
      );
    }
    if (block) {
      // "$$ " at the start of an empty line → block equation
      rules.push(
        new InputRule(/^\$\$\s$/, (state, _match, start) => {
          const $start = state.doc.resolve(start);
          if ($start.parent.type.name !== 'paragraph') return null;
          const tr = state.tr.replaceWith(
            $start.before(),
            $start.after(),
            block.create({ latex: '' }),
          );
          return tr.setSelection(NodeSelection.create(tr.doc, $start.before()));
        }),
      );
    }
    return [
      inputRules({ rules }),
      new Plugin({
        key: mathEditKey,
        state: {
          init: () => false,
          apply: (tr) => tr.getMeta('axMathEdit') === true,
        },
        // "$$ " creates an empty block equation and opens the visual editor right away.
        view: () => ({
          update: (view) => {
            if (mathEditKey.getState(view.state)) editSelectedMath()(view.state, undefined, view);
          },
        }),
        props: {
          // While the visual editor is opening, swallow typing so it can't overwrite the equation.
          handleKeyDown: (view) => opening.has(view),
          handleTextInput: (view) => opening.has(view),
          nodeViews: {
            math_inline: (node, view, getPos) => new MathView(node, view, getPos),
            math_block: (node, view, getPos) => new MathView(node, view, getPos),
          },
        },
      }),
    ];
  },
  messages: {
    en: { 'math.inline': 'Equation', 'math.block': 'Block equation', 'math.copy': 'Copy LaTeX' },
  },
});

import { definePlugin } from '@axiomtext/core';
import type { EditorCommand, NodeDefinition } from '@axiomtext/core';
import { InputRule, inputRules } from 'prosemirror-inputrules';
import type { Node as PMNode } from 'prosemirror-model';
import { NodeSelection, Plugin, TextSelection } from 'prosemirror-state';
import type { EditorView, NodeView } from 'prosemirror-view';
import { openMathEditor } from './editor-popover';
import type { MathEditorHandle } from './editor-popover';
import { isKatexLoaded, loadKatex, renderLatex } from './render';

export { loadKatex, renderLatex, validateLatex, SAFE_KATEX_OPTIONS } from './render';
export type { RenderResult } from './render';
export { MATH_TEMPLATES, openMathEditor } from './editor-popover';

const latexAttr = { latex: { default: '', validate: 'string' } } as const;

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
    toDOM: (node) => [
      'span',
      { 'data-type': 'math-inline', 'data-latex': node.attrs['latex'] as string, class: 'ax-math' },
      `\\(${node.attrs['latex'] as string}\\)`,
    ],
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
    toDOM: (node) => [
      'div',
      {
        'data-type': 'math-block',
        'data-latex': node.attrs['latex'] as string,
        class: 'ax-math ax-math--block',
      },
      `\\[${node.attrs['latex'] as string}\\]`,
    ],
  },
};

/** Renders an equation with KaTeX and opens the LaTeX editor when selected. */
class MathView implements NodeView {
  dom: HTMLElement;
  private editor: MathEditorHandle | null = null;

  constructor(
    private node: PMNode,
    private view: EditorView,
    private getPos: () => number | undefined,
  ) {
    const block = node.type.name === 'math_block';
    this.dom = document.createElement(block ? 'div' : 'span');
    this.dom.className = block ? 'ax-math ax-math--block' : 'ax-math';
    this.dom.dataset['type'] = block ? 'math-block' : 'math-inline';
    this.dom.contentEditable = 'false';
    this.render();
    if (!isKatexLoaded()) void loadKatex().then(() => this.render());
  }

  private get display(): boolean {
    return this.node.type.name === 'math_block';
  }

  private render(): void {
    const latex = this.node.attrs['latex'] as string;
    this.dom.dataset['latex'] = latex;
    this.dom.classList.remove('is-empty', 'has-error', 'is-loading');
    if (latex.trim() === '') {
      this.dom.classList.add('is-empty');
      this.dom.textContent = this.display ? 'Empty equation — click to edit' : '𝑓(𝑥)';
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
    if (changed) this.render();
    return true;
  }

  selectNode(): void {
    this.dom.classList.add('is-selected');
    if (this.view.editable) this.openEditor();
  }

  deselectNode(): void {
    this.dom.classList.remove('is-selected');
  }

  private openEditor(): void {
    if (this.editor) return;
    this.editor = openMathEditor({
      latex: this.node.attrs['latex'] as string,
      displayMode: this.display,
      anchor: this.dom,
      onCommit: (latex) => {
        this.editor = null;
        const pos = this.getPos();
        if (pos === undefined) return;
        const { state } = this.view;
        let tr = state.tr;
        if (latex === '') {
          tr = tr.delete(pos, pos + this.node.nodeSize);
        } else {
          tr = tr.setNodeMarkup(pos, undefined, { latex });
          tr = tr.setSelection(TextSelection.near(tr.doc.resolve(pos + this.node.nodeSize)));
        }
        this.view.dispatch(tr.scrollIntoView());
        this.view.focus();
      },
      onCancel: () => {
        this.editor = null;
        const pos = this.getPos();
        if (pos === undefined) return;
        const { state } = this.view;
        const tr =
          (this.node.attrs['latex'] as string) === ''
            ? state.tr.delete(pos, pos + this.node.nodeSize)
            : state.tr.setSelection(
                TextSelection.near(state.doc.resolve(pos + this.node.nodeSize)),
              );
        this.view.dispatch(tr);
        this.view.focus();
      },
    });
  }

  stopEvent(): boolean {
    return false;
  }

  ignoreMutation(): boolean {
    return true;
  }

  destroy(): void {
    this.editor?.close();
    this.editor = null;
  }
}

function insertMathNode(type: 'math_inline' | 'math_block', latex: string): EditorCommand {
  return (state, dispatch) => {
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
    if (at !== -1) tr.setSelection(NodeSelection.create(tr.doc, at));
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
  commands: { insertMath, insertMathBlock },
  keymap: () => ({ 'Mod-Shift-m': insertMath(), 'Mod-Alt-m': insertMathBlock() }),
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
        props: {
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

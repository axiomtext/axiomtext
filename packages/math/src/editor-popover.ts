import { t } from '@axiomtext/i18n';
import { trustedHTML } from '@axiomtext/core';
import { attachAutocompleteLazy as attachAutocomplete } from './autocomplete-lazy';
import {
  createFormatToggle,
  getConverters,
  getLastFormat,
  loadConverters,
  setLastFormat,
} from './text-input';
import type { MathInputFormat } from './text-input';
export type { MathInputFormat } from './text-input';
import { loadKatex, renderLatex } from './render';

/** Quick-insert templates. `$0` marks where the cursor goes. */
export const MATH_TEMPLATES: readonly { label: string; title: string; latex: string }[] = [
  { label: 'a/b', title: 'Fraction', latex: '\\frac{$0}{}' },
  { label: '√x', title: 'Square root', latex: '\\sqrt{$0}' },
  { label: 'xⁿ', title: 'Power', latex: '^{$0}' },
  { label: 'xₙ', title: 'Subscript', latex: '_{$0}' },
  { label: '∑', title: 'Sum', latex: '\\sum_{i=1}^{n} $0' },
  { label: '∫', title: 'Integral', latex: '\\int_{a}^{b} $0 \\,dx' },
  { label: 'lim', title: 'Limit', latex: '\\lim_{x \\to \\infty} $0' },
  { label: '[ ]', title: 'Matrix', latex: '\\begin{pmatrix} $0 & b \\\\ c & d \\end{pmatrix}' },
  {
    label: '{',
    title: 'Cases',
    latex: '\\begin{cases} $0 & x \\geq 0 \\\\ -x & x < 0 \\end{cases}',
  },
  { label: 'α', title: 'Alpha', latex: '\\alpha' },
  { label: 'π', title: 'Pi', latex: '\\pi' },
  { label: '≤', title: 'Less or equal', latex: '\\leq ' },
  { label: '≠', title: 'Not equal', latex: '\\neq ' },
  { label: '∞', title: 'Infinity', latex: '\\infty' },
];

export interface MathEditorOptions {
  latex: string;
  displayMode: boolean;
  anchor: HTMLElement;
  onCommit(latex: string): void;
  onCancel(): void;
}

export interface MathEditorHandle {
  close(): void;
  readonly element: HTMLElement;
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  node.className = className;
  for (const [k, v] of Object.entries(attrs))
    node.setAttribute(k, ['aria-label', 'title', 'placeholder'].includes(k) ? t(v) : v);
  return node;
};

let openEditor: MathEditorHandle | null = null;

/** Opens the LaTeX editor popover with live preview, templates and validation. */
export function openMathEditor(options: MathEditorOptions): MathEditorHandle {
  openEditor?.close();

  const root = el('div', 'ax-math-editor', {
    role: 'dialog',
    'aria-label': options.displayMode ? 'Edit block equation' : 'Edit equation',
  });
  const templates = el('div', 'ax-math-editor__templates', {
    role: 'toolbar',
    'aria-label': 'Insert template',
  });
  const input = el('textarea', 'ax-math-editor__input', {
    'aria-label': 'LaTeX',
    spellcheck: 'false',
    autocapitalize: 'off',
    autocomplete: 'off',
    rows: options.displayMode ? '3' : '1',
    placeholder: 'e.g. x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
  });
  input.value = options.latex;
  let format: MathInputFormat = 'latex';
  const field = el('div', 'ax-math-editor__field');
  field.append(input);
  const toggle = createFormatToggle(format, (next) => void setFormat(next));
  const formats = toggle.element;
  /** The equation as LaTeX, whatever the user is typing in. */
  const currentLatex = (): string =>
    format === 'latex' ? input.value : (getConverters()?.toLatex(input.value) ?? '');
  const setFormat = async (next: MathInputFormat): Promise<void> => {
    if (next === format) return;
    const latex = currentLatex();
    if (next === 'asciimath' && !(await loadConverters())) return;
    const conv = getConverters();
    input.value = next === 'asciimath' && conv ? conv.toAscii(latex) : latex;
    format = next;
    setLastFormat(next);
    toggle.set(next);
    templates.hidden = next !== 'latex';
    input.setAttribute('aria-label', t(next === 'latex' ? 'LaTeX' : 'AsciiMath'));
    input.placeholder = t(
      next === 'latex'
        ? 'e.g. x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}'
        : 'e.g. x = (-b +- sqrt(b^2-4ac))/(2a)',
    );
    update();
    input.focus();
  };
  const preview = el('div', 'ax-math-editor__preview', { 'aria-live': 'polite' });
  const error = el('div', 'ax-math-editor__error', { role: 'status' });
  const footer = el('div', 'ax-math-editor__footer');
  const hint = el('span', 'ax-math-editor__hint');
  hint.textContent = t(
    options.displayMode ? '⌘/Ctrl+Enter save · Esc cancel' : 'Enter save · Esc cancel',
  );
  const copy = el('button', 'ax-math-editor__button', { type: 'button' });
  copy.textContent = t('Copy LaTeX');
  const cancel = el('button', 'ax-math-editor__button', { type: 'button' });
  cancel.textContent = t('Cancel');
  const done = el('button', 'ax-math-editor__button is-primary', { type: 'button' });
  done.textContent = t('Done');
  footer.append(hint, copy, cancel, done);

  for (const template of MATH_TEMPLATES) {
    const button = el('button', 'ax-math-editor__template', {
      type: 'button',
      title: template.title,
      'aria-label': template.title,
    });
    button.textContent = template.label;
    button.addEventListener('mousedown', (e) => e.preventDefault());
    button.addEventListener('click', () => {
      const [before, after = ''] = template.latex.split('$0');
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const selected = input.value.slice(start, end);
      input.setRangeText(`${before ?? ''}${selected}${after}`, start, end, 'end');
      const caret = start + (before ?? '').length + selected.length;
      input.setSelectionRange(caret, caret);
      input.focus();
      update();
    });
    templates.append(button);
  }

  root.append(formats, templates, field, preview, error, footer);
  const autocomplete = attachAutocomplete(
    input,
    field,
    () => update(),
    () => format === 'latex',
  );
  document.body.append(root);

  const position = (): void => {
    const rect = options.anchor.getBoundingClientRect();
    const width = Math.min(480, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    root.style.width = `${width}px`;
    root.style.left = `${left}px`;
    const below = rect.bottom + 8;
    const height = root.offsetHeight;
    root.style.top = `${below + height > window.innerHeight && rect.top > height + 8 ? rect.top - height - 8 : below}px`;
  };

  const update = (): void => {
    const latex = currentLatex();
    const result = renderLatex(latex, options.displayMode);
    preview.classList.toggle('is-empty', latex.trim() === '');
    if (result.html) {
      preview.innerHTML = trustedHTML(result.html); // KaTeX output with trust:false (see render.ts)
    } else if (latex.trim() === '') {
      preview.textContent = t('Preview');
    }
    error.textContent = result.error ?? '';
    root.classList.toggle('has-error', result.error !== null);
    done.disabled = result.error !== null;
    autoGrow();
  };

  const autoGrow = (): void => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 200)}px`;
  };

  const commit = (): void => {
    const latex = currentLatex();
    if (renderLatex(latex, options.displayMode).error) return;
    handle.close();
    options.onCommit(latex.trim());
  };
  const dismiss = (): void => {
    handle.close();
    options.onCancel();
  };

  input.addEventListener('input', update);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
    } else if (event.key === 'Enter' && (!options.displayMode || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commit();
    }
  });
  done.addEventListener('click', commit);
  cancel.addEventListener('click', dismiss);
  copy.addEventListener('click', () => {
    void navigator.clipboard?.writeText(currentLatex()).then(() => {
      copy.textContent = t('Copied ✓');
      setTimeout(() => (copy.textContent = t('Copy LaTeX')), 1200);
    });
  });

  const onPointerDown = (event: PointerEvent): void => {
    if (!root.contains(event.target as Node) && !options.anchor.contains(event.target as Node))
      commit();
  };
  const onScroll = (): void => position();
  document.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('resize', onScroll);
  window.addEventListener('scroll', onScroll, true);

  const handle: MathEditorHandle = {
    element: root,
    close() {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
      autocomplete.destroy();
      root.remove();
      if (openEditor === handle) openEditor = null;
    },
  };
  openEditor = handle;

  preview.textContent = t('Loading…');
  void loadKatex().then(() => {
    if (root.isConnected) update();
    position();
  });
  update();
  position();
  if (getLastFormat() === 'asciimath') void setFormat('asciimath');
  requestAnimationFrame(() => {
    root.classList.add('is-open');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
  return handle;
}

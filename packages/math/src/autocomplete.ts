import { t } from '@axiomtext/i18n';
/** LaTeX command autocomplete for the text equation editor (type `\fr` → `\frac{}{}`). */

/** [command, inserted text (`$0` = caret), short description]. */
export const LATEX_COMMANDS: readonly (readonly [string, string, string])[] = [
  ['frac', '\\frac{$0}{}', 'fraction'],
  ['dfrac', '\\dfrac{$0}{}', 'display fraction'],
  ['sqrt', '\\sqrt{$0}', 'square root'],
  ['binom', '\\binom{$0}{}', 'binomial'],
  ['sum', '\\sum_{$0}^{}', 'sum'],
  ['prod', '\\prod_{$0}^{}', 'product'],
  ['int', '\\int_{$0}^{}', 'integral'],
  ['iint', '\\iint', 'double integral'],
  ['oint', '\\oint', 'contour integral'],
  ['lim', '\\lim_{$0}', 'limit'],
  ['infty', '\\infty', '∞'],
  ['partial', '\\partial', '∂'],
  ['nabla', '\\nabla', '∇'],
  ['cdot', '\\cdot', '·'],
  ['times', '\\times', '×'],
  ['div', '\\div', '÷'],
  ['pm', '\\pm', '±'],
  ['mp', '\\mp', '∓'],
  ['leq', '\\leq', '≤'],
  ['geq', '\\geq', '≥'],
  ['neq', '\\neq', '≠'],
  ['approx', '\\approx', '≈'],
  ['equiv', '\\equiv', '≡'],
  ['sim', '\\sim', '∼'],
  ['propto', '\\propto', '∝'],
  ['to', '\\to', '→'],
  ['rightarrow', '\\rightarrow', '→'],
  ['leftarrow', '\\leftarrow', '←'],
  ['Rightarrow', '\\Rightarrow', '⇒'],
  ['Leftrightarrow', '\\Leftrightarrow', '⇔'],
  ['mapsto', '\\mapsto', '↦'],
  ['in', '\\in', '∈'],
  ['notin', '\\notin', '∉'],
  ['subset', '\\subset', '⊂'],
  ['subseteq', '\\subseteq', '⊆'],
  ['cup', '\\cup', '∪'],
  ['cap', '\\cap', '∩'],
  ['emptyset', '\\emptyset', '∅'],
  ['forall', '\\forall', '∀'],
  ['exists', '\\exists', '∃'],
  ['neg', '\\neg', '¬'],
  ['land', '\\land', '∧'],
  ['lor', '\\lor', '∨'],
  ['alpha', '\\alpha', 'α'],
  ['beta', '\\beta', 'β'],
  ['gamma', '\\gamma', 'γ'],
  ['Gamma', '\\Gamma', 'Γ'],
  ['delta', '\\delta', 'δ'],
  ['Delta', '\\Delta', 'Δ'],
  ['epsilon', '\\epsilon', 'ε'],
  ['varepsilon', '\\varepsilon', 'ε'],
  ['zeta', '\\zeta', 'ζ'],
  ['eta', '\\eta', 'η'],
  ['theta', '\\theta', 'θ'],
  ['Theta', '\\Theta', 'Θ'],
  ['iota', '\\iota', 'ι'],
  ['kappa', '\\kappa', 'κ'],
  ['lambda', '\\lambda', 'λ'],
  ['Lambda', '\\Lambda', 'Λ'],
  ['mu', '\\mu', 'μ'],
  ['nu', '\\nu', 'ν'],
  ['xi', '\\xi', 'ξ'],
  ['pi', '\\pi', 'π'],
  ['Pi', '\\Pi', 'Π'],
  ['rho', '\\rho', 'ρ'],
  ['sigma', '\\sigma', 'σ'],
  ['Sigma', '\\Sigma', 'Σ'],
  ['tau', '\\tau', 'τ'],
  ['phi', '\\phi', 'φ'],
  ['varphi', '\\varphi', 'φ'],
  ['Phi', '\\Phi', 'Φ'],
  ['chi', '\\chi', 'χ'],
  ['psi', '\\psi', 'ψ'],
  ['Psi', '\\Psi', 'Ψ'],
  ['omega', '\\omega', 'ω'],
  ['Omega', '\\Omega', 'Ω'],
  ['sin', '\\sin', 'sine'],
  ['cos', '\\cos', 'cosine'],
  ['tan', '\\tan', 'tangent'],
  ['cot', '\\cot', 'cotangent'],
  ['sec', '\\sec', 'secant'],
  ['csc', '\\csc', 'cosecant'],
  ['arcsin', '\\arcsin', 'inverse sine'],
  ['arccos', '\\arccos', 'inverse cosine'],
  ['arctan', '\\arctan', 'inverse tangent'],
  ['sinh', '\\sinh', 'hyperbolic sine'],
  ['cosh', '\\cosh', 'hyperbolic cosine'],
  ['log', '\\log', 'logarithm'],
  ['ln', '\\ln', 'natural log'],
  ['exp', '\\exp', 'exponential'],
  ['max', '\\max', 'maximum'],
  ['min', '\\min', 'minimum'],
  ['det', '\\det', 'determinant'],
  ['gcd', '\\gcd', 'gcd'],
  ['mod', '\\bmod', 'modulo'],
  ['vec', '\\vec{$0}', 'vector arrow'],
  ['hat', '\\hat{$0}', 'hat'],
  ['bar', '\\bar{$0}', 'bar'],
  ['overline', '\\overline{$0}', 'overline'],
  ['underline', '\\underline{$0}', 'underline'],
  ['dot', '\\dot{$0}', 'dot'],
  ['ddot', '\\ddot{$0}', 'double dot'],
  ['tilde', '\\tilde{$0}', 'tilde'],
  ['overbrace', '\\overbrace{$0}^{}', 'overbrace'],
  ['underbrace', '\\underbrace{$0}_{}', 'underbrace'],
  ['mathbb', '\\mathbb{$0}', 'blackboard (ℝ, ℕ)'],
  ['mathbf', '\\mathbf{$0}', 'bold'],
  ['mathrm', '\\mathrm{$0}', 'upright'],
  ['mathcal', '\\mathcal{$0}', 'calligraphic'],
  ['text', '\\text{$0}', 'text'],
  ['left', '\\left( $0 \\right)', 'auto-size brackets'],
  ['langle', '\\langle $0 \\rangle', '⟨ ⟩'],
  ['lfloor', '\\lfloor $0 \\rfloor', 'floor'],
  ['lceil', '\\lceil $0 \\rceil', 'ceiling'],
  ['ldots', '\\ldots', '…'],
  ['cdots', '\\cdots', '⋯'],
  ['vdots', '\\vdots', '⋮'],
  ['ddots', '\\ddots', '⋱'],
  ['quad', '\\quad', 'space'],
  ['boxed', '\\boxed{$0}', 'box'],
  ['cancel', '\\cancel{$0}', 'strike out'],
  ['degree', '^{\\circ}', '°'],
  ['angle', '\\angle', '∠'],
  ['perp', '\\perp', '⊥'],
  ['parallel', '\\parallel', '∥'],
  ['therefore', '\\therefore', '∴'],
  ['pmatrix', '\\begin{pmatrix} $0 & \\\\ & \\end{pmatrix}', 'matrix ( )'],
  ['bmatrix', '\\begin{bmatrix} $0 & \\\\ & \\end{bmatrix}', 'matrix [ ]'],
  ['vmatrix', '\\begin{vmatrix} $0 & \\\\ & \\end{vmatrix}', 'determinant | |'],
  ['cases', '\\begin{cases} $0 & \\\\ & \\end{cases}', 'cases'],
  ['aligned', '\\begin{aligned} $0 &= \\\\ &= \\end{aligned}', 'aligned equations'],
  ['overset', '\\overset{$0}{}', 'symbol above'],
  ['underset', '\\underset{$0}{}', 'symbol below'],
];

/** Commands starting with `prefix` (case-sensitive first, then case-insensitive). */
export function matchCommands(prefix: string, limit = 8): (readonly [string, string, string])[] {
  if (!prefix) return [];
  const lower = prefix.toLowerCase();
  const exact = LATEX_COMMANDS.filter(([name]) => name.startsWith(prefix));
  const loose = LATEX_COMMANDS.filter(
    ([name]) => !name.startsWith(prefix) && name.toLowerCase().startsWith(lower),
  );
  return [...exact, ...loose].slice(0, limit);
}

/**
 * Shows a suggestion list under the textarea while typing `\name`.
 * ↑/↓ choose, Tab/Enter accept, Esc closes the list (a second Esc closes the editor).
 */
export function attachAutocomplete(
  input: HTMLTextAreaElement,
  container: HTMLElement,
  onChange: () => void,
  enabled: () => boolean = () => true,
): { destroy(): void; isOpen(): boolean } {
  const list = document.createElement('ul');
  list.className = 'ax-math-autocomplete';
  list.setAttribute('role', 'listbox');
  list.id = `ax-math-ac-${Math.random().toString(36).slice(2, 8)}`;
  list.hidden = true;
  container.append(list);
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', list.id);

  let items: (readonly [string, string, string])[] = [];
  let active = 0;
  let wordStart = -1;

  const close = (): void => {
    list.hidden = true;
    items = [];
    input.removeAttribute('aria-activedescendant');
  };

  const render = (): void => {
    list.replaceChildren(
      ...items.map(([name, , description], i) => {
        const li = document.createElement('li');
        li.id = `${list.id}-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === active));
        li.className = i === active ? 'is-active' : '';
        const cmd = document.createElement('code');
        cmd.textContent = `\\${name}`;
        const desc = document.createElement('span');
        desc.textContent = t(description);
        li.append(cmd, desc);
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          active = i;
          accept();
        });
        return li;
      }),
    );
    list.hidden = items.length === 0;
    if (items.length) input.setAttribute('aria-activedescendant', `${list.id}-${active}`);
  };

  const refresh = (): void => {
    if (!enabled()) return close();
    const caret = input.selectionStart;
    const before = input.value.slice(0, caret);
    const match = /\\([A-Za-z]*)$/.exec(before);
    if (!match || input.selectionStart !== input.selectionEnd) return close();
    wordStart = caret - match[0].length;
    items = matchCommands(match[1] ?? '');
    // Nothing more to offer when the exact command is already typed and it's the only match.
    const only = items.length === 1 ? items[0] : undefined;
    if (only && only[0] === match[1] && !only[1].includes('$0')) items = [];
    active = 0;
    render();
  };

  const accept = (): void => {
    const item = items[active];
    if (!item) return;
    const [before, after = ''] = item[1].split('$0');
    const caret = input.selectionStart;
    input.setRangeText(`${before ?? ''}${after}`, wordStart, caret, 'end');
    const pos = wordStart + (before ?? '').length;
    input.setSelectionRange(pos, pos);
    close();
    onChange();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (list.hidden) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopImmediatePropagation();
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      render();
    } else if (event.key === 'Tab' || event.key === 'Enter') {
      event.preventDefault();
      event.stopImmediatePropagation();
      accept();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
  };
  input.addEventListener('keydown', onKeyDown, true);
  input.addEventListener('input', refresh);
  input.addEventListener('blur', close);

  return {
    isOpen: () => !list.hidden,
    destroy() {
      input.removeEventListener('keydown', onKeyDown, true);
      input.removeEventListener('input', refresh);
      input.removeEventListener('blur', close);
      list.remove();
    },
  };
}

import { renderLatex } from './render';

/**
 * Visual insert templates. `#0` = current selection, `#?` = empty placeholder the user fills in,
 * `#@` = the item just before the cursor (e.g. turns `x` into `x²`). `label` is rendered with KaTeX.
 */
export interface MathTemplate {
  title: string;
  label: string;
  insert: string;
}

export const STRUCTURE_TEMPLATES: readonly MathTemplate[] = [
  { title: 'Fraction', label: '\\dfrac{a}{b}', insert: '\\frac{#0}{#?}' },
  { title: 'Square root', label: '\\sqrt{x}', insert: '\\sqrt{#0}' },
  { title: 'Root', label: '\\sqrt[n]{x}', insert: '\\sqrt[#?]{#0}' },
  { title: 'Power', label: 'x^{n}', insert: '#@^{#?}' },
  { title: 'Subscript', label: 'x_{n}', insert: '#@_{#?}' },
  { title: 'Parentheses', label: '(x)', insert: '\\left(#0\\right)' },
  { title: 'Absolute value', label: '|x|', insert: '\\left|#0\\right|' },
  { title: 'Sum', label: '\\sum', insert: '\\sum_{#?}^{#?}#0' },
  { title: 'Integral', label: '\\int', insert: '\\int_{#?}^{#?}#0\\,d#?' },
  { title: 'Limit', label: '\\lim', insert: '\\lim_{#?\\to#?}#0' },
  {
    title: 'Matrix 2×2',
    label: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}',
    insert: '\\begin{pmatrix}#0&#?\\\\#?&#?\\end{pmatrix}',
  },
  {
    title: 'Cases',
    label: '\\begin{cases}a\\\\b\\end{cases}',
    insert: '\\begin{cases}#0&#?\\\\#?&#?\\end{cases}',
  },
  { title: 'Vector', label: '\\vec{v}', insert: '\\vec{#0}' },
  { title: 'Overline', label: '\\overline{x}', insert: '\\overline{#0}' },
];

export const SYMBOL_TEMPLATES: readonly MathTemplate[] = [
  { title: 'Plus or minus', label: '\\pm', insert: '\\pm' },
  { title: 'Times', label: '\\times', insert: '\\times' },
  { title: 'Divide', label: '\\div', insert: '\\div' },
  { title: 'Not equal', label: '\\neq', insert: '\\neq' },
  { title: 'Less or equal', label: '\\leq', insert: '\\leq' },
  { title: 'Greater or equal', label: '\\geq', insert: '\\geq' },
  { title: 'Approximately', label: '\\approx', insert: '\\approx' },
  { title: 'Infinity', label: '\\infty', insert: '\\infty' },
  { title: 'Arrow', label: '\\to', insert: '\\to' },
  { title: 'Implies', label: '\\Rightarrow', insert: '\\Rightarrow' },
  { title: 'Element of', label: '\\in', insert: '\\in' },
  { title: 'For all', label: '\\forall', insert: '\\forall' },
  { title: 'Exists', label: '\\exists', insert: '\\exists' },
  { title: 'Degree', label: '^\\circ', insert: '^\\circ' },
  { title: 'Partial derivative', label: '\\partial', insert: '\\partial' },
  { title: 'Nabla', label: '\\nabla', insert: '\\nabla' },
];

export const GREEK_TEMPLATES: readonly MathTemplate[] = [
  'alpha',
  'beta',
  'gamma',
  'delta',
  'epsilon',
  'theta',
  'lambda',
  'mu',
  'pi',
  'rho',
  'sigma',
  'tau',
  'phi',
  'omega',
  'Delta',
  'Sigma',
  'Omega',
].map((name) => ({
  title: name[0]?.toUpperCase() + name.slice(1),
  label: `\\${name}`,
  insert: `\\${name}`,
}));

export interface MathBarCallbacks {
  insert(template: MathTemplate): void;
  toggleKeyboard(): void;
  toggleLatex(): void;
  done(): void;
}

export interface MathBar {
  readonly element: HTMLElement;
  position(anchor: HTMLElement): void;
  setLatexOpen(open: boolean): void;
  setKeyboardOpen(open: boolean): void;
  setError(message: string | null): void;
  destroy(): void;
}

const button = (className: string, title: string, onClick: () => void): HTMLButtonElement => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.title = title;
  b.setAttribute('aria-label', title);
  // Never steal focus from the equation being edited.
  b.addEventListener('mousedown', (e) => e.preventDefault());
  b.addEventListener('click', onClick);
  return b;
};

const renderLabel = (el: HTMLElement, latex: string): void => {
  const { html } = renderLatex(latex, false);
  if (html)
    el.innerHTML = html; // KaTeX output, trust:false
  else el.textContent = latex;
};

/** Floating bar under the equation: tabs of visual templates + keyboard, LaTeX and Done. */
export function createMathBar(callbacks: MathBarCallbacks): MathBar {
  const root = document.createElement('div');
  root.className = 'ax-math-bar';
  root.setAttribute('role', 'toolbar');
  root.setAttribute('aria-label', 'Equation tools');

  const tabs = document.createElement('div');
  tabs.className = 'ax-math-bar__tabs';
  tabs.setAttribute('role', 'tablist');
  const panel = document.createElement('div');
  panel.className = 'ax-math-bar__panel';

  const groups: [string, readonly MathTemplate[]][] = [
    ['Structures', STRUCTURE_TEMPLATES],
    ['Symbols', SYMBOL_TEMPLATES],
    ['Greek', GREEK_TEMPLATES],
  ];
  const tabButtons: HTMLButtonElement[] = [];
  const showGroup = (index: number): void => {
    tabButtons.forEach((t, i) => t.setAttribute('aria-selected', String(i === index)));
    panel.replaceChildren(
      ...(groups[index]?.[1] ?? []).map((template) => {
        const b = button('ax-math-bar__item', template.title, () => callbacks.insert(template));
        renderLabel(b, template.label);
        return b;
      }),
    );
  };
  groups.forEach(([name], index) => {
    const tab = button('ax-math-bar__tab', name, () => showGroup(index));
    tab.textContent = name;
    tab.setAttribute('role', 'tab');
    tabs.append(tab);
    tabButtons.push(tab);
  });

  const actions = document.createElement('div');
  actions.className = 'ax-math-bar__actions';
  const keyboard = button('ax-math-bar__action', 'Math keyboard', callbacks.toggleKeyboard);
  keyboard.textContent = '⌨ Keyboard';
  const latex = button('ax-math-bar__action', 'Edit as LaTeX', callbacks.toggleLatex);
  latex.textContent = 'LaTeX';
  const done = button('ax-math-bar__action is-primary', 'Done (Enter)', callbacks.done);
  done.textContent = 'Done';
  actions.append(keyboard, latex, done);

  const header = document.createElement('div');
  header.className = 'ax-math-bar__header';
  header.append(tabs, actions);

  const error = document.createElement('div');
  error.className = 'ax-math-bar__error';
  error.setAttribute('role', 'status');

  root.append(header, panel, error);
  showGroup(0);
  document.body.append(root);
  requestAnimationFrame(() => root.classList.add('is-open'));

  return {
    element: root,
    position(anchor) {
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(560, window.innerWidth - 24);
      root.style.width = `${width}px`;
      root.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
      const height = root.offsetHeight;
      const below = rect.bottom + 10;
      root.style.top = `${below + height > window.innerHeight && rect.top > height + 10 ? rect.top - height - 10 : below}px`;
    },
    setLatexOpen(open) {
      latex.setAttribute('aria-pressed', String(open));
    },
    setKeyboardOpen(open) {
      keyboard.setAttribute('aria-pressed', String(open));
    },
    setError(message) {
      error.textContent = message ?? '';
    },
    destroy() {
      root.remove();
    },
  };
}

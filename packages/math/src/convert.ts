/**
 * Math format conversion that runs without loading any math engine:
 * - MathML → LaTeX (pasting from Wikipedia, ChatGPT/KaTeX pages, Word, MathType, …)
 * - finding `$…$`, `$$…$$`, `\(…\)`, `\[…\]` in plain text (pasting notes or Markdown).
 */
import { trustedHTML } from '@axiomtext/core';

const MO_TO_LATEX: Record<string, string> = {
  '±': '\\pm',
  '∓': '\\mp',
  '×': '\\times',
  '÷': '\\div',
  '·': '\\cdot',
  '⋅': '\\cdot',
  '∗': '\\ast',
  '∘': '\\circ',
  '≤': '\\leq',
  '≥': '\\geq',
  '≠': '\\neq',
  '≈': '\\approx',
  '≡': '\\equiv',
  '∼': '\\sim',
  '≅': '\\cong',
  '∝': '\\propto',
  '∞': '\\infty',
  '∈': '\\in',
  '∉': '\\notin',
  '⊂': '\\subset',
  '⊆': '\\subseteq',
  '⊃': '\\supset',
  '⊇': '\\supseteq',
  '∪': '\\cup',
  '∩': '\\cap',
  '∅': '\\emptyset',
  '∀': '\\forall',
  '∃': '\\exists',
  '¬': '\\neg',
  '∧': '\\land',
  '∨': '\\lor',
  '→': '\\to',
  '←': '\\leftarrow',
  '↔': '\\leftrightarrow',
  '⇒': '\\Rightarrow',
  '⇐': '\\Leftarrow',
  '⇔': '\\Leftrightarrow',
  '↦': '\\mapsto',
  '∂': '\\partial',
  '∇': '\\nabla',
  '∑': '\\sum',
  '∏': '\\prod',
  '∫': '\\int',
  '∬': '\\iint',
  '∭': '\\iiint',
  '∮': '\\oint',
  '…': '\\ldots',
  '⋯': '\\cdots',
  '⋮': '\\vdots',
  '⋱': '\\ddots',
  '′': "'",
  '″': "''",
  '⟨': '\\langle',
  '⟩': '\\rangle',
  '⌊': '\\lfloor',
  '⌋': '\\rfloor',
  '⌈': '\\lceil',
  '⌉': '\\rceil',
  '∥': '\\parallel',
  '⊥': '\\perp',
  '∠': '\\angle',
  '°': '^{\\circ}',
  '⁡': '',
  '⁢': '',
  '⁣': ',',
  '{': '\\{',
  '}': '\\}',
  '|': '|',
  '‖': '\\|',
  '−': '-',
  '∣': '\\mid',
  '⊕': '\\oplus',
  '⊗': '\\otimes',
  '∴': '\\therefore',
  '∵': '\\because',
  ℏ: '\\hbar',
  ℓ: '\\ell',
};

const MI_TO_LATEX: Record<string, string> = {
  α: '\\alpha',
  β: '\\beta',
  γ: '\\gamma',
  δ: '\\delta',
  ε: '\\epsilon',
  ϵ: '\\epsilon',
  ζ: '\\zeta',
  η: '\\eta',
  θ: '\\theta',
  ϑ: '\\vartheta',
  ι: '\\iota',
  κ: '\\kappa',
  λ: '\\lambda',
  μ: '\\mu',
  ν: '\\nu',
  ξ: '\\xi',
  π: '\\pi',
  ϖ: '\\varpi',
  ρ: '\\rho',
  σ: '\\sigma',
  ς: '\\varsigma',
  τ: '\\tau',
  υ: '\\upsilon',
  φ: '\\phi',
  ϕ: '\\phi',
  χ: '\\chi',
  ψ: '\\psi',
  ω: '\\omega',
  Γ: '\\Gamma',
  Δ: '\\Delta',
  Θ: '\\Theta',
  Λ: '\\Lambda',
  Ξ: '\\Xi',
  Π: '\\Pi',
  Σ: '\\Sigma',
  Υ: '\\Upsilon',
  Φ: '\\Phi',
  Ψ: '\\Psi',
  Ω: '\\Omega',
  '∞': '\\infty',
  ℝ: '\\mathbb{R}',
  ℕ: '\\mathbb{N}',
  ℤ: '\\mathbb{Z}',
  ℚ: '\\mathbb{Q}',
  ℂ: '\\mathbb{C}',
  ℏ: '\\hbar',
  ℓ: '\\ell',
  '∅': '\\emptyset',
  '∂': '\\partial',
  '∇': '\\nabla',
};

/** Functions written upright in LaTeX. */
const FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'cot',
  'sec',
  'csc',
  'arcsin',
  'arccos',
  'arctan',
  'sinh',
  'cosh',
  'tanh',
  'log',
  'ln',
  'lg',
  'exp',
  'lim',
  'max',
  'min',
  'sup',
  'inf',
  'det',
  'dim',
  'ker',
  'gcd',
  'deg',
  'arg',
  'Pr',
  'mod',
]);

const ACCENTS: Record<string, string> = {
  '^': '\\hat',
  ˆ: '\\hat',
  '~': '\\tilde',
  '˜': '\\tilde',
  '¯': '\\bar',
  '‾': '\\overline',
  '→': '\\vec',
  '⃗': '\\vec',
  '˙': '\\dot',
  '¨': '\\ddot',
  '⏞': '\\overbrace',
  '⏟': '\\underbrace',
  _: '\\underline',
};

const LARGE_OPS = new Set(['∑', '∏', '∫', '∬', '∭', '∮', '⋃', '⋂', 'lim', 'max', 'min']);

const group = (latex: string): string =>
  /^(?:\\?[A-Za-z]|\d|\\[A-Za-z]+)$/.test(latex) ? latex : `{${latex}}`;

const textOf = (el: Element): string => (el.textContent ?? '').trim();

function token(text: string, table: Record<string, string>): string {
  if (text in table) return table[text] as string;
  return [...text].map((ch) => table[ch] ?? MO_TO_LATEX[ch] ?? MI_TO_LATEX[ch] ?? ch).join('');
}

function convertChildren(el: Element): string {
  return [...el.children].map(convert).join(' ').replace(/\s+/g, ' ').trim();
}

function convert(el: Element): string {
  const tag = el.localName.toLowerCase();
  const kids = [...el.children];
  const c = (i: number): string => (kids[i] ? convert(kids[i]) : '');
  switch (tag) {
    case 'math':
    case 'mrow':
    case 'mstyle':
    case 'mpadded':
    case 'mphantom':
    case 'merror':
    case 'mtd':
      return convertChildren(el);
    case 'semantics': {
      const tex = el.querySelector('annotation[encoding="application/x-tex"]');
      return tex ? textOf(tex) : kids[0] ? convert(kids[0]) : '';
    }
    case 'annotation':
    case 'annotation-xml':
      return '';
    case 'mi': {
      const t = textOf(el);
      if (FUNCTIONS.has(t)) return `\\${t}`;
      if (t.length > 1 && /^[A-Za-z]+$/.test(t)) return `\\mathrm{${t}}`;
      const variant = el.getAttribute('mathvariant');
      const base = token(t, MI_TO_LATEX);
      if (variant === 'bold') return `\\mathbf{${base}}`;
      if (variant === 'double-struck') return `\\mathbb{${base}}`;
      if (variant === 'script') return `\\mathcal{${base}}`;
      if (variant === 'fraktur') return `\\mathfrak{${base}}`;
      if (variant === 'normal' && /^[A-Za-z]$/.test(t)) return `\\mathrm{${t}}`;
      return base;
    }
    case 'mn':
      return textOf(el);
    case 'mo': {
      const t = textOf(el);
      if (FUNCTIONS.has(t)) return `\\${t}`;
      return token(t, MO_TO_LATEX);
    }
    case 'mtext': {
      const t = el.textContent ?? '';
      return t.trim() ? `\\text{${t.replace(/[{}\\]/g, '')}}` : '\\ ';
    }
    case 'mspace':
      return '\\,';
    case 'ms':
      return `\\text{"${textOf(el)}"}`;
    case 'mfrac': {
      const thin = el.getAttribute('linethickness');
      return thin === '0' || thin === '0px'
        ? `\\binom{${c(0)}}{${c(1)}}`
        : `\\frac{${c(0)}}{${c(1)}}`;
    }
    case 'msqrt':
      return `\\sqrt{${convertChildren(el)}}`;
    case 'mroot':
      return `\\sqrt[${c(1)}]{${c(0)}}`;
    case 'msup': {
      const sup = c(1);
      // Primes: y′′ → y''
      if (/^['\s]+$/.test(sup)) return `${group(c(0))}${sup.replace(/\s/g, '')}`;
      return `${group(c(0))}^${group(sup)}`;
    }
    case 'msub':
      return `${group(c(0))}_${group(c(1))}`;
    case 'msubsup':
      return `${group(c(0))}_${group(c(1))}^${group(c(2))}`;
    case 'mover':
    case 'munder': {
      const over = tag === 'mover';
      const accentText = kids[1] ? textOf(kids[1]) : '';
      const accent = ACCENTS[accentText];
      if (accent && (el.getAttribute(over ? 'accent' : 'accentunder') !== 'false' || accent)) {
        if (over && !['\\underbrace', '\\underline'].includes(accent)) return `${accent}{${c(0)}}`;
        if (!over && ['\\underbrace', '\\underline'].includes(accent)) return `${accent}{${c(0)}}`;
      }
      const baseText = kids[0] ? textOf(kids[0]) : '';
      if (LARGE_OPS.has(baseText) || FUNCTIONS.has(baseText))
        return `${c(0)}${over ? '^' : '_'}${group(c(1))}`;
      return over ? `\\overset{${c(1)}}{${c(0)}}` : `\\underset{${c(1)}}{${c(0)}}`;
    }
    case 'munderover':
      return `${group(c(0))}_${group(c(1))}^${group(c(2))}`;
    case 'mfenced': {
      const open = el.getAttribute('open') ?? '(';
      const close = el.getAttribute('close') ?? ')';
      const sep = el.getAttribute('separators') ?? ',';
      const inner = kids.map(convert).join(`${sep.trim() || ','} `);
      return `\\left${fence(open)} ${inner} \\right${fence(close)}`;
    }
    case 'menclose': {
      const notation = el.getAttribute('notation') ?? '';
      if (notation.includes('box')) return `\\boxed{${convertChildren(el)}}`;
      if (notation.includes('updiagonalstrike')) return `\\cancel{${convertChildren(el)}}`;
      return convertChildren(el);
    }
    case 'mtable': {
      const rows = kids
        .filter((r) => r.localName === 'mtr' || r.localName === 'mlabeledtr')
        .map((r) =>
          [...r.children]
            .filter((d) => d.localName === 'mtd')
            .map(convert)
            .join(' & '),
        );
      return `\\begin{matrix} ${rows.join(' \\\\ ')} \\end{matrix}`;
    }
    default:
      return convertChildren(el) || textOf(el);
  }
}

const fence = (ch: string): string =>
  ch === ''
    ? '.'
    : ch === '{'
      ? '\\{'
      : ch === '}'
        ? '\\}'
        : ch === '⟨'
          ? '\\langle'
          : ch === '⟩'
            ? '\\rangle'
            : ch === '‖'
              ? '\\|'
              : ch;

/** Tidies converter output: `( matrix )` → `pmatrix`, collapses spaces. */
function tidy(latex: string): string {
  return latex
    .replace(
      /\\left\( \\begin\{matrix\}(.*?)\\end\{matrix\} \\right\)/g,
      '\\begin{pmatrix}$1\\end{pmatrix}',
    )
    .replace(
      /\\left\[ \\begin\{matrix\}(.*?)\\end\{matrix\} \\right\]/g,
      '\\begin{bmatrix}$1\\end{bmatrix}',
    )
    .replace(
      /\\left\| \\begin\{matrix\}(.*?)\\end\{matrix\} \\right\|/g,
      '\\begin{vmatrix}$1\\end{vmatrix}',
    )
    .replace(/\(\s*\\begin\{matrix\}(.*?)\\end\{matrix\}\s*\)/g, '\\begin{pmatrix}$1\\end{pmatrix}')
    .replace(/\\\{\s*\\begin\{matrix\}(.*?)\\end\{matrix\}\s*$/g, '\\begin{cases}$1\\end{cases}')
    .replace(/\s+/g, ' ')
    .replace(/\s*([_^])\s*/g, '$1')
    .replace(/(\\[A-Za-z]+) (?=[^A-Za-z])/g, '$1')
    .trim();
}

/**
 * Converts a MathML `<math>` element (or its children) to LaTeX.
 * Uses an embedded TeX annotation when present (Wikipedia, KaTeX, MathJax output keep one).
 */
export function mathmlToLatex(math: Element): string {
  const tex = math.querySelector(
    'annotation[encoding="application/x-tex"], annotation[encoding="TeX"]',
  );
  if (tex && textOf(tex))
    return textOf(tex)
      .replace(/^\\displaystyle\s*/, '')
      .replace(/^\{\\displaystyle\s*(.*)\}$/s, '$1');
  return tidy(convert(math));
}

/** Parses a MathML string (e.g. from the clipboard) to LaTeX; null when it isn't MathML. */
export function mathmlStringToLatex(source: string): string | null {
  if (typeof DOMParser === 'undefined' || !/<math[\s>]/.test(source)) return null;
  const doc = new DOMParser().parseFromString(trustedHTML(source), 'text/html');
  const math = doc.querySelector('math');
  return math ? mathmlToLatex(math) : null;
}

export type TextMathSegment =
  { type: 'text'; text: string } | { type: 'math'; latex: string; display: boolean };

/**
 * Splits plain text into text and math using `$$…$$`, `\[…\]` (display), `\(…\)` and `$…$` (inline).
 * `$…$` needs non-space next to both dollars and no digit right after the closing one,
 * so prices like "$5 and $10" stay text.
 */
export function splitTextMath(text: string): TextMathSegment[] {
  const pattern =
    /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<![\\$\w])\$(?=\S)([^$\n]*?\S)\$(?![\d$])/g;
  const out: TextMathSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    const index = m.index ?? 0;
    if (index > last) out.push({ type: 'text', text: text.slice(last, index) });
    const display = m[1] !== undefined || m[2] !== undefined;
    const latex = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').trim();
    if (latex) out.push({ type: 'math', latex, display });
    else out.push({ type: 'text', text: m[0] });
    last = index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

/** True when the text contains at least one math delimiter pair. */
export const hasTextMath = (text: string): boolean =>
  splitTextMath(text).some((s) => s.type === 'math');

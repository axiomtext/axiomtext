import { t } from '@axiomtext/i18n';
import { loadMathLive } from './mathlive';

/** How the user types equations as text. AsciiMath (`sqrt(x)/2`) is converted to LaTeX. */
export type MathInputFormat = 'latex' | 'asciimath';

let lastFormat: MathInputFormat = 'latex';
/** The format the user picked last (remembered for the page session). */
export const getLastFormat = (): MathInputFormat => lastFormat;
export const setLastFormat = (format: MathInputFormat): void => {
  lastFormat = format;
};

export interface Converters {
  toLatex(ascii: string): string;
  toAscii(latex: string): string;
}
let converters: Converters | null = null;

/** AsciiMath ↔ LaTeX conversion (uses MathLive, loaded on demand). */
export async function loadConverters(): Promise<Converters | null> {
  if (converters) return converters;
  const ml = await loadMathLive();
  if (!ml) return null;
  converters = {
    toLatex: (ascii) => ml.convertAsciiMathToLatex(ascii),
    toAscii: (latex) => ml.convertLatexToAsciiMath(latex),
  };
  return converters;
}
export const getConverters = (): Converters | null => converters;

/** "LaTeX | AsciiMath" switch (a radio group). */
export function createFormatToggle(
  initial: MathInputFormat,
  onChange: (format: MathInputFormat) => void,
): { element: HTMLElement; set(format: MathInputFormat): void } {
  const element = document.createElement('div');
  element.className = 'ax-math-editor__formats';
  element.setAttribute('role', 'radiogroup');
  element.setAttribute('aria-label', t('Input format'));
  const buttons = (['latex', 'asciimath'] as const).map((value) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ax-math-editor__format';
    b.setAttribute('role', 'radio');
    b.textContent = value === 'latex' ? 'LaTeX' : 'AsciiMath';
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => onChange(value));
    element.append(b);
    return [value, b] as const;
  });
  const set = (format: MathInputFormat): void => {
    for (const [value, b] of buttons) b.setAttribute('aria-checked', String(value === format));
  };
  set(initial);
  return { element, set };
}

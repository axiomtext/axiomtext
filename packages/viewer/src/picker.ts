/**
 * The highlight colour picker shared by the editor's comment UI and axiomtext/viewer:
 * preset colours, any colour (grid, hex, or the system picker), and whether to colour the
 * background or only underline the text.
 */
import { t } from '@axiomtext/i18n';
import {
  COMMENT_COLORS,
  hexToRgba,
  isPreset,
  normalizeColor,
  PRESET_HEX,
} from '@axiomtext/plugin-comments/data';
import type { CommentColor, PresetColor } from '@axiomtext/plugin-comments/data';

export interface ColorChoice {
  color: CommentColor;
  /** Colour the background (true) or only underline (false). */
  fill: boolean;
}

export interface ColorPickerOptions {
  value: ColorChoice;
  onChange(value: ColorChoice): void;
  /** Presets offered. Default: all six. */
  colors?: readonly PresetColor[];
  /** Show the "Highlight background" switch. Default: true. */
  showFill?: boolean;
}

const NAMES: Record<PresetColor, string> = {
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  pink: 'Pink',
  purple: 'Purple',
  orange: 'Orange',
};

/** 24 colours around the colour wheel, a strong and a soft row. */
const GRID: string[] = (() => {
  const toHex = (h: number, s: number, l: number): string => {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number): string => {
      const k = (n + h / 30) % 12;
      const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(c * 255)
        .toString(16)
        .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };
  const out: string[] = [];
  for (const [s, l] of [
    [0.85, 0.5],
    [0.75, 0.72],
  ] as const) {
    for (let h = 0; h < 360; h += 30) out.push(toHex(h, s, l));
  }
  return out;
})();

const node = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
};

/** The swatch colour shown for a choice (presets use their theme-aware CSS variable). */
export const swatchColor = (color: CommentColor): string =>
  isPreset(color) ? `var(--ax-hl-${color}-line, ${PRESET_HEX[color]})` : color;

export function createColorPicker(options: ColorPickerOptions): {
  element: HTMLElement;
  value(): ColorChoice;
} {
  let value: ColorChoice = { color: normalizeColor(options.value.color), fill: options.value.fill };
  const presets = options.colors?.length ? options.colors : COMMENT_COLORS;
  const element = node('div', { class: 'ax-hl-picker' });
  const dots = node('div', {
    class: 'ax-color-dots',
    role: 'radiogroup',
    'aria-label': t('Highlight color'),
  });

  const presetButtons = presets.map((color) => {
    const b = node('button', {
      type: 'button',
      class: 'ax-color-dot',
      role: 'radio',
      'data-color': color,
      'aria-label': t(NAMES[color]),
      title: t(NAMES[color]),
    });
    b.addEventListener('click', () => set({ ...value, color }));
    return b;
  });
  const custom = node('button', {
    type: 'button',
    class: 'ax-color-dot ax-color-dot--custom',
    role: 'radio',
    'aria-label': t('Custom color'),
    title: t('Custom color'),
    'aria-expanded': 'false',
  });
  dots.append(...presetButtons, custom);

  // Any colour: a grid, the system picker and a hex field.
  // Wrapped so it can slide open (grid rows animate from 0 to the content's height).
  const panel = node('div', { class: 'ax-hl-picker__custom' });
  const collapse = node('div', { class: 'ax-collapse ax-hl-picker__more' }, [
    node('div', {}, [panel]),
  ]);
  const grid = node('div', {
    class: 'ax-hl-picker__grid',
    role: 'group',
    'aria-label': t('More colors'),
  });
  const cells = GRID.map((hex) => {
    const b = node('button', {
      type: 'button',
      class: 'ax-hl-picker__cell',
      'aria-label': hex,
      title: hex,
      'aria-pressed': 'false',
      'data-hex': hex,
    });
    b.style.setProperty('--ax-cell', hex);
    b.addEventListener('click', () => set({ ...value, color: hex as CommentColor }));
    return b;
  });
  grid.append(...cells);
  const system = node('input', {
    type: 'color',
    class: 'ax-hl-picker__system',
    'aria-label': t('Pick a color'),
  });
  const hexField = node('input', {
    type: 'text',
    class: 'ax-hl-picker__hex',
    inputmode: 'text',
    spellcheck: 'false',
    maxlength: '7',
    placeholder: '#1e88e5',
    'aria-label': t('Hex color'),
  });
  system.addEventListener('input', () => set({ ...value, color: system.value as CommentColor }));
  hexField.addEventListener('input', () => {
    const v = hexField.value.trim();
    const ok = /^#?[0-9a-f]{6}$/i.test(v) || /^#?[0-9a-f]{3}$/i.test(v);
    hexField.setAttribute('aria-invalid', String(!ok && v.length >= 4));
    if (ok) set({ ...value, color: normalizeColor(v.startsWith('#') ? v : `#${v}`) }, false);
  });
  panel.append(grid, node('div', { class: 'ax-hl-picker__row' }, [system, hexField]));

  const setOpen = (open: boolean): void => {
    collapse.classList.toggle('is-open', open);
    if (open) collapse.removeAttribute('inert');
    else collapse.setAttribute('inert', '');
    custom.setAttribute('aria-expanded', String(open));
  };
  custom.addEventListener('click', () => setOpen(!collapse.classList.contains('is-open')));

  element.append(dots, collapse);

  // Background or underline only, with a live preview of the result.
  const preview = node('span', { class: 'ax-hl-picker__preview', 'aria-hidden': 'true' }, ['Aa']);
  let fillBox: HTMLInputElement | null = null;
  const footer = node('div', { class: 'ax-hl-picker__footer' });
  if (options.showFill !== false) {
    const box = node('input', { type: 'checkbox', role: 'switch', class: 'ax-switch__input' });
    box.addEventListener('change', () => set({ ...value, fill: box.checked }));
    fillBox = box;
    footer.append(
      node('label', { class: 'ax-switch' }, [
        box,
        node('span', { class: 'ax-switch__track', 'aria-hidden': 'true' }),
        t('Highlight background'),
      ]),
    );
  }
  footer.append(preview);
  element.append(footer);

  const render = (updateHex = true): void => {
    for (const b of presetButtons)
      b.setAttribute('aria-checked', String(b.dataset['color'] === value.color));
    for (const c of cells) c.setAttribute('aria-pressed', String(c.dataset['hex'] === value.color));
    const isCustom = !isPreset(value.color);
    custom.setAttribute('aria-checked', String(isCustom));
    custom.style.setProperty('--ax-custom', isCustom ? value.color : 'transparent');
    custom.classList.toggle('has-value', isCustom);
    if (isCustom) {
      system.value = value.color;
      if (updateHex) {
        hexField.value = value.color;
        hexField.removeAttribute('aria-invalid');
      }
    }
    setHighlightVars(preview, value.color);
    preview.toggleAttribute('data-line', !value.fill);
    if (fillBox) fillBox.checked = value.fill;
  };

  function set(next: ColorChoice, updateHex = true): void {
    value = { color: normalizeColor(next.color), fill: next.fill };
    render(updateHex);
    options.onChange(value);
  }

  setOpen(!isPreset(value.color));
  render();
  return { element, value: () => value };
}

// ── Shared by the comment threads in the editor and in axiomtext/viewer ──

/** Up to two initials ("Sakibul Haque" → "SH"). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = (w: string | undefined): string => (w ? ([...w][0] ?? '') : '');
  const out = words.length > 1 ? first(words[0]) + first(words[words.length - 1]) : first(words[0]);
  return out.toUpperCase() || '?';
}

/** A round avatar with initials in a colour picked from the name (same name, same colour). */
export function avatar(name: string, size = 28): HTMLElement {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) | 0;
  const el = node('span', { class: 'ax-avatar', 'aria-hidden': 'true' }, [initials(name)]);
  el.style.setProperty('--ax-avatar-hue', String(Math.abs(hash) % 360));
  el.style.setProperty('--ax-avatar-size', `${size}px`);
  return el;
}

/** Sets `--ax-hl` / `--ax-hl-line` on an element for a highlight colour. */
export function setHighlightVars(el: HTMLElement, color: CommentColor): void {
  el.style.setProperty(
    '--ax-hl',
    isPreset(color) ? `var(--ax-hl-${color})` : hexToRgba(color, 0.35),
  );
  el.style.setProperty('--ax-hl-line', swatchColor(color));
}

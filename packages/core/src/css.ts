/**
 * Strict validators for user-controlled CSS values written into `style` attributes (SEC-001).
 * Anything that doesn't match is rejected, so no `url()`, `expression()`, `;` or quotes can slip in.
 */

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNC =
  /^(?:rgb|rgba|hsl|hsla)\(\s*[\d.%]+(?:deg)?\s*(?:,\s*|\s+)[\d.%]+\s*(?:,\s*|\s+)[\d.%]+\s*(?:(?:,|\/)\s*[\d.%]+\s*)?\)$/i;
const NAMED = /^[a-z]{3,20}$/i;

/** Returns a safe CSS color (hex, rgb[a], hsl[a] or a named color) or null. */
export function sanitizeColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (HEX.test(v) || FUNC.test(v)) return v.toLowerCase();
  if (NAMED.test(v) && !/^(inherit|initial|unset|revert|expression|url)$/i.test(v))
    return v.toLowerCase();
  return null;
}

const SIZE = /^(?:\d{1,3}(?:\.\d{1,2})?)(?:px|pt|em|rem|%)$/;
const KEYWORD_SIZES = ['xx-small', 'x-small', 'small', 'medium', 'large', 'x-large', 'xx-large'];

/** Returns a safe font size (`14px`, `1.2em`, `120%`, `large`) or null. */
export function sanitizeFontSize(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return SIZE.test(v) || KEYWORD_SIZES.includes(v) ? v : null;
}

const FAMILY_PART = /^(?:"[a-z0-9 \-_]{1,60}"|'[a-z0-9 \-_]{1,60}'|[a-z0-9 \-_]{1,60})$/i;

/** Returns a safe font-family list (letters, digits, spaces, dashes, quotes per name) or null. */
export function sanitizeFontFamily(value: string | null | undefined): string | null {
  if (!value) return null;
  const parts = value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.length > 8 || !parts.every((p) => FAMILY_PART.test(p)))
    return null;
  return parts.join(', ');
}

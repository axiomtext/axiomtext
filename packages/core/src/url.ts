/** URL schemes allowed in links by default (SEC-001). */
export const DEFAULT_ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'] as const;

// Characters browsers ignore when parsing a scheme (used to hide "javascript:").
const IGNORED_CHARS = new RegExp(
  // eslint-disable-next-line no-control-regex -- control characters are exactly what we strip
  '[\\u0000-\\u0020\\u007f-\\u009f\\u200b-\\u200f\\u2028\\u2029\\ufeff]',
  'g',
);

/**
 * Returns a safe URL or `null` if it must be rejected.
 * Relative URLs and fragments are allowed; any explicit scheme must be on the allowlist.
 */
export function sanitizeUrl(
  raw: string,
  allowedProtocols: readonly string[] = DEFAULT_ALLOWED_PROTOCOLS,
): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const normalized = trimmed.replace(IGNORED_CHARS, '').toLowerCase();
  const schemeMatch = /^([a-z][a-z0-9+.-]*):/.exec(normalized);
  if (!schemeMatch) {
    // No scheme: relative path, query, fragment or protocol-relative URL.
    return trimmed;
  }
  const protocol = `${schemeMatch[1] ?? ''}:`;
  return allowedProtocols.includes(protocol) ? trimmed : null;
}

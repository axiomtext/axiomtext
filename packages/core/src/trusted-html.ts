/**
 * Trusted Types support (SEC-002). Pages that enforce `require-trusted-types-for 'script'`
 * reject plain strings in innerHTML / DOMParser. AxiomText only passes HTML it produced itself
 * (KaTeX output with `trust: false`) or parses clipboard HTML into an inert document, so it uses
 * one named policy. Allow it in your CSP with: `trusted-types axiomtext`.
 */
type Policy = { createHTML(input: string): unknown };
let policy: Policy | null | undefined;

export const TRUSTED_TYPES_POLICY = 'axiomtext';

export function trustedHTML(html: string): string {
  if (policy === undefined) {
    const tt = (globalThis as { trustedTypes?: { createPolicy?(n: string, r: object): Policy } })
      .trustedTypes;
    try {
      policy = tt?.createPolicy?.(TRUSTED_TYPES_POLICY, { createHTML: (s: string) => s }) ?? null;
    } catch {
      policy = null; // name not allowed by the page's CSP, or already created
    }
  }
  return (policy ? policy.createHTML(html) : html) as string;
}

/**
 * True when the page enforces Trusted Types (`require-trusted-types-for 'script'`), so plain
 * strings can't be assigned to innerHTML. Used to skip third-party code that does that.
 */
let enforced: boolean | undefined;
export function trustedTypesEnforced(): boolean {
  if (enforced !== undefined) return enforced;
  if (typeof document === 'undefined' || !('trustedTypes' in globalThis)) return false;
  try {
    // One probe per page; the browser logs it as a blocked action when enforcement is on.
    document.createElement('div').innerHTML = '';
    enforced = false;
  } catch {
    enforced = true;
  }
  return enforced;
}

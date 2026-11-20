type Attrs = Record<string, string | boolean | undefined>;

/** Small helper to create elements without innerHTML (keeps the UI XSS-safe). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children) {
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

let idCounter = 0;
/** Unique ids for ARIA relationships. */
export function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

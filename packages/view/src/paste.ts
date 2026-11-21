import { trustedHTML } from '@axiomtext/core';

/**
 * Clipboard HTML cleanup (CLP-001, CLP-002). Runs before the schema parses pasted HTML, which
 * already drops anything it doesn't know (scripts, event handlers, unknown tags/attributes).
 * This removes junk that would otherwise turn into visible text or stray formatting.
 */
const DROP_TAGS =
  'style, script, meta, link, title, xml, template, noscript, iframe, object, embed';

export function cleanPastedHTML(html: string): string {
  // Comments: Windows clipboard markers, Word conditional comments (<!--[if !supportLists]-->).
  let out = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, '');
  // Office namespace tags (<o:p>, <w:sdt> …) carry no content of their own.
  out = out.replace(/<\/?[a-z]+:[a-z]+[^>]*>/gi, '');
  if (typeof DOMParser === 'undefined') return out;
  const doc = new DOMParser().parseFromString(trustedHTML(out), 'text/html');
  doc.querySelectorAll(DROP_TAGS).forEach((el) => el.remove());
  // Word list bullets/numbers typed as text ("·", "1.") next to real list markup.
  doc.querySelectorAll<HTMLElement>('[style*="mso-list"]').forEach((el) => {
    if (/mso-list:\s*ignore/i.test(el.getAttribute('style') ?? '')) el.remove();
  });
  // Hidden content stays hidden.
  doc
    .querySelectorAll<HTMLElement>('[style*="display:none"], [style*="display: none"], [hidden]')
    .forEach((el) => el.remove());
  return doc.body.innerHTML;
}

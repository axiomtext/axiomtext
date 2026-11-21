---
title: Showing content on your website
description: Make saved HTML look exactly like it does in the editor.
---

`editor.getHTML()` returns clean HTML. To display it with the same look as in the editor (lists,
tables, image wrapping, text on both sides, maths), load two stylesheets and wrap the HTML:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css" />
<link rel="stylesheet" href="/path/to/@axiomtext/ui/content.css" />

<div class="axiomtext-content">
  <!-- the saved HTML -->
</div>
```

- `content.css` contains only content styles (no toolbar), about 4 KB gzip.
- Equations are already rendered in the saved HTML, so no JavaScript is needed.
- Dark mode: add `data-theme="dark"` to the wrapper or `<html>`, or let it follow the OS.
- On screens narrower than 640 px, columns (and "text on both sides") stack vertically.

:::caution[Sanitize on the server too]
The editor only produces safe HTML, but anyone can send anything to your API. Sanitize stored HTML
on the server (for example with DOMPurify or your framework's sanitizer), or store JSON and render
HTML from it.
:::

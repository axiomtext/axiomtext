---
title: CDN
description: Use AxiomText without a build step.
---

## ES module (recommended)

Math, Markdown and languages load only when needed.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@axiomtext/presets@0.1/dist/cdn/katex/katex.min.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@axiomtext/presets@0.1/dist/cdn/axiomtext.css" />

<div id="editor"></div>

<script type="module">
  import { createClassicEditor } from 'https://cdn.jsdelivr.net/npm/@axiomtext/presets@0.1/dist/cdn/axiomtext.js';
  const { editor } = createClassicEditor({ element: document.querySelector('#editor') });
</script>
```

## Classic script tag

One file with everything, available as the global `AxiomText`:

```html
<script src="https://cdn.jsdelivr.net/npm/@axiomtext/presets@0.1/dist/cdn/axiomtext.iife.js"></script>
<script>
  AxiomText.createClassicEditor({ element: document.querySelector('#editor') });
</script>
```

## Extras

```js
const translations = await AxiomText.loadTranslations('bn'); // or 'ar', 'hi', 'es', …
const { toMarkdown, fromMarkdown } = await AxiomText.loadMarkdown();
```

## Subresource Integrity

Pin an exact version (e.g. `@0.1.0`) and add the hash from that version's
`dist/cdn/sri.json`:

```html
<script src="…/axiomtext.iife.js" integrity="sha384-…" crossorigin="anonymous"></script>
```

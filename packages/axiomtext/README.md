# AxiomText

A free, MIT-licensed rich text editor for the web with a visual math editor built in. Click any
part of an equation and type; no LaTeX needed (but it's there if you want it).

**[Website and docs](https://axiomtext.dev)** · **[Live playground](https://axiomtext.dev/playground/)**

- Classic, inline and balloon editors, or headless with your own UI
- Headings, lists, to-do lists, quotes, links, fonts, colours, alignment, columns
- Tables with merged cells, header rows and resizing
- Images by upload, paste or drag, with captions and text wrapping (including text on both sides)
- Inline and block equations: visual editing, LaTeX with autocomplete, AsciiMath, and pasting maths
  from Wikipedia, ChatGPT and MathJax pages
- JSON, HTML and Markdown in and out; autosave; clean paste from Word and Google Docs
- Interface in 10 languages with right-to-left support; light and dark themes; keyboard accessible

## Install

```bash
npm install axiomtext
```

```js
import { createClassicEditor } from 'axiomtext';
import 'axiomtext/styles.css';

const { editor } = createClassicEditor({
  element: document.querySelector('#editor'),
  placeholder: 'Start writing…',
});

editor.on('change', () => save(editor.getJSON()));
```

One package, one stylesheet. Features you don't use are left out of your bundle, and the visual
math editor, Markdown and languages are only downloaded when first needed.

**React:** `npm install axiomtext @axiomtext/react` ·
**Vue:** `npm install axiomtext @axiomtext/vue`

## Saving and showing content

```js
const json = editor.getJSON(); // store this: lossless and versioned
const html = editor.getHTML(); // show it on your site
editor.setJSON(json); // load it back

import { toMarkdown, fromMarkdown } from 'axiomtext';
```

On pages that only show saved HTML, load `axiomtext/content.css` and wrap the HTML in
`<div class="axiomtext-content">`. Equations are already rendered, so no JavaScript is needed.

## Choosing features

```js
import { createClassicEditor, BasicStyles, Heading, List, MathPlugin } from 'axiomtext';

createClassicEditor({ element, plugins: [BasicStyles, Heading, List, MathPlugin] });
```

## Languages

```js
import bn from 'axiomtext/locales/bn'; // ar, bn, de, es, fr, hi, ja, pt, zh

createClassicEditor({ element, language: 'bn', translations: bn });
```

## CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/axiomtext@0.1/dist/cdn/axiomtext.css" />
<script src="https://cdn.jsdelivr.net/npm/axiomtext@0.1/dist/cdn/axiomtext.iife.js"></script>
<script>
  AxiomText.createClassicEditor({ element: document.querySelector('#editor') });
</script>
```

An ES-module build is at `dist/cdn/axiomtext.js`; integrity hashes are in `dist/cdn/sri.json`.

## License

MIT. Built on [ProseMirror](https://prosemirror.net), [KaTeX](https://katex.org) and
[MathLive](https://mathlive.io).

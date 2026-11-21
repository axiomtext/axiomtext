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
- Comments, readers' highlights and notes; marked books (your own mark types, stable ids,
  `getMarks()`, readers' states such as "learned"); marks on PDFs (`axiomtext/pdf`)
- Same HTML on your server without a browser (`axiomtext/server`); Bijoy Bangla paste
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

## Marked books

Teachers mark lines with your own mark types; students read them, filter by them and tap a mark
to practise the questions linked to it.

```js
const { editor } = createClassicEditor({
  element,
  marks: {
    types: [
      { id: 'IMPORTANT', label: 'গুরুত্বপূর্ণ', color: '#dc2626', style: 'fill' },
      { id: 'MARKED', label: 'দাগানো', color: '#2563eb', style: 'underline' },
      { id: 'PREVIOUS_YEAR', label: 'পূর্বের বছরের প্রশ্ন', color: '#ca8a04', style: 'box' },
    ],
    states: { learned: { fade: true, badge: '✓' } }, // how a student's own states look
    onClick: ({ id, data, page, rect }) => showQuestions(data?.questionIds, rect),
  },
});

editor.getMarks(); // every mark in order: [{ id, type, text, page, data, badge, anchor }]
editor.execute('setMarkState', 'm42', 'learned'); // faded, with a ✓ (not saved in the document)
editor.execute('setMarkFilter', { excludeStates: ['learned'] }); // "not learned yet"
```

Mark ids stay the same while the text is edited, undone and redone; a pasted copy or the second
half of a split mark gets a new id. The mark format is documented and stable, so a server in any
language can read marks from the saved JSON. Page-number blocks, a legend, reading filters and
the same marks on existing PDFs (`axiomtext/pdf`) are included. See
[Marked books](https://axiomtext.dev/guides/marked-books/).

## CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/axiomtext@0.4/dist/cdn/axiomtext.css" />
<script src="https://cdn.jsdelivr.net/npm/axiomtext@0.4/dist/cdn/axiomtext.iife.js"></script>
<script>
  AxiomText.createClassicEditor({ element: document.querySelector('#editor') });
</script>
```

An ES-module build is at `dist/cdn/axiomtext.js`; integrity hashes are in `dist/cdn/sri.json`.

## License

MIT. Built on [ProseMirror](https://prosemirror.net), [KaTeX](https://katex.org) and
[MathLive](https://mathlive.io).

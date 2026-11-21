# @axiomtext/convert

Markdown import and export for [AxiomText](https://axiomtext.dev) documents (GitHub-flavoured:
tables, task lists, strikethrough; maths as `$…$` / `$$…$$`).

```js
import { toMarkdown, fromMarkdown } from '@axiomtext/convert';

const md = toMarkdown(editor.getJSON());
editor.setJSON(fromMarkdown(md));
```

`toMarkdown(doc, { html: true })` keeps underline, sub/superscript, highlight and image sizes as
inline HTML. Raw HTML in imported Markdown is treated as text.

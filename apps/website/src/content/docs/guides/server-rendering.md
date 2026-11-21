---
title: Server rendering
description: Turn saved AxiomText documents into HTML on your server (Node, Deno, Bun, edge) for SEO pages and emails.
---

`axiomtext/server` renders saved JSON to the same HTML as `editor.getHTML()` in the browser, with
marks, comments, page numbers and pre-rendered equations. No browser or DOM library needed.

```js
import { renderHTML } from 'axiomtext/server';

const html = await renderHTML(savedJson, {
  markTypes,         // your mark types, for their colours and styles
  math: 'katex',     // default: equations as HTML (needs only KaTeX's CSS); 'latex' keeps \(…\)
  language: 'bn',    // labels such as "পৃষ্ঠা ২৩"
  translations: bn,  // from 'axiomtext/locales/bn'
});
```

Show it with `axiomtext/content.css` (which includes KaTeX's styles), exactly like
[showing content on your website](/guides/website-rendering/). Add `axiomtext/viewer` if readers
should tap marks and comments.

The server entry also has the data helpers, so you can work with documents without an editor:

| Function | What it gives you |
| --- | --- |
| `listMarks(json)` | Every mark with its type, text, data, badge and page. |
| `listPages(json)` | Every page-number block. |
| `listCommentThreads(json)` | Every comment thread (for notifications). |
| `toMarkdown(json)`, `fromMarkdown(md)` | Markdown in and out. |
| `convertBijoy(text)` | Legacy Bijoy (SutonnyMJ) Bangla to Unicode, for import scripts. |

## Emails

Email clients ignore stylesheets, so inline the CSS before sending (for example with
[juice](https://github.com/Automattic/juice)), and pass `math: 'latex'` if your email shouldn't
contain KaTeX's markup.

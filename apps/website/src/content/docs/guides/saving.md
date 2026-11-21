---
title: Saving & loading
description: JSON, HTML and Markdown, and autosave.
---

| Format | Get | Set | Use it for |
|---|---|---|---|
| JSON | `editor.getJSON()` | `editor.setJSON(json)` or `content` option | Storing in your database (lossless, versioned) |
| HTML | `editor.getHTML()` | `editor.insertHTML(html)` | Showing on your website, email |
| Markdown | `toMarkdown(json)` | `fromMarkdown(md)` | Git-based content, READMEs, chat apps |
| Text | `editor.getText()` | `editor.insertText(text)` | Search indexes, previews |

```js
import { toMarkdown, fromMarkdown } from 'axiomtext';

const md = toMarkdown(editor.getJSON());           // GitHub-flavoured Markdown, maths as $…$
editor.setJSON(fromMarkdown('# Hello\n\n$x^2$'));  // tables, task lists and maths supported
```

`toMarkdown(json, { html: true })` keeps underline, sub/superscript, highlight and image sizes as
inline HTML.

## Autosave

```js
createClassicEditor({ element, autosave: true });
```

`true` keeps a draft in the browser and restores it when the page opens without `content`. The
status bar shows **Saving…** / **Saved**. To save to your server instead:

```js
createClassicEditor({
  element,
  content: await loadFromServer(),
  autosave: {
    delay: 2000,
    save: (json) => fetch('/api/doc/42', { method: 'PUT', body: JSON.stringify(json) }),
  },
});
```

Saves never overlap; failed saves are retried with the next change, and pending changes are saved
when the tab is hidden.

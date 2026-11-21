---
title: PDF annotation
description: Mark up an existing PDF with the same marks, highlights and notes as AxiomText documents, on the web and in Flutter.
---

Have the textbook as a PDF? Teachers can mark it without retyping it, and students read it with
those marks, add their own highlights and notes, and tap a mark to practise. The marks, mark data,
highlights and anchors are the same as in [marked books](/guides/marked-books/).

PDF mode uses [pdf.js](https://mozilla.github.io/pdf.js/) (Mozilla, Apache-2.0). Install it next
to AxiomText; apps that don't use PDFs don't download it.

```bash
npm install axiomtext pdfjs-dist
```

```js
import { createPdfAnnotator } from 'axiomtext/pdf';
import 'axiomtext/content.css';

const pdf = await createPdfAnnotator(document.querySelector('#book'), {
  source: '/books/biology-3.pdf', // a URL, or the file's bytes
  markTypes,                      // the same mark types as your documents
  mode: isTeacher ? 'mark' : 'read',
  annotations: await api.loadAnnotations(bookId),
  onChange: (items) => api.saveAnnotations(bookId, items),
  onMarkClick: ({ annotation, rect }) => showQuestions(annotation.data, rect),
  selectionActions: [{ id: 'ask', label: 'Ask AI' }],
  onSelectionAction: ({ text, page }) => askAi(text, page),
});

pdf.scrollToPage(23);
pdf.reveal(annotationId);
```

- **Teachers** (`mode: 'mark'`) select text and pick a mark type. Tapping a mark offers to remove it.
- **Readers** select text to highlight it in any colour (or underline), add a note, or use your
  selection actions.
- Pages render as they come into view, so long books open fast.

If your bundler doesn't find pdf.js's worker on its own, pass
`workerSrc: new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href`.

## What's stored

Each annotation is plain JSON, ready for your database:

```json
{
  "id": "m8f2…",
  "kind": "mark",
  "type": "pyq",
  "page": 23,
  "anchor": { "exact": "osmosis", "prefix": "Water enters the roots by ", "suffix": " and travels", "start": 412, "end": 419 },
  "rects": [{ "x": 0.41, "y": 0.18, "w": 0.12, "h": 0.022 }],
  "data": { "questionIds": ["q4", "q5"] },
  "created": 1795254881000
}
```

`rects` place it on the page (as fractions of the page size, so any zoom works). `anchor` quotes
the text with some context, so a new edition of the file can be matched again. Highlights have
`kind: "highlight"`, a `color` and an optional `note`.

To turn the marks into rows, `annotator.getMarks()` (or `listPdfMarks(annotations)` on your server)
gives them in the same [mark format](/guides/marked-books/#the-mark-format) as documents:
`{ id, type, text, page, data, badge, anchor }`, in reading order, without readers' highlights.
The text is `anchor.exact` and the page is `page`, so a server in another language can also read
them straight from this JSON.

## Flutter

```dart
AxiomPdfView(
  bytes: pdfBytes,
  markTypes: markTypes,
  markMode: isTeacher,
  annotations: [for (final m in saved) AxiomPdfAnnotation.fromMap(m)],
  onChanged: (items) => save([for (final a in items) a.toMap()]),
  onMarkTap: (mark) => showQuestions(mark.data),
);
```

The PDF opens inside the editor engine bundled with the package (pdf.js is included and loads
only when a PDF is opened), so it works offline and the marks behave exactly as on the web.

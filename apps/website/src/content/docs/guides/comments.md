---
title: Comments & highlights
description: Comment threads while writing, and readers' own highlights and notes while reading.
---

AxiomText has two ways to mark up text, both free:

- **Comments** are written while editing: select text, comment, reply, resolve. They're saved
  inside the document, so everyone who opens it sees them.
- **Highlights** are made by readers on content they can only read, like marking up a book:
  colours and private notes. Your app stores them per reader.

## Comments

Turn comments on by saying who is commenting:

```js
import { createClassicEditor } from 'axiomtext';

const { editor } = createClassicEditor({
  element,
  comments: {
    author: { name: 'Ana Silva', id: 'user-42' },
    onChange: (threads) => notifyPeople(threads), // optional
  },
});
```

This adds two buttons: **Comment** (or <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Alt</kbd>+<kbd>M</kbd>)
for the selected text, and **Comments**, which opens the list of all threads with **Open** and
**Resolved** tabs. Clicking commented text opens its thread: reply, edit or delete your own
messages, resolve or reopen.

### Colours

Each comment (and each reader highlight) has a colour and a **Highlight background** switch,
on by default. The colour button in the comment box opens the picker: six presets that suit
light and dark themes, or **any colour** from a palette, the system colour picker or a hex code.
Turn **Highlight background** off to only underline the text. A live preview shows the result,
and the thread's colour can be changed later from its balloon.

```js
editor.execute('addComment', { text: 'Check this', author, color: '#1e88e5', fill: false });
editor.execute('setCommentColor', threadId, 'green'); // a preset or '#rrggbb'
editor.execute('setCommentFill', threadId, true);
```

Custom colours are written into the saved HTML (`data-color="custom"` and inline CSS
variables), so they show on any page that uses `axiomtext/content.css`.

Comment threads are saved in the document (`editor.getJSON()` and `getHTML()`): nothing else
to store. Text in several threads at once is fine, and if commented text is deleted its thread
goes with it, and comes back on undo.

| Option | What it does |
| --- | --- |
| `author` | `{ name, id? }`: the person commenting. `id` decides whose messages they may edit. |
| `moderator` | May edit and delete everyone's messages. |
| `only` | Commenting only: reviewers can comment but not change the text. |
| `panel` | An element of yours to show the list of threads in (like a sidebar). |
| `panelOpen` | Open the list when the editor starts. |
| `onChange` | Called with every thread whenever comments change. |

Commands, for your own buttons: `addComment`, `replyToComment`, `editComment`,
`deleteComment`, `deleteCommentThread`, `resolveComment`, `setCommentColor`, `setCommentFill`,
`selectComment`.
On your server, `listCommentThreads(json)` lists the threads of a saved document without an
editor (for notifications, for example).

### On your website

Saved HTML keeps the highlights. To show a comment's thread when it's clicked, add the viewer:

```js
import { createViewer } from 'axiomtext/viewer'; // about 5 KB gzip, without the editor
import 'axiomtext/content.css';

createViewer(document.querySelector('.axiomtext-content'));
```

Without a bundler:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/axiomtext@0.1/dist/cdn/content.css" />
<script src="https://cdn.jsdelivr.net/npm/axiomtext@0.1/dist/cdn/viewer.js"></script>
<script>
  AxiomViewer.createViewer(document.querySelector('.axiomtext-content'));
</script>
```

## Readers' highlights and notes

Let readers mark up content they're reading. Selecting text shows the colour picker (presets or
any colour, background or underline) and **Add note**; tapping a highlight shows its note, to
edit, recolour or delete.

```js
const viewer = createViewer(document.querySelector('.axiomtext-content'), {
  highlights: {
    items: await api.loadHighlights(articleId), // this reader's saved highlights
    onChange: (items) => api.saveHighlights(articleId, items),
  },
});

viewer.notebook(); // [{ text, highlight: { color, fill, note }, orphaned }], in reading order
viewer.reveal(id); // scroll to a highlight and open its note
```

The same works in a read-only editor:
`createClassicEditor({ element, editable: false, highlights: { items, onChange } })`.

**They don't change the page.** Highlights are drawn with the browser's CSS Highlight API, so
the content and its HTML stay exactly as published.

**They survive edits.** Each highlight remembers its words, a little text on each side and its
position (the W3C Web Annotation approach used by Hypothesis). If the author changes the
article later, highlights move with their words; if the words are gone, `notebook()` marks the
highlight `orphaned` instead of putting it in the wrong place.

## Flutter

```dart
AxiomTextEditor(
  commentAuthor: const AxiomCommentAuthor(name: 'Ana Silva', id: 'user-42'),
  onCommentsChanged: (threads) => notify(threads),
);

// A reading view with the reader's own highlights:
AxiomTextEditor(
  readOnly: true,
  initialContent: AxiomContent.json(chapter),
  highlights: savedForThisReader,
  onHighlightsChanged: (items) => save([for (final h in items) h.toMap()]),
);
```

The controller has `getComments`, `addComment`, `replyToComment`, `resolveComment`,
`setCommentStyle`, `deleteCommentThread`, `toggleCommentsPanel`, `getHighlights` and
`setHighlights`. Colours are presets (`AxiomHighlightColor.blue`) or any colour:

```dart
await controller.addComment(
  'Check this',
  color: AxiomHighlightColor.custom(const Color(0xFF1E88E5)),
  fill: false, // underline only
);
```

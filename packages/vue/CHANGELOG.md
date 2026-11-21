# @axiomtext/vue

## 0.3.0

### Minor Changes

- Marked books, PDFs, Bangla and server rendering:

  - **Marks:** your own mark types (`marks: { types }`, fill / underline / double underline / box)
    with app data, badges and a click event; a Mark menu (Alt+1…9, Alt+0 removes); commands
    `setMark`, `removeMark`, `setMarkData`, `setMarkBadge`, `setMarkType`, `selectMark`;
    `listMarks(json)`.
  - **Page numbers:** a page block ("Page 23", in the reader's digits), `insertPage`,
    `setPageNumber`, `scrollToPage`, `listPages(json)`; marks and highlights report their page.
  - **Reading:** a legend with counts and filters ("Only marked" folds other paragraphs), and
    `selectionActions` / `onSelectionAction` for your own buttons on selected text — in read-only
    editors and on websites (`axiomtext/viewer`).
  - **`axiomtext/pdf`:** mark, highlight and annotate existing PDFs with pdf.js (optional peer
    dependency `pdfjs-dist`).
  - **`axiomtext/server`:** `renderHTML(json, { markTypes })`, the same HTML as `getHTML()` without a
    browser, plus `listMarks`, `listPages`, `listCommentThreads`.
  - **Bijoy → Unicode:** pasted SutonnyMJ / Bijoy Bangla becomes Unicode with a Keep original notice;
    `convertBijoy(text)` for import scripts.
  - **Long documents** open faster (lazy equations, off-screen blocks skip layout).
  - Read-only editors no longer show the formatting toolbar.

### Patch Changes

- Updated dependencies
  - axiomtext@0.3.0

## 0.2.0

### Minor Changes

- Comments and readers' highlights, free:

  - **Comments** (`comments: { author }`): select text → Comment; threads with replies, editing,
    resolve/reopen, a comments panel with Open and Resolved tabs, comment-only mode for reviewers.
    Threads are saved inside the document (JSON and HTML). Commands and `listCommentThreads(json)`
    for apps and servers.
  - **Readers' highlights and notes** on read-only content: colours, private notes, a notebook
    list. Drawn with the CSS Highlight API (the page is not changed) and anchored by quote,
    context and position so they survive later edits. Stored by your app per reader.
  - **`axiomtext/viewer`** (about 5 KB gzip, also `dist/cdn/viewer.js`): for websites showing saved
    content: comment threads open on click, and readers can highlight and take notes.

- Any highlight colour, and a redesigned comments UI:

  - Comments and reader highlights can use **any colour** (palette, system colour picker or hex),
    not just the six presets, and a **Highlight background** switch (on by default) to underline
    the text instead. New `fill` option on `addComment`, new `setCommentFill` command,
    `setCommentColor` accepts `#rrggbb`; reader highlights get an optional `fill`.
  - Redesigned comment box, thread balloons and comments panel: avatars, colour-tinted quotes,
    a live preview, a sliding tab indicator and smooth animations (reduced-motion respected).
  - Fix: the thread balloon stays next to its text after the colour changes, and the reader's
    menu no longer closes when scrolling inside it.

### Patch Changes

- Fix: with several inline or balloon editors on one page, opening the math bar (or a popover) in
  one editor made every editor show its floating toolbar on top of it. Shared overlays now count
  as "inside" only for the editor that opened them.

  Pasting HTML whose text contains maths delimiters (`\(…\)`, `\[…\]`, `$…$`, `$$…$$`), as ChatGPT
  puts on the clipboard, now creates equations.

  The math bar and popovers now sit above floating toolbars, and the stacking order can be raised
  for apps with high modals: `--ax-z-toolbar` (1000), `--ax-z-overlay` (1100), `--ax-z-dialog` (1300).

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - axiomtext@0.2.0

## 0.1.1

- Now built on the single `axiomtext` package. Install with `npm install axiomtext @axiomtext/vue`.

## 0.1.0

### Minor Changes

- 4bd8d2c: First public alpha (v0.1.0) of AxiomText — a free, MIT-licensed rich text editor with a built-in visual math editor.

  - Editing: text styles, fonts, colours, alignment, indentation, headings, quotes, lists and to-dos, tables, images (upload, resize, captions, five text-wrapping modes, keyboard moving), links, columns, page breaks, Markdown shortcuts, undo/redo.
  - Math: inline and block equations, click-to-edit visual editor, LaTeX with autocomplete, AsciiMath, palettes, math keyboard, paste from MathML sources and `$…$` text, 500-equation test corpus.
  - Classic, inline and balloon editors; React and Vue components; CDN builds with SRI.
  - JSON, HTML and Markdown in and out; autosave; paste cleanup for Word, Google Docs and web pages.
  - 10 interface languages with right-to-left support; keyboard shortcuts dialog; WCAG 2.2 AA checked.
  - Strict CSP and Trusted Types compatible.

### Patch Changes

- Updated dependencies [4bd8d2c]
  - @axiomtext/core@0.1.0
  - @axiomtext/presets@0.1.0
  - @axiomtext/view@0.1.0

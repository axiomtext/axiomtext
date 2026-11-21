# axiomtext

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

## 0.1.1

- First release as one package. Everything that used to be split across `@axiomtext/presets`, `@axiomtext/ui`, `@axiomtext/core`, the plugin packages and others is now in `axiomtext`. One stylesheet, `axiomtext/styles.css`, now includes the equation (KaTeX) styles.

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
  - @axiomtext/convert@0.1.0
  - @axiomtext/core@0.1.0
  - @axiomtext/math@0.1.0
  - @axiomtext/plugin-basic-styles@0.1.0
  - @axiomtext/plugin-block-format@0.1.0
  - @axiomtext/plugin-blockquote@0.1.0
  - @axiomtext/plugin-columns@0.1.0
  - @axiomtext/plugin-font@0.1.0
  - @axiomtext/plugin-heading@0.1.0
  - @axiomtext/plugin-image@0.1.0
  - @axiomtext/plugin-link@0.1.0
  - @axiomtext/plugin-list@0.1.0
  - @axiomtext/plugin-table@0.1.0
  - @axiomtext/ui@0.1.0
  - @axiomtext/view@0.1.0

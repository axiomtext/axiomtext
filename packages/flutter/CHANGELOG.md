## 0.1.1

- No analyzer notices on Flutter 3.47+ (the `material.dart` / `cupertino.dart` deprecation);
  still works from Flutter 3.27.

## 0.1.0

First beta of the Flutter SDK.

- `AxiomTextEditor`: the full AxiomText editor (formatting, lists, tables, images, links,
  columns and the visual math editor), bundled in the package and working offline.
- `AxiomTextController`: read and write JSON, HTML and Markdown; run commands; undo/redo,
  focus, read-only; streams for changes, cursor state, focus and debounced content.
- Native toolbar in Material 3 and Cupertino styles, above the keyboard, with menus for text
  style, fonts, sizes, colours, alignment, tables and links. Or use the editor's own toolbar.
- Native math keyboard on Android and iOS: numbers, functions, Greek letters and symbols,
  LaTeX toggle.
- Photos from the library or camera; your own upload function, or embedded images.
- Theme from `ThemeData` (light and dark), language from the app locale (10 languages,
  right-to-left), accessibility labels on every control.
- Secure bridge: JSON messages on an allowlist, strict Content Security Policy, links never
  open inside the editor.
- `AxiomTextEditor.prewarm()` for an instant first open.
- Comments: `commentAuthor` turns on comment threads (reply, edit, resolve, list), saved in
  the document; `commentsOnly` for reviewers.
- Readers' highlights and notes on read-only content (`highlights`, `onHighlightsChanged`),
  anchored so they survive later edits.
- Any highlight colour (`AxiomHighlightColor.custom(color)`) and an optional background
  (`fill`) for comments and reader highlights; `setCommentStyle` to change them.

## 0.0.1

- Placeholder release reserving the `axiomtext` package name.

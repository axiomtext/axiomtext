## 0.2.1

- The Mark button is a marker pen (a bookmark looked like "save"), and its sheet shows each
  type's shortcut (Alt+1… / ⌥1…).
- `AxiomMarkType.defaults`: Important, Marked and Past exam question, as a starting set.
- Comment buttons are labelled "Add comment" and "All comments" (tooltip and screen reader).
- `controller.getMarks()` is a documented, stable format (id, type, text, page, data), and
  `getPdfMarks()` gives PDF marks in the same shape.
- Mark ids stay the same through edits, undo and redo, and when a mark is re-marked or retyped;
  a pasted copy or the second half of a split mark gets a new id.
- Readers' states: `controller.setMarkState(id, 'learned')`, `markStateStyles` (fade, badge),
  `markStates`, and `AxiomMarkFilter.query(excludeStates: ['learned'])`; also in
  `AxiomTextView`.

## 0.2.0

- **Marked books:** your own mark types (`markTypes`: label, colour, fill / underline / double /
  box) with app data, badges and taps (`onMarkTap`); the Mark menu (`AxiomToolbarItem.mark`,
  Alt+1…9); page-number blocks (`AxiomToolbarItem.page`, `insertPage`, `scrollToPage`); a legend
  and reading filters (`markFilter`, `setMarkFilter`).
- **Selection actions** for readers (`selectionActions`, `onSelectionAction`), and
  `controller.notebook()` / `revealHighlight()` for a "My notes" screen.
- **`AxiomPdfView`:** mark and highlight existing PDFs (pdf.js inside the bundled engine, offline).
- **`AxiomTextView`:** read-only content drawn with Flutter widgets, equations included, for long
  lists. Adds `flutter_math_fork` and `markdown` as dependencies.
- Pasted **Bijoy** (SutonnyMJ) Bangla becomes Unicode, with Keep original.
- Long chapters open faster (equations render near the screen; far paragraphs aren't laid out),
  `shrinkWrap` heights also shrink, and `AxiomTextEditor.prewarm(count: 3)`.
- Read-only editors no longer show the formatting toolbar.

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

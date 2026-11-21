---
title: Plugins
description: Feature packages and their commands.
---

Every editor gets all of these by default (`ALL_PLUGINS`). To build an editor with only some
features, import the ones you want from `axiomtext` and pass them to `plugins`:

```js
import { createClassicEditor, BasicStyles, Heading, List, MathPlugin } from 'axiomtext';

createClassicEditor({
  element,
  plugins: [BasicStyles, Heading, List, MathPlugin],
  toolbar: ['undo', 'redo', '|', 'blockStyle', 'bold', 'italic', '|', 'bulletedList', 'math'],
});
```

Run a command with `editor.execute('toggleBold')`, or `editor.execute('setHeading', 2)`.

| Feature | Import | Commands |
|---|---|---|
| Bold, italic and more | `BasicStyles` | `toggleBold`, `toggleItalic`, `toggleUnderline`, `toggleStrikethrough`, `toggleSubscript`, `toggleSuperscript`, `toggleCode`, `clearFormatting` |
| Headings | `Heading` | `setHeading(level)`, `setParagraph` |
| Lists | `List` | `toggleBulletList`, `toggleOrderedList`, `toggleTaskList`, `indentListItem`, `outdentListItem` |
| Quotes, lines, page breaks | `Blockquote`, `PageBreak` | `toggleBlockquote`, `insertHorizontalRule`, `insertPageBreak` |
| Links | `Link` | `setLink(href)`, `unsetLink` |
| Fonts and colours | `FontFamily`, `FontSize`, `TextColor`, `Highlight` | `setFontFamily`, `setFontSize`, `setTextColor`, `setHighlight` |
| Alignment and indent | `TextAlignment`, `Indent` | `setTextAlign`, `indentBlock`, `outdentBlock` |
| Tables | `Table` | `insertTable(rows, cols)`, `addTableRowBefore/After`, `addTableColumnBefore/After`, `deleteTableRow`, `deleteTableColumn`, `deleteWholeTable`, `mergeTableCells`, `splitTableCell`, `toggleTableHeaderRow`, `toggleTableHeaderColumn`, `setCellBackground` |
| Images | `Image`, `createImagePlugin(options)` | `insertImage(src, alt)`, `updateImage({ wrap, width, alt, caption })`, `deleteImage`, `uploadImages(files)`, `moveImage(direction)` |
| Columns | `Columns` | `insertColumns(count)`, `setColumnWidths(widths)`, `removeColumns` |
| Math | `MathPlugin` | `insertMath(latex?)`, `insertMathBlock(latex?)`, `editSelectedMath` |

## Headless

`createEditor` makes an editor with no toolbar, so you can build your own interface:

```js
import { createEditor, BasicStyles } from 'axiomtext';

const editor = createEditor({ element, plugins: [BasicStyles] });
myBoldButton.onclick = () => editor.execute('toggleBold');
editor.on('update', () => (myBoldButton.ariaPressed = editor.isActive('bold')));
```

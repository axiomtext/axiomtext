---
title: Plugins
description: Feature packages and their commands.
---

`@axiomtext/presets` includes all of them (`ALL_PLUGINS`). To pick features yourself, install the
packages and pass them to `plugins`.

| Package | Export | Commands |
|---|---|---|
| `@axiomtext/plugin-basic-styles` | `BasicStyles` | `toggleBold`, `toggleItalic`, `toggleUnderline`, `toggleStrikethrough`, `toggleSubscript`, `toggleSuperscript`, `toggleCode`, `clearFormatting` |
| `@axiomtext/plugin-heading` | `Heading` | `setHeading(level)`, `setParagraph` |
| `@axiomtext/plugin-list` | `List` | `toggleBulletList`, `toggleOrderedList`, `toggleTaskList`, `indentListItem`, `outdentListItem` |
| `@axiomtext/plugin-blockquote` | `Blockquote`, `PageBreak` | `toggleBlockquote`, `insertHorizontalRule`, `insertPageBreak` |
| `@axiomtext/plugin-link` | `Link` | `setLink(href)`, `unsetLink` |
| `@axiomtext/plugin-font` | `FontFamily`, `FontSize`, `TextColor`, `Highlight` | `setFontFamily`, `setFontSize`, `setTextColor`, `setHighlight` |
| `@axiomtext/plugin-block-format` | `TextAlignment`, `Indent` | `setTextAlign`, `indentBlock`, `outdentBlock` |
| `@axiomtext/plugin-table` | `Table` | `insertTable(rows, cols)`, `addTableRowBefore/After`, `addTableColumnBefore/After`, `deleteTableRow`, `deleteTableColumn`, `deleteWholeTable`, `mergeTableCells`, `splitTableCell`, `toggleTableHeaderRow`, `toggleTableHeaderColumn`, `setCellBackground` |
| `@axiomtext/plugin-image` | `Image`, `createImagePlugin(options)` | `insertImage(src, alt)`, `updateImage({ wrap, width, alt, caption })`, `deleteImage`, `uploadImages(files)`, `moveImage(direction)` |
| `@axiomtext/plugin-columns` | `Columns` | `insertColumns(count)`, `setColumnWidths(widths)`, `removeColumns` |
| `@axiomtext/math` | `MathPlugin` | `insertMath(latex?)`, `insertMathBlock(latex?)`, `editSelectedMath` |

Other packages: `@axiomtext/convert` (Markdown), `@axiomtext/i18n`, `@axiomtext/ui` (toolbars,
dialogs, styles), `@axiomtext/view` (headless editor without UI), `@axiomtext/core`.

## Headless

Build your own UI on top of `@axiomtext/view`:

```js
import { createEditor } from '@axiomtext/view';
import { BasicStyles } from '@axiomtext/plugin-basic-styles';

const editor = createEditor({ element, plugins: [BasicStyles] });
myBoldButton.onclick = () => editor.execute('toggleBold');
editor.on('update', () => (myBoldButton.ariaPressed = editor.isActive('bold')));
```

---
title: Editor API
description: Methods of the editor object.
---

Every editor type returns `{ editor, … }`. The `editor` object is the same in all of them.

```js
const { editor } = createClassicEditor({ element });
```

## Content

| Method | |
|---|---|
| `getJSON()` | The document as JSON (store this). |
| `setJSON(json)` | Replace the content (clears undo history). Older formats are upgraded. |
| `getHTML()` | The document as HTML (with rendered maths). |
| `getText()` | Plain text; blocks separated by blank lines. |
| `insertHTML(html)` | Insert at the cursor as if pasted: cleaned and filtered. |
| `insertText(text)` | Insert plain text as if pasted (`$x^2$` becomes an equation). |
| `getStats()` | `{ words, characters }`, language-aware. |

## Commands

| Method | |
|---|---|
| `execute(name, ...args)` | Run a command, e.g. `execute('setHeading', 2)`. Returns `false` if it can't run here. |
| `can(name, ...args)` | Whether a command could run now (for enabling buttons). |
| `commandNames` | All available command names. See [Plugins](/reference/plugins/). |
| `undo()`, `redo()`, `canUndo()`, `canRedo()` | History. |

## State

| Method | |
|---|---|
| `isActive(name, attrs?)` | Mark active (`'bold'`) or inside a block (`'heading', { level: 2 }`). |
| `isAncestor(name)` | Inside a node of this type at any depth (e.g. `'blockquote'`). |
| `getMarkAttrs(name)` | Attributes of a mark at the cursor, e.g. `getMarkAttrs('link')?.href`. |
| `getBlockAttrs()` | Attributes of the block at the cursor, e.g. `textAlign`. |
| `getSelectedNode()` | `{ type, attrs, element }` of a selected image/equation, or `null`. |
| `getSelectionState()` | `{ empty, emptyBlock, nodeSelected }`. |
| `getSelectionRect()` | Screen rectangle of the selection, for positioning your own popovers. |
| `hasFocus()` | Whether the text has focus. |

## Other

| Method | |
|---|---|
| `focus(position?)` | Focus; `'start'` or `'end'` also moves the cursor. |
| `setEditable(boolean)` | Switch read-only mode on or off. |
| `on(event, listener)` | `change`, `selectionChange`, `update`, `focus`, `blur`. Returns an unsubscribe function. |
| `dom` | The editable element. |
| `destroy()` | Remove the editor and its listeners. |

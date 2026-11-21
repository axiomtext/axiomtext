---
title: Options
description: Options for createClassicEditor, createInlineEditor and createBalloonEditor.
---

## All editor types

| Option | Type | Default | |
|---|---|---|---|
| `element` | `HTMLElement` | required | Where the editor goes. |
| `plugins` | `AxiomPlugin[]` | all features | Features. |
| `content` | `DocumentJSON` | empty | Starting content. |
| `placeholder` | `string` | | Shown when empty. |
| `editable` | `boolean` | `true` | `false` for read-only. |
| `ariaLabel` | `string` | `'Rich text editor'` | Accessible name of the text area. |
| `language` | `string` | `'en'` | Interface language (see [Languages](/guides/languages/)). |
| `translations` | `Record<string, string>` | | Texts for `language`. |
| `autosave` | `boolean \| AutosaveOptions` | off | See [Saving](/guides/saving/#autosave). |
| `icons` | `Record<name, SVG \| string>` | | Replace toolbar icons with your own SVGs. |
| `toolbar` | `ToolbarItemName[]` | see below | Toolbar buttons. |

## Classic editor only

| Option | Type | Default | |
|---|---|---|---|
| `statusBar` | `boolean` | `true` | Word and character count (and autosave status). |
| `document` | `boolean` | `false` | Paper-like centered page. |

## Toolbar

Item names: `undo`, `redo`, `blockStyle`, `fontFamily`, `fontSize`, `bold`, `italic`, `underline`,
`strikethrough`, `code`, `subscript`, `superscript`, `textColor`, `highlight`, `clearFormatting`,
`link`, `image`, `table`, `math`, `mathBlock`, `align`, `bulletedList`, `numberedList`, `todoList`,
`outdent`, `indent`, `blockquote`, `horizontalRule`, `pageBreak`, `shortcuts`, `more`, and `'|'`
for a separator. Buttons for features whose plugin isn't loaded are hidden automatically.

---
title: Introduction
description: What AxiomText is and what it includes.
---

AxiomText is a rich text editor for the web with a **visual math editor built in**. It is free and
open source under the MIT license, and everything runs in the browser: there is no server to host,
no license key and no usage limit.

## What's included

- **Text:** bold, italic, underline, strikethrough, sub/superscript, inline code, fonts, sizes,
  colours, highlight, alignment, indentation, clear formatting.
- **Blocks:** paragraphs, headings, quotes, bulleted, numbered and to-do lists, horizontal lines,
  page breaks, columns.
- **Tables:** insert from a grid, add/remove rows and columns, merge and split cells, header rows,
  cell colours, column resizing.
- **Images:** upload, paste, drag and drop, resize, alt text, captions, and five text-wrapping modes
  (in line, wrap left/right, break text, text on both sides). Move them with the arrow keys.
- **Math:** inline and block equations; click any part to edit visually; LaTeX with autocomplete;
  AsciiMath; palettes and a math keyboard; paste from Wikipedia, ChatGPT and MathJax pages.
- **Productivity:** Markdown shortcuts, Markdown import/export, autosave, word & character count,
  undo/redo, keyboard shortcuts dialog.
- **Everywhere:** classic, inline and balloon editors; React and Vue components; CDN builds;
  10 interface languages with right-to-left support; light and dark themes.
- **Safe by default:** every link, image, colour and pasted snippet is checked; works with strict
  Content Security Policies and Trusted Types.

## How it is built

AxiomText uses [ProseMirror](https://prosemirror.net) for editing, [KaTeX](https://katex.org) for
rendering maths and [MathLive](https://mathlive.io) for visual equation editing. All three are MIT
licensed. Math libraries load only when a document contains maths.

# Goal 1 — Progress

Status legend: ✅ done · 🟡 partial · ⏳ next

## M0 — Foundation ✅
Monorepo, CI (lint, types, unit, e2e ×3 browsers, size, licenses, CodeQL), ADRs 0001–0008, document format v1,
plugin system, playground, design tokens & UI kit, test corpora started.
Remaining small items carried into M1: performance benchmark harness, growing corpora (20 → 500 equations).

## M1 — v0.1 alpha "Core + Math" (in progress)

### Batch 1 (done)
| Feature | Status | Notes |
|---|---|---|
| CORE-001 Bold, italic, underline, strikethrough | ✅ | toolbar, shortcuts, markdown `**` `*` `~~` |
| CORE-002 Subscript, superscript, inline code | ✅ | `Mod-,` `Mod-.` `Mod-e`, markdown `` ` `` |
| CORE-011 Clear formatting | ✅ | `Mod-\` |
| CORE-014 Undo / redo | ✅ | toolbar commands are separate undo steps |
| CORE-015 Markdown shortcuts | ✅ | `#`, `-`, `1.`, `[ ]`, `>`, `---`, `**`, `*`, `~~`, `` ` ``, `$…$`, `$$` (Backspace undoes) |
| CORE-021 Horizontal line | 🟡 | page break ⏳ |
| CORE-023 Placeholder | ✅ | |
| BLK-001 Headings | ✅ | dropdown + `Mod-Alt-1…6` + `#` |
| BLK-002 Paragraph, blockquote | ✅ | `>` and `Mod-Shift-.` |
| LST-001 Bulleted & numbered lists | ✅ | Tab / Shift+Tab nesting, convert between types, start number |
| LST-002 To-do list | ✅ | animated checkbox, undoable |
| LNK-001 Insert/edit/remove link | ✅ | `Mod-K` form, link balloon (open/edit/unlink), unsafe URLs rejected |
| LNK-002 Auto-link | ✅ | typing and pasting URLs / e-mails |
| MATH-001 Inline & block equations | ✅ | toolbar, `Mod-Shift-M`, `Mod-Alt-M` |
| MATH-002 LaTeX input with live preview | ✅ | popover editor, quick templates |
| MATH-003 Visual (WYSIWYG) equation editor | ✅ | click any part of an equation and type; caret lands where you click; no LaTeX needed (MathLive, lazy-loaded) |
| MATH-004 Palettes | ✅ | Structures / Symbols / Greek tabs with rendered previews and fill-in slots |
| MATH-005 Virtual math keyboard | ✅ | Keyboard button; equation stays visible above it |
| MATH-038 Keyboard navigation in equations | ✅ | arrows/Tab move through slots and out of the equation; Enter saves; Esc cancels; Enter on a selected equation edits it |
| MATH-006 Markdown triggers | 🟡 | `$…$`, `$$`; `\(…\)` ⏳ |
| MATH-011…020 Notation coverage | ✅ | KaTeX: algebra, calculus, matrices, cases, aligned, vectors, sets, statistics, trig, accents |
| MATH-029 Copy as LaTeX | ✅ | button + `$latex$` on plain-text clipboard |
| MATH-037 Screen-reader math | ✅ | MathML output |
| MATH-044 Syntax validation | ✅ | inline errors, Done disabled |
| MATH-045 Lazy-loaded engine & cache | ✅ | KaTeX loads only when needed |
| SEC-001 / SEC-002 | ✅ | URL allowlist, KaTeX `trust:false` + macro limits, strict CSP |
| PRD-002, UI-002, UI-003, UI-005, UI-009, UI-010 | ✅ | |

### Batch 2 (done)
| Feature | Status | Notes |
|---|---|---|
| CORE-003 / CORE-004 Font family & size | ✅ | menus with live preview; values validated before reaching `style` |
| CORE-005 Text color & highlight | ✅ | swatches + custom color; sanitized colors only |
| CORE-007 Text alignment | ✅ | left / center / right / justify, `Mod-Shift-L/E/R/J` |
| CORE-008 Indent / outdent | ✅ | blocks (2em steps, max 8) and list items, `Mod-[` / `Mod-]` |
| CORE-021 Page break | ✅ | `Mod-Enter`, real page break when printing |
| TBL-001 Insert table (grid picker) | ✅ | hover or keyboard grid, header row by default |
| TBL-002 Add/remove rows & columns | ✅ | contextual table bar |
| TBL-003 Merge & split cells | ✅ | plus header row toggle, delete table, column resize, Tab navigation |
| MED-001 Insert image | ✅ | upload, URL, paste screenshots, drag & drop |
| MED-002 Resize & text wrapping | ✅ | corner handle; wrap modes: in line with text, wrap left, wrap right, break text (centered) |
| MED-003 Alt text & caption | ✅ | inline caption, alt-text editor |
| MED-008 Upload adapters | ✅ | base64 (default), `createXhrUploadAdapter`, custom adapter API; size/type limits |
| UI | ✅ | toolbar auto-groups overflow into "More" by priority; menu buttons; balloons for tables & images |
| DX-003 globalAttributes | ✅ | plugins can add attributes to other plugins' nodes |
| MED-009 Move images with the keyboard | ✅ | click an image, then ←/→ move it one character, ↑/↓ one line (wrapped images: one paragraph); Alt+Shift+arrows always; typing/Enter keep the image; Esc returns to text |
| MED-010 Text on both sides of an image | ✅ | Google Docs / Notion style: text \| centered image \| text; drag handle sets middle width; text balanced at a sentence; stacks on phones; layout removed when the image is |
| BLK-006 Columns (engine) | ✅ | `@axiomtext/plugin-columns`: 2–3 columns, widths, empty-column hints (toolbar button for plain columns: later) |
| DX-010 Website rendering parity | ✅ | `@axiomtext/ui/content.css` + saved HTML includes pre-rendered math, so pages match the editor |
- ⏳ Columns toolbar button (insert 2/3 plain columns, remove layout)
- ⏳ Batch 3: AsciiMath input, paste LaTeX/MathML, equation numbering prep
- ⏳ Batch 4: Markdown import/export, autosave, shortcut help dialog, inline/balloon editor types, 10 UI languages, IME test matrix
- ⏳ Batch 5: React + Vue packages, CDN build, docs site, benchmarks, v0.1 release

# 02 — Complete Feature List

Each feature has an ID, priority and target phase.

- **Priority:** `P0` = MVP must‑have · `P1` = needed for market parity (GA) · `P2` = competitive / premium · `P3` = differentiator / later
- **Phase:** see `05-development-plan.md` (Phase 0–7)
- **★** = beyond what the market leaders offer today (how we beat them)
- **Tier:** `FREE` = part of **Goal 1 — the free, open-source (MIT) editor with math** (see `07-goal-1-free-editor.md`) · `OSS` = free, later goal · `PRO` = commercial (needs servers/AI) · `ENT` = enterprise

---

## A. Core Editing & Text Formatting

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| CORE-001 | Bold, italic, underline, strikethrough | Toolbar, shortcuts, markdown autoformat (`**b**`) | P0 | 1 | FREE |
| CORE-002 | Subscript, superscript, inline code | Mutually exclusive sub/sup | P0 | 1 | FREE |
| CORE-003 | Font family | Configurable list, web‑font loading, fallback stacks | P0 | 1 | FREE |
| CORE-004 | Font size | Presets (tiny…huge) or px/pt values | P0 | 1 | FREE |
| CORE-005 | Text color & background highlight | Palette, custom picker, recent colors, document colors | P0 | 1 | FREE |
| CORE-006 | Highlight / marker styles | Multiple pens, "permanent pen" mode | P1 | 2 | FREE |
| CORE-007 | Text alignment | Left/center/right/justify, per block | P0 | 1 | FREE |
| CORE-008 | Indent / outdent | Block indent and list nesting | P0 | 1 | FREE |
| CORE-009 | Line height & paragraph spacing | Before/after spacing, line height presets | P1 | 2 | FREE |
| CORE-010 | Letter spacing, text transform | Character spacing, small caps | P2 | 4 | FREE |
| CORE-011 | Remove formatting | Clears inline & optionally block styles | P0 | 1 | FREE |
| CORE-012 | Format painter | Copy & apply formatting (single/sticky) | P1 | 2 | FREE |
| CORE-013 | Case change | UPPER, lower, Title Case, Sentence case | P1 | 2 | FREE |
| CORE-014 | Undo / redo | Grouped history, selection restore, collab‑aware (own changes only) | P0 | 1 | FREE |
| CORE-015 | Autoformat / markdown shortcuts | `#`, `-`, `1.`, `>`, ``` ``` ```, `---`, `[ ]` | P0 | 1 | FREE |
| CORE-016 | Text transformation / smart typography | Smart quotes, em‑dash, ellipsis, (c)→©, fractions; locale‑aware | P1 | 2 | FREE |
| CORE-017 | Special characters / symbols | Searchable categories, recent, custom sets | P1 | 2 | FREE |
| CORE-018 | Emoji picker & `:shortcode:` | Skin tones, search, recent | P1 | 2 | FREE |
| CORE-019 | Styles dropdown | Named paragraph/character styles mapped to CSS classes | P1 | 2 | FREE |
| CORE-020 | Custom style definitions / style sets | Like Word styles: Heading 1, Quote, Caption; exported to DOCX styles | P2 | 4 | FREE |
| CORE-021 | Horizontal line, page break | | P0 | 1 | FREE |
| CORE-022 | Read‑only mode & restricted editing | Whole doc read‑only, or only "editable regions" (forms/templates) | P1 | 2 | FREE |
| CORE-023 | Placeholder text | Empty-editor and per-block placeholders | P0 | 1 | FREE |
| CORE-024 | Select all, block selection, multi‑cursor ★ | Multi-range selection (Ctrl/Cmd+click) | P3 | 7 | FREE |
| CORE-025 | Drag & drop of text/blocks | Drag handle per block, drop indicator | P1 | 2 | FREE |

## B. Blocks & Structure

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| BLK-001 | Headings H1–H6 | Configurable levels, custom heading styles | P0 | 1 | FREE |
| BLK-002 | Paragraph, blockquote | Nested blockquotes | P0 | 1 | FREE |
| BLK-003 | Code blocks | Language select, syntax highlight (lazy‑loaded), line numbers, copy button, tab indent | P1 | 2 | FREE |
| BLK-004 | Callouts / admonitions | Info/warn/success/error blocks | P2 | 2 | FREE |
| BLK-005 | Collapsible sections / accordion | `<details>` style | P2 | 2 | FREE |
| BLK-006 | Columns / layout grid | 2–4 column layouts, responsive | P2 | 7 | FREE |
| BLK-007 | Slash command menu | `/` insert anything, fuzzy search, custom items | P1 | 2 | FREE |
| BLK-008 | Block handle & block menu | Turn into, duplicate, delete, move up/down | P1 | 2 | FREE |
| BLK-009 | Block editor mode (Notion‑style) ★ | Same engine, switchable "document" vs "block" UX | P3 | 7 | FREE |
| BLK-010 | HTML embed / raw HTML block | Sandboxed preview, sanitized | P2 | 2 | FREE |
| BLK-011 | Bookmarks / anchors | Named anchors, link to anchor | P1 | 2 | FREE |
| BLK-012 | Document outline panel | Live heading tree, click to navigate, drag to reorder sections ★ | P1 | 4 | FREE |
| BLK-013 | Table of contents | Auto‑updating, configurable depth, exported to DOCX TOC field | P1 | 4 | FREE |
| BLK-014 | Footnotes & endnotes | Auto numbering, export to DOCX/PDF | P2 | 4 | FREE |
| BLK-015 | Captions & cross references ★ | "See Figure 3", auto numbering of figures/tables | P3 | 4 | FREE |
| BLK-016 | Widgets / custom nodes API | Embed custom React/Vue components as nodes | P1 | 2 | FREE |
| BLK-017 | Show blocks / visual blocks | Outline blocks for debugging layout | P2 | 2 | FREE |

## C. Lists

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| LST-001 | Bulleted & numbered lists | Nested, Tab/Shift+Tab | P0 | 1 | FREE |
| LST-002 | To‑do / checklist | Clickable checkboxes, keyboard toggle | P0 | 1 | FREE |
| LST-003 | List styles | disc/circle/square, decimal, roman, alpha, leading zero | P1 | 2 | FREE |
| LST-004 | Start index & reversed lists | | P1 | 2 | FREE |
| LST-005 | Multi‑level lists (legal numbering) | 1. / 1.1 / 1.1.1, custom patterns, exported to DOCX numbering | P2 | 4 | FREE |
| LST-006 | List continuation / restart | Continue numbering across interrupted lists | P2 | 4 | FREE |

## D. Tables

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| TBL-001 | Insert table (grid picker) | Header row/column toggle | P0 | 1 | FREE |
| TBL-002 | Add/remove rows & columns | Context toolbar, keyboard | P0 | 1 | FREE |
| TBL-003 | Merge & split cells | Rectangular selections | P0 | 1 | FREE |
| TBL-004 | Column resize, row resize | Drag + numeric | P1 | 2 | FREE |
| TBL-005 | Table & cell properties | Borders, background, padding, alignment, width, height | P1 | 2 | FREE |
| TBL-006 | Table caption | | P1 | 2 | FREE |
| TBL-007 | Multi‑cell selection & formatting | Apply style to selected cells, copy/paste cell ranges | P1 | 2 | FREE |
| TBL-008 | Nested tables | | P2 | 2 | FREE |
| TBL-009 | Table styles / themes | Predefined styles (striped, bordered) | P2 | 2 | FREE |
| TBL-010 | Sort table, filter ★ | Sort by column, simple filter | P2 | 7 | FREE |
| TBL-011 | Formula cells ★ | `=SUM(A1:A5)` lightweight spreadsheet logic | P3 | 7 | FREE |
| TBL-012 | Paste from Excel / Google Sheets | Preserve merged cells, widths, colors | P1 | 2 | FREE |
| TBL-013 | Repeat header row across pages | For pagination / PDF / DOCX | P2 | 4 | FREE |
| TBL-014 | Large table virtualization ★ | 10k+ cells smooth | P2 | 2 | FREE |
| TBL-015 | Responsive tables | Horizontal scroll / stacked on mobile | P1 | 2 | FREE |

## E. Images & Media

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| MED-001 | Insert image (upload, URL, drag‑drop, paste) | Progress, retry, cancel | P0 | 1 | FREE |
| MED-002 | Image resize & alignment | Handles, presets, inline / block / wrap left/right | P0 | 1 | FREE |
| MED-003 | Alt text & caption | Required alt‑text option (a11y) | P0 | 1 | FREE |
| MED-004 | Responsive images | `srcset`, width breakpoints | P1 | 2 | FREE |
| MED-005 | Image link | | P1 | 2 | FREE |
| MED-006 | Image editing | Crop, rotate, flip, filters, annotate | P2 | 2 | FREE |
| MED-007 | Image optimization | Client‑side compress / WebP/AVIF convert before upload | P2 | 2 | FREE |
| MED-008 | Upload adapters | Base64, simple XHR, S3 presigned, Cloudinary, custom adapter API | P0 | 1 | FREE |
| MED-009 | Video & audio | Upload/HTML5 players | P1 | 2 | FREE |
| MED-010 | Media embed | YouTube, Vimeo, X, Instagram, Spotify, Figma, Loom, Google Maps; oEmbed | P1 | 2 | FREE |
| MED-011 | File attachments | Inline file chip with icon, size, download | P1 | 2 | FREE |
| MED-012 | AI image alt‑text generation ★ | Auto suggest alt text | P2 | 5 | PRO |
| MED-013 | Image gallery / grid ★ | | P3 | 7 | FREE |
| MED-014 | Diagram blocks ★ | Mermaid / draw.io style diagrams | P3 | 7 | FREE |

## F. Links

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| LNK-001 | Insert/edit/remove link | Balloon UI, Ctrl+K | P0 | 1 | FREE |
| LNK-002 | Auto‑link | URLs/emails turned into links while typing/pasting | P0 | 1 | FREE |
| LNK-003 | Link decorators | Open in new tab, `rel=nofollow/noopener`, download | P1 | 2 | FREE |
| LNK-004 | Link preview cards ★ | Unfurl title/image (server‑side fetch, SSRF‑safe) | P2 | 2 | PRO |
| LNK-005 | Link checker | Detect broken links | P2 | 6 | PRO |
| LNK-006 | Internal link picker | Link to other docs/anchors via host app provider | P1 | 2 | FREE |

## G. Clipboard & Paste

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| CLP-001 | Paste plain text / as HTML | Paste-as-plain-text shortcut (Ctrl+Shift+V) | P0 | 1 | FREE |
| CLP-002 | Paste cleanup / sanitizer | Schema‑based normalization, strip scripts/styles | P0 | 1 | FREE |
| CLP-003 | Paste from Word | Lists, tables, styles, images, footnotes preserved | P1 | 2 | FREE |
| CLP-004 | Paste from Excel/Google Sheets | | P1 | 2 | FREE |
| CLP-005 | Paste from Google Docs | | P1 | 2 | FREE |
| CLP-006 | Paste Markdown → rich text | Auto‑detect | P1 | 2 | FREE |
| CLP-007 | Paste images from clipboard | Screenshots, upload automatically | P0 | 1 | FREE |
| CLP-008 | Paste options popover ★ | "Keep formatting / Match style / Text only" like Word | P2 | 2 | FREE |
| CLP-009 | Copy as Markdown / HTML ★ | | P2 | 2 | FREE |

## H. Productivity

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| PRD-001 | Find & replace | Regex, match case, whole word, replace all; works in collab | P1 | 2 | FREE |
| PRD-002 | Word & character count | Live, selection count, reading time ★ | P0 | 1 | FREE |
| PRD-003 | Mentions (@user, #tag) | Async feed provider, custom renderer | P1 | 2 | FREE |
| PRD-004 | Templates | Insert predefined document/snippet templates | P1 | 2 | FREE |
| PRD-005 | Merge fields / merge tags | `{{first_name}}`, preview with data, fill‑in API, export with values | P1 | 2 | FREE |
| PRD-006 | Snippets / saved blocks ★ | Users save reusable content blocks | P2 | 7 | PRO |
| PRD-007 | Autosave | Debounced save adapter, "unsaved changes" guard | P0 | 1 | FREE |
| PRD-008 | Source code editing | HTML/Markdown source view with syntax highlight, validation | P1 | 2 | FREE |
| PRD-009 | Fullscreen / distraction‑free mode | | P1 | 2 | FREE |
| PRD-010 | Keyboard shortcut help dialog | Searchable list | P0 | 1 | FREE |
| PRD-011 | Command palette ★ | Ctrl/Cmd+Shift+P, run any command | P2 | 2 | FREE |
| PRD-014 | Date/time insert | Locale formatted | P2 | 2 | FREE |
| PRD-015 | Content statistics & SEO ★ | Readability score, heading structure, keyword density | P3 | 7 | FREE |
| PRD-016 | Print | Print stylesheet, print preview | P1 | 4 | FREE |

## H2. Math & Scientific Equation Editor

Goal: type **any** mathematical notation — school algebra to university calculus, linear algebra, statistics, physics and chemistry — by LaTeX, by a visual editor, by keyboard palette, by handwriting, by photo, or by plain language. Market editors mostly rely on a third‑party plugin (MathType/Wiris) or render LaTeX only; we build it in natively.

### Input methods
| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| MATH-001 | Inline & block (display) equations | Inline in text (`$…$`) and centered display blocks (`$$…$$`); convert between them | P1 | 2 | FREE |
| MATH-002 | LaTeX input with live preview | Split source/preview, syntax highlight, autocomplete of commands (`\frac`, `\int` …), inline error messages | P1 | 2 | FREE |
| MATH-003 | Visual (WYSIWYG) equation editor | Structured editing: cursor moves inside fractions, exponents, roots, matrices; no LaTeX knowledge needed | P1 | 2 | FREE |
| MATH-004 | Symbol & template palettes | Tabs: basic, Greek, operators, relations, arrows, sets & logic, brackets, accents, big operators, functions, calculus, matrices, chemistry; searchable; recent/favorites | P1 | 2 | FREE |
| MATH-005 | Virtual math keyboard | On‑screen keyboard for touch/mobile, layouts per subject (numeric, algebra, calculus, Greek) | P1 | 2 | FREE |
| MATH-006 | Markdown/inline triggers | `$…$`, `$$…$$`, `\( \)`, `\[ \]` auto‑convert while typing or pasting | P1 | 2 | FREE |
| MATH-007 | AsciiMath / plain‑text shorthand ★ | Type `sqrt(x^2+1)/2` or `sum_(i=1)^n i` → rendered math | P2 | 2 | FREE |
| MATH-008 | Natural language to equation (AI) ★ | "integral of x squared from 0 to 1" → `\int_0^1 x^2\,dx`, user confirms | P2 | 5 | PRO |
| MATH-009 | Handwriting recognition ★ | Draw with mouse/pen/finger → LaTeX, with alternatives to pick | P3 | 5 | PRO |
| MATH-010 | Image / screenshot to equation (OCR) ★ | Paste a photo of an equation → editable LaTeX | P2 | 5 | PRO |

### Notation coverage (must render and edit correctly)
| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| MATH-011 | Arithmetic & algebra | Fractions (nested, continued), powers, sub/superscripts, roots (nth), absolute value, floor/ceil, ±, ∓, inequalities, polynomials | P1 | 2 | FREE |
| MATH-012 | Calculus | Limits, derivatives (Leibniz, prime, dot), partial derivatives, single/double/triple/contour integrals with bounds, sums, products, series | P1 | 2 | FREE |
| MATH-013 | Matrices & arrays | Any size; pmatrix/bmatrix/vmatrix/Bmatrix; determinants; add/remove rows & columns; augmented matrices; dots (⋯ ⋮ ⋱) | P1 | 2 | FREE |
| MATH-014 | Piecewise / cases & systems of equations | `cases`, aligned systems with braces | P1 | 2 | FREE |
| MATH-015 | Multi‑line & aligned equations | align, gather, multline, split; step‑by‑step derivations aligned on `=` | P1 | 2 | FREE |
| MATH-016 | Linear algebra, vectors & tensors | Bold/arrow vectors, hats, norms, dot/cross products, transposes, indices | P1 | 2 | FREE |
| MATH-017 | Sets, logic & discrete math | ∀ ∃ ∈ ⊂ ∪ ∩ ∅, ℕℤℚℝℂ (blackboard bold), binomials, modular arithmetic | P1 | 2 | FREE |
| MATH-018 | Statistics & probability | Σ notation, expectation, variance, distributions, combinatorics, overline/hat estimators | P1 | 2 | FREE |
| MATH-019 | Trigonometry & functions | sin/cos/tan…, inverse/hyperbolic, log/ln/exp, custom operator names | P1 | 2 | FREE |
| MATH-020 | Accents, decorations & styles | hat, bar, tilde, dot, vec, overbrace/underbrace, cancel/strikeout, colors, boxed, mathcal/mathfrak/mathscr | P1 | 2 | FREE |
| MATH-021 | Physics & units ★ | Units with correct spacing (`\SI{9.8}{m/s^2}`), bra‑ket notation, physical constants | P2 | 2 | FREE |
| MATH-022 | Chemistry (mhchem) | Formulas, ions, isotopes, reaction arrows (→ ⇌), states, conditions above arrows | P2 | 2 | FREE |
| MATH-023 | Custom macros | `\newcommand` per document; org‑wide macro library | P2 | 2 | FREE |
| MATH-024 | RTL / Arabic math notation & localized digits ★ | Arabic mathematical notation, Bangla/Eastern‑Arabic numerals option | P3 | 7 | FREE |

### Document features
| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| MATH-025 | Equation numbering & cross‑references | Auto (1), (2.3) by section, `\label`/`\ref`, "see Eq. (4)" links | P2 | 4 | FREE |
| MATH-026 | Equation inside tables, lists, headings, captions, footnotes | | P1 | 2 | FREE |
| MATH-027 | Comments & track changes on equations | Comment on an equation; suggestion shows old vs new formula | P2 | 3 | PRO |
| MATH-028 | Real‑time co‑editing of equations | Edits merge safely (equation node is atomic per edit session, with lock indicator) | P2 | 3 | PRO |

### Import / export / clipboard
| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| MATH-029 | Copy equation as LaTeX / MathML / image | Context menu | P1 | 2 | FREE |
| MATH-030 | Paste LaTeX, MathML, AsciiMath | Auto‑detect | P1 | 2 | FREE |
| MATH-031 | Import Word equations (OMML) | From DOCX import and paste from Word; stays editable | P1 | 4 | FREE |
| MATH-032 | Import MathType equations ★ | MathType objects in DOCX → editable equations | P2 | 4 | FREE |
| MATH-033 | Export to DOCX as native Word equations (OMML) | Editable in Microsoft Word | P1 | 4 | FREE |
| MATH-034 | Export to PDF as vector math | Crisp at any zoom, selectable/accessible (tagged with MathML in PDF 2.0) | P1 | 4 | FREE |
| MATH-035 | HTML output options | MathML, SVG, or KaTeX HTML; LaTeX source kept in data attribute | P1 | 2 | FREE |
| MATH-036 | Markdown & LaTeX document export ★ | `$…$` in Markdown; full `.tex` export of the document | P2 | 4 | FREE |

### Accessibility
| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| MATH-037 | Screen‑reader speech for math | MathML + speech text (ClearSpeak/MathSpeak); explore equation part‑by‑part | P1 | 2 | FREE |
| MATH-038 | Keyboard navigation inside equations | Arrow keys through structure; full editing without mouse | P1 | 2 | FREE |
| MATH-039 | Braille output (Nemeth / UEB) ★ | For refreshable braille displays | P3 | 7 | FREE |
| MATH-040 | Alt text auto‑generated from equation | | P2 | 2 | FREE |

### Smart math ★
| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| MATH-041 | Evaluate & simplify (CAS) ★ | Select expression → evaluate, simplify, expand, factor, solve; result inserted as new line | P3 | 7 | FREE |
| MATH-042 | Function graph block ★ | Plot `y = f(x)`, parametric/polar, multiple functions, zoom/pan; exported as SVG | P3 | 7 | FREE |
| MATH-043 | AI explain / check steps ★ | Explain an equation; flag errors in a derivation (as comments) | P3 | 5 | PRO |
| MATH-044 | Syntax validation | Unbalanced braces, unknown commands highlighted before insert | P1 | 2 | FREE |

### Performance
| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| MATH-045 | Lazy‑loaded math engine & render cache | Math code loaded only when a doc contains/inserts math; rendered output cached by LaTeX hash; 1,000 equations per doc stay smooth | P1 | 2 | FREE |

## I. Spelling, Grammar & Language Quality

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| SPL-001 | Native browser spellcheck support | | P0 | 1 | FREE |
| SPL-002 | Spell checker (as‑you‑type) | Own service, Hunspell dictionaries, 30+ languages incl. Bangla | P2 | 6 | FREE |
| SPL-003 | Grammar & style checker | Rule engine + AI review | P2 | 5 | PRO |
| SPL-004 | Custom dictionaries | Per user / org, ignore words | P2 | 6 | FREE |
| SPL-005 | Autocorrect | Common typos, capitalization | P2 | 6 | FREE |
| SPL-006 | Language detection & per‑paragraph language ★ | `lang` attribute per block, used by spellcheck & screen readers | P2 | 6 | FREE |

## J. Page Layout & Document Mode

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| PAG-001 | Document (paper) editor UI | Word‑like page canvas | P1 | 4 | FREE |
| PAG-002 | Live pagination | Real page breaks computed on screen, page numbers | P1 | 4 | FREE |
| PAG-003 | Page setup | Size (A4, Letter, Legal…), orientation, margins | P1 | 4 | FREE |
| PAG-004 | Headers & footers | Different first page, odd/even, page number fields | P1 | 4 | FREE |
| PAG-005 | Section breaks ★ | Different orientation/margins per section | P2 | 4 | FREE |
| PAG-006 | Watermark | Text/image watermark ("DRAFT") | P2 | 4 | FREE |
| PAG-007 | Rulers & tab stops ★ | Word‑style horizontal ruler | P3 | 4 | FREE |
| PAG-008 | Zoom | 50%–200%, fit width | P1 | 4 | FREE |
| PAG-009 | Multi‑column text sections ★ | Newspaper columns | P3 | 4 | FREE |
| PAG-010 | Line numbering ★ | Legal/court documents | P3 | 4 | FREE |

## K. Import / Export & Conversion

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| CNV-001 | HTML input/output | Clean, semantic, configurable | P0 | 1 | FREE |
| CNV-002 | JSON document model I/O | Versioned schema, migrations | P0 | 1 | FREE |
| CNV-003 | Markdown input/output | GFM, tables, task lists, front‑matter | P0 | 1 | FREE |
| CNV-004 | Import from Word (DOCX) | Styles, lists, tables, images, comments, tracked changes, footnotes, headers/footers | P1 | 4 | FREE |
| CNV-005 | Export to Word (DOCX) | Includes comments, suggestions, page setup, headers/footers, TOC | P1 | 4 | FREE |
| CNV-006 | Export to PDF | Pixel‑accurate, fonts embedded (Bangla/Arabic/CJK shaping), PDF/A, tagged PDF (a11y) | P1 | 4 | FREE |
| CNV-007 | Client‑side conversion via WASM ★ | DOCX/PDF in the browser, no server — privacy + zero latency | P2 | 4 | FREE |
| CNV-008 | Server conversion REST API | Batch, async jobs, webhooks | P1 | 4 | PRO |
| CNV-009 | ODT, RTF, EPUB, plain text export | | P2 | 4 | FREE |
| CNV-010 | Import from PDF ★ | Text/structure extraction (PageCraft) | P3 | 7 | ENT |
| CNV-011 | Email‑safe HTML export | Inline CSS, table layout fallback | P2 | 6 | FREE |
| CNV-012 | Google Docs import/export ★ | via Drive API | P3 | 7 | PRO |

## L. Collaboration

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| COL-001 | Real‑time co‑editing | CRDT (Yjs), conflict‑free, sub‑100ms sync | P1 | 3 | PRO |
| COL-002 | Offline editing & sync ★ | IndexedDB persistence, merge on reconnect | P1 | 3 | PRO |
| COL-003 | Presence list & live cursors | Avatars, names, colors, selection highlights, follow user | P1 | 3 | PRO |
| COL-004 | Comments | Threads, replies, edit/delete, resolve/reopen, @mentions, reactions ★ | P1 | 3 | PRO |
| COL-005 | Comments sidebar / inline / narrow modes | Responsive layouts | P1 | 3 | PRO |
| COL-006 | Comment archive & filters | Resolved archive, filter by user/status | P2 | 3 | PRO |
| COL-007 | Track changes (suggestion mode) | Insert/delete/format suggestions; accept/reject one/all; per‑author | P1 | 3 | PRO |
| COL-008 | Suggestion discussions | Comments on suggestions | P1 | 3 | PRO |
| COL-009 | Revision history | Auto + named versions, view, compare (diff), restore, version authors | P1 | 3 | PRO |
| COL-010 | Document compare ★ | Compare any two documents/DOCX files → redline | P2 | 4 | PRO |
| COL-011 | Permissions & roles | Owner/editor/commenter/suggester/viewer per doc; JWT claims | P1 | 3 | PRO |
| COL-012 | Section‑level permissions ★ | Lock sections to specific users | P3 | 7 | ENT |
| COL-013 | Asynchronous collaboration | Comments/suggestions without real‑time server (stored by host app) | P1 | 3 | PRO |
| COL-014 | Notifications | In‑app + webhooks + email digest for mentions, replies, assignments | P2 | 3 | PRO |
| COL-015 | Users API | Pluggable user/avatars provider | P1 | 3 | PRO |
| COL-016 | Multi‑root editing | Several editable areas sharing one collab session (e.g. title + body + sidebar) | P2 | 3 | PRO |
| COL-017 | Self‑hosted collaboration server | Docker/Helm, free community edition ★ | P1 | 3 | OSS/ENT |
| COL-018 | Comment/suggestion export to DOCX/PDF | | P1 | 4 | PRO |
| COL-019 | Task assignment in comments ★ | Assign comment to user, due date | P3 | 7 | PRO |
| COL-020 | Approval workflow ★ | Request review → approve/reject document | P3 | 7 | ENT |

## M. AI

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| AI-001 | AI quick actions | Improve, fix grammar, shorten, expand, simplify, change tone, summarize, continue writing | P1 | 5 | PRO |
| AI-002 | Custom AI actions / prompt library | Admin‑defined prompts, variables | P1 | 5 | PRO |
| AI-003 | AI chat sidebar | Multi‑turn, document‑aware, selection‑aware, cites document sections | P1 | 5 | PRO |
| AI-004 | AI review | Grammar/style/tone/brand‑guide review with inline suggestions | P1 | 5 | PRO |
| AI-005 | AI translate | Whole doc / selection, preserve formatting, glossary ★ | P1 | 5 | PRO |
| AI-006 | AI edits as tracked changes ★ | Every AI change is a reviewable suggestion (human‑in‑the‑loop) | P1 | 5 | PRO |
| AI-007 | Streaming responses into document | Token streaming with structure preservation | P1 | 5 | PRO |
| AI-008 | Bring your own model | OpenAI, Anthropic, Azure, Bedrock, Vertex, Mistral, local (Ollama/vLLM) | P1 | 5 | PRO |
| AI-009 | AI agent / tool API | Agents read/edit document via typed operations; server‑side AI editing | P2 | 5 | PRO |
| AI-010 | MCP server & client ★ | Expose document as MCP tools; connect external MCP tools/data | P2 | 5 | PRO |
| AI-011 | Brand voice / style guides | Org‑level rules used in review & generation | P2 | 5 | ENT |
| AI-012 | AI autocomplete (ghost text) ★ | Inline next‑words suggestion, Tab to accept | P2 | 5 | PRO |
| AI-013 | AI in comments ★ | @AI in a comment thread to answer/suggest | P2 | 5 | PRO |
| AI-014 | Generate tables/outline/templates from prompt | | P2 | 5 | PRO |
| AI-015 | AI governance | PII redaction before sending, audit logs, per‑org usage caps, data residency, zero‑retention providers | P1 | 5 | ENT |
| AI-016 | Prompt‑injection guardrails | Treat doc text as data, tool allowlists, output schema validation | P0 (for AI) | 5 | PRO |

## N. Accessibility & Compliance

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| A11Y-001 | WCAG 2.2 AA editor UI | Full keyboard nav, focus management, ARIA, contrast | P0 | 1 | FREE |
| A11Y-002 | Screen reader support | NVDA, JAWS, VoiceOver, TalkBack tested; live announcements | P0 | 1 | FREE |
| A11Y-003 | Accessibility help dialog | Shortcut list | P0 | 1 | FREE |
| A11Y-004 | Content accessibility checker ★ | Missing alt, heading order, contrast, table headers, link text — with one‑click fixes | P2 | 6 | FREE |
| A11Y-005 | Accessible output | Semantic HTML, tagged PDF, DOCX alt text | P1 | 4 | FREE |
| A11Y-006 | High contrast & reduced motion themes | | P1 | 2 | FREE |
| A11Y-007 | Section 508 / EN 301 549 VPAT | Documentation | P1 | 6 | FREE |

## O. Internationalization

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| I18N-001 | UI translations | 40+ languages, community translation workflow | P0 | 1 | FREE |
| I18N-002 | RTL support | Arabic, Hebrew, Urdu; mirrored UI | P0 | 1 | FREE |
| I18N-003 | Bidirectional text | Mixed LTR/RTL paragraphs, direction per block | P1 | 2 | FREE |
| I18N-004 | IME composition | CJK, Bangla, Hindi, Vietnamese, Android GBoard — tested matrix | P0 | 1 | FREE |
| I18N-005 | Complex script shaping in exports ★ | Bangla/Devanagari/Arabic correct in PDF/DOCX | P1 | 4 | FREE |
| I18N-006 | Locale‑aware formatting | Dates, numbers, quotes | P2 | 2 | FREE |

## P. UI / UX & Customization

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| UI-001 | Editor types | Classic (toolbar), Inline, Balloon, Balloon‑block, Decoupled, Document (paper), Multi‑root | P0 | 1–3 | FREE |
| UI-002 | Toolbar | Grouping, overflow wrap/"more" menu, sticky, custom buttons/dropdowns | P0 | 1 | FREE |
| UI-003 | Contextual balloon toolbars | Link, image, table toolbars | P0 | 1 | FREE |
| UI-004 | Menu bar (File/Edit/Insert/Format) | Word‑like | P1 | 2 | FREE |
| UI-005 | Theming | CSS variables, light/dark/auto, brand tokens | P0 | 1 | FREE |
| UI-006 | Headless mode ★ | Use engine + commands with your own UI (React hooks / Vue composables) | P1 | 1 | FREE |
| UI-007 | Pre‑built React/Vue UI components | Toolbar, menus, pickers usable separately | P1 | 2 | FREE |
| UI-008 | Mobile & touch optimized | Mobile toolbar, touch selection handles, iOS/Android keyboards | P1 | 2 | FREE |
| UI-009 | Responsive layouts | Collapsible sidebar/toolbar | P0 | 1 | FREE |
| UI-010 | Word count/status bar | | P1 | 1 | FREE |
| UI-011 | Custom icons | Icon set replacement | P1 | 1 | FREE |
| UI-012 | Character/content limits | Max length with warning UI | P1 | 2 | FREE |

## Q. Developer Experience & APIs

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| DX-001 | TypeScript‑first API & full type definitions | | P0 | 1 | FREE |
| DX-002 | Framework integrations | React, Vue 3, Angular, Svelte, Solid, Web Component, vanilla; Next.js/Nuxt SSR‑safe | P0 | 1–2 | FREE |
| DX-003 | Plugin / extension API | Schema, commands, keymaps, input rules, node views, UI components | P0 | 1 | FREE |
| DX-004 | Schema & content filtering (GHS) | Allowlist elements/attributes/classes/styles | P0 | 1 | FREE |
| DX-005 | Events & observable state | onChange, onSelection, onFocus, transaction hooks | P0 | 1 | FREE |
| DX-006 | Online builder ★ | Pick features → download/npm config/CDN snippet | P1 | 2 | FREE |
| DX-007 | CDN & npm distribution | ESM, tree‑shakeable, CDN with SRI | P0 | 1 | FREE |
| DX-008 | Devtools extension ★ | Inspect model, transactions, schema, collab state | P1 | 2 | FREE |
| DX-009 | Server‑side (Node) document API | Headless editor in Node for transforms/validation | P1 | 3 | FREE |
| DX-010 | REST APIs | Documents, comments, suggestions, revisions, conversion, AI | P1 | 3–5 | PRO |
| DX-011 | Webhooks | Document updated, comment added, etc.; signed payloads | P1 | 3 | PRO |
| DX-012 | Docs site | Guides, API reference (auto‑generated), live examples, recipes | P0 | 1 | FREE |
| DX-013 | Migration guides & importers ★ | From CKEditor 4/5, TinyMCE, Quill content & config | P2 | 6 | FREE |
| DX-014 | Coding‑agent skills / llms.txt ★ | AI‑friendly docs so coding agents integrate correctly | P2 | 2 | FREE |
| DX-015 | Starter templates | Next.js, Laravel, .NET, Spring, Django examples | P1 | 2 | FREE |

## R. File & Asset Management

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| FIL-001 | File manager UI | Folders, search, tags, grid/list, reuse assets | P2 | 6 | PRO |
| FIL-002 | Storage backends | S3, GCS, Azure Blob, MinIO, local | P2 | 6 | PRO |
| FIL-003 | Image processing pipeline | Thumbnails, resize, format conversion, EXIF strip | P2 | 6 | PRO |
| FIL-004 | Virus/malware scanning of uploads | ClamAV or provider | P2 | 6 | ENT |
| FIL-005 | Signed/expiring URLs | Private assets | P2 | 6 | PRO |

## S. Platform, Admin & Cloud Services

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| PLT-001 | Customer dashboard | Projects, environments, license keys, API secrets | P1 | 6 | — |
| PLT-002 | Usage analytics | MAU, documents, AI tokens, conversions | P1 | 6 | — |
| PLT-003 | Billing & subscriptions | Stripe, plans, invoices, trials | P1 | 6 | — |
| PLT-004 | Token endpoint helpers | SDKs for issuing JWTs (Node, PHP, .NET, Java, Python, Go) | P1 | 3 | PRO |
| PLT-005 | SSO (SAML/OIDC) & SCIM for dashboard | | P2 | 6 | ENT |
| PLT-006 | Audit logs | Who did what, exportable | P2 | 6 | ENT |
| PLT-007 | Data residency | US, EU, APAC regions | P2 | 6 | ENT |
| PLT-008 | On‑premises / air‑gapped install | Helm charts, offline license | P1 | 6 | ENT |
| PLT-009 | LTS releases | 2‑3 year security support | P2 | 6 | ENT |
| PLT-010 | Status page & SLA | 99.9% / 99.95% | P2 | 6 | ENT |
| PLT-011 | Document storage API ★ | Optional managed doc storage with versioning | P2 | 3 | PRO |

## T. Security (product features)

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| SEC-001 | XSS‑safe content model | Schema allowlist, URL scheme allowlist, no `on*` attrs | P0 | 1 | FREE |
| SEC-002 | CSP & Trusted Types compatible | No `eval`, optional no inline styles | P0 | 1 | FREE |
| SEC-003 | JWT‑based auth for services | Short‑lived, scoped, per‑document permissions | P1 | 3 | PRO |
| SEC-004 | Encryption | TLS 1.2+, at rest AES‑256; optional end‑to‑end encrypted collab ★ | P2 | 6–7 | ENT |
| SEC-005 | PII detection & redaction ★ | Mask emails/phones/IDs on export or before AI | P3 | 7 | ENT |
| SEC-006 | Compliance | SOC 2 Type II, ISO 27001, GDPR, HIPAA BAA | P2 | 6 | ENT |

## U. Integrations

| ID | Feature | Pri | Phase |
|---|---|---|---|
| INT-001 | WordPress plugin | P2 | 6 |
| INT-002 | Drupal module | P2 | 6 |
| INT-003 | Laravel / Livewire package | P1 | 6 |
| INT-004 | .NET (Blazor/Razor) package | P2 | 6 |
| INT-005 | Spring Boot / Django / Rails helpers | P2 | 6 |
| INT-006 | Salesforce, SharePoint, Strapi, Payload, Sanity | P3 | 7 |
| INT-007 | Electron / Tauri desktop | P2 | 6 |
| INT-008 | React Native bridge ★ (Flutter has its own SDK — see U2) | P3 | 7 |
| INT-009 | Zapier/Make via webhooks | P3 | 7 |

## U2. Flutter SDK ★

An official Flutter package on pub.dev, so Flutter apps get the **same editor, including the full math editor**, on Android, iOS, Web, macOS, Windows and Linux. The market leaders (CKEditor, TinyMCE, Tiptap, Froala) target web frameworks; Flutter teams today rely on community editors with far fewer features.

**Approach:** the editor engine is the same TypeScript editor, hosted in a WebView on mobile/desktop and embedded directly on Flutter Web, wrapped in a typed Dart API. All 200+ editing features come for free and stay in sync with the web version. A native Flutter **read‑only renderer** covers fast display in lists and feeds.

| ID | Feature | Details | Pri | Phase | Tier |
|---|---|---|---|---|---|
| FLT-001 | Flutter package on pub.dev | Android, iOS, Web, macOS, Windows, Linux; Dart 3, null‑safe | P1 | 2 | FREE |
| FLT-002 | `AxiomTextEditor` widget with full feature parity | Same engine as web: formatting, tables, media, paste, page layout, **math editor** | P1 | 2 | FREE |
| FLT-003 | Typed Dart controller API | `getHtml/getJson/getMarkdown`, `setContent`, `execute(command)`, `canExecute`, undo/redo, focus | P1 | 2 | FREE |
| FLT-004 | Dart events & streams | `onChange`, `onSelectionChange`, `onFocus/onBlur`, `onReady`, debounced content stream | P1 | 2 | FREE |
| FLT-005 | Native Flutter toolbar & UI widgets | Material 3 and Cupertino toolbars, bottom sheets, color/font pickers; or use the built‑in web toolbar | P1 | 2 | FREE |
| FLT-006 | Mobile‑first UX | Keyboard‑avoiding toolbar above the soft keyboard, selection handles, haptics, scroll into view | P1 | 2 | FREE |
| FLT-007 | Native math input on mobile | Math keyboard as a Flutter widget, palettes in bottom sheets, LaTeX/visual toggle | P1 | 2 | FREE |
| FLT-008 | Media from device | Image/video/file pickers, camera capture, Dart upload adapter (your API, S3, Firebase) | P1 | 2 | FREE |
| FLT-009 | Theming from `ThemeData` | Light/dark, colors, typography mapped to editor CSS variables | P1 | 2 | FREE |
| FLT-010 | Localization & RTL from Flutter | Uses app `Locale` and `Directionality`; Bangla/Arabic input | P1 | 2 | FREE |
| FLT-011 | Export & share | DOCX, PDF, Markdown, HTML saved to files or the system share sheet | P1 | 4 | FREE |
| FLT-012 | Native read‑only renderer ★ | Render the editor's JSON (incl. math & tables) as Flutter widgets, no WebView; ideal for feeds, chat, lists | P2 | 4 | FREE |
| FLT-013 | Offline bundled engine | Editor JS/CSS/fonts shipped inside the package, no CDN or network needed | P1 | 2 | FREE |
| FLT-014 | Dart plugin API | Custom toolbar buttons, custom commands, custom content nodes rendered by Flutter widgets | P2 | 4 | FREE |
| FLT-015 | Accessibility | TalkBack/VoiceOver inside the editor; semantics on native toolbar widgets | P1 | 2 | FREE |
| FLT-016 | Performance | Pre‑warmed/pooled WebView, editor ready < 300 ms on mid‑range Android, batched bridge messages | P1 | 2 | FREE |
| FLT-017 | Bridge security | Typed message allowlist, no `eval` of strings from Dart, external navigation blocked, strict CSP inside the WebView | P0 | 2 | FREE |
| FLT-018 | Example app, docs & pub.dev quality | Full demo app (notes, math homework, document), API docs, high pub.dev score | P1 | 2 | FREE |
| FLT-019 | Real‑time collaboration in Flutter | Uses the Goal 2 collab server | P2 | 3 | OSS |

## V. Industry Packs ★

| Pack | Features |
|---|---|
| Legal | Clause library, multi‑level legal numbering, line numbering, redline compare DOCX↔DOCX, defined‑terms highlighting, signature blocks, approval workflow |
| Email | Inline CSS export, email‑safe blocks, merge tags with preview, dark‑mode email preview |
| Education | Math & chemistry, accessible output, quiz blocks, AI feedback in comments |
| Healthcare | Structured forms/restricted editing, PHI redaction, audit logs, HIPAA hosting |
| Publishing/CMS | SEO panel, readability, word count goals, media library, embargo/revision workflow |

## W. Standalone Web App (showcase product) ★

A Google‑Docs‑like web app built on our own SDK — it is the live demo, dogfooding target and an extra revenue line.
- Workspace, folders, sharing links, roles
- Document list, search, starred, trash
- All editor features (document mode, collaboration, AI, DOCX/PDF)
- Templates gallery
- Public read‑only publishing

---

## Feature count summary

| Area | Count |
|---|---|
| Core, blocks, lists, tables, media, links, paste (A–G) | 92 |
| Productivity, spelling, page layout, conversion (H–K) | 42 |
| Math & scientific editor (H2) | 45 |
| Collaboration & AI (L–M) | 36 |
| A11y, i18n, UI, DX, files, platform, security, integrations (N–U) | 71 |
| Flutter SDK (U2) | 19 |
| **Total** | **305 features** + 5 industry packs + standalone Docs app |

# Goal 1 — Feature List

**Goal 1:** a completely free, open‑source (MIT) rich text editor with every editing feature the market leaders offer, a full math equation editor and an official Flutter SDK. Everything runs in the browser or app, so **no backend server is needed**.

- IDs match the master list in `../02-feature-list.md`.
- **Priority:** `P0` must‑have for the first release · `P1` needed for parity · `P2` competitive · `P3` extra.
- **Milestone:** when it ships (see `02-development-guide.md`).

| Milestone | Release | Target | Features |
|---|---|---|---|
| M0 | Foundation (no public release) | Month 1 | setup only |
| M1 | v0.1 alpha — Core + Math | Month 3 | 82 |
| M2 | v0.5 beta — Feature parity + Flutter beta | Month 6 | 85 |
| M3 | v1.0 — Documents (pages, Word, PDF) + Flutter 1.0 | Month 9 | 44 |
| M4 | v1.1–1.2 — Extras | Month 11–12 | 12 |
| | **Total** | | **223** |

★ = goes beyond what CKEditor, TinyMCE, Tiptap and Froala offer today.

Not in Goal 1 (need a server or paid AI): real‑time collaboration, AI features, link previews, grammar checker, cloud conversion API, dashboard. See `../07-goal-1-free-editor.md`.

---

## Core Editing & Text Formatting

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| CORE-001 | Bold, italic, underline, strikethrough | Toolbar, shortcuts, markdown autoformat (`**b**`) | P0 | M1 |
| CORE-002 | Subscript, superscript, inline code | Mutually exclusive sub/sup | P0 | M1 |
| CORE-003 | Font family | Configurable list, web‑font loading, fallback stacks | P0 | M1 |
| CORE-004 | Font size | Presets (tiny…huge) or px/pt values | P0 | M1 |
| CORE-005 | Text color & background highlight | Palette, custom picker, recent colors, document colors | P0 | M1 |
| CORE-006 | Highlight / marker styles | Multiple pens, "permanent pen" mode | P1 | M2 |
| CORE-007 | Text alignment | Left/center/right/justify, per block | P0 | M1 |
| CORE-008 | Indent / outdent | Block indent and list nesting | P0 | M1 |
| CORE-009 | Line height & paragraph spacing | Before/after spacing, line height presets | P1 | M2 |
| CORE-010 | Letter spacing, text transform | Character spacing, small caps | P2 | M3 |
| CORE-011 | Remove formatting | Clears inline & optionally block styles | P0 | M1 |
| CORE-012 | Format painter | Copy & apply formatting (single/sticky) | P1 | M2 |
| CORE-013 | Case change | UPPER, lower, Title Case, Sentence case | P1 | M2 |
| CORE-014 | Undo / redo | Grouped history, selection restore, collab‑aware (own changes only) | P0 | M1 |
| CORE-015 | Autoformat / markdown shortcuts | `#`, `-`, `1.`, `>`, ``` ``` ```, `---`, `[ ]` | P0 | M1 |
| CORE-016 | Text transformation / smart typography | Smart quotes, em‑dash, ellipsis, (c)→©, fractions; locale‑aware | P1 | M2 |
| CORE-017 | Special characters / symbols | Searchable categories, recent, custom sets | P1 | M2 |
| CORE-018 | Emoji picker & `:shortcode:` | Skin tones, search, recent | P1 | M2 |
| CORE-019 | Styles dropdown | Named paragraph/character styles mapped to CSS classes | P1 | M2 |
| CORE-020 | Custom style definitions / style sets | Like Word styles: Heading 1, Quote, Caption; exported to DOCX styles | P2 | M3 |
| CORE-021 | Horizontal line, page break |  | P0 | M1 |
| CORE-022 | Read‑only mode & restricted editing | Whole doc read‑only, or only "editable regions" (forms/templates) | P1 | M2 |
| CORE-023 | Placeholder text | Empty-editor and per-block placeholders | P0 | M1 |
| CORE-024 | Select all, block selection, multi‑cursor ★ | Multi-range selection (Ctrl/Cmd+click) | P3 | M4 |
| CORE-025 | Drag & drop of text/blocks | Drag handle per block, drop indicator | P1 | M2 |

## Blocks & Structure

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| BLK-001 | Headings H1–H6 | Configurable levels, custom heading styles | P0 | M1 |
| BLK-002 | Paragraph, blockquote | Nested blockquotes | P0 | M1 |
| BLK-003 | Code blocks | Language select, syntax highlight (lazy‑loaded), line numbers, copy button, tab indent | P1 | M2 |
| BLK-004 | Callouts / admonitions | Info/warn/success/error blocks | P2 | M2 |
| BLK-005 | Collapsible sections / accordion | `<details>` style | P2 | M2 |
| BLK-006 | Columns / layout grid | 2–4 column layouts, responsive | P2 | M4 |
| BLK-007 | Slash command menu | `/` insert anything, fuzzy search, custom items | P1 | M2 |
| BLK-008 | Block handle & block menu | Turn into, duplicate, delete, move up/down | P1 | M2 |
| BLK-009 | Block editor mode (Notion‑style) ★ | Same engine, switchable "document" vs "block" UX | P3 | M4 |
| BLK-010 | HTML embed / raw HTML block | Sandboxed preview, sanitized | P2 | M2 |
| BLK-011 | Bookmarks / anchors | Named anchors, link to anchor | P1 | M2 |
| BLK-012 | Document outline panel | Live heading tree, click to navigate, drag to reorder sections ★ | P1 | M3 |
| BLK-013 | Table of contents | Auto‑updating, configurable depth, exported to DOCX TOC field | P1 | M3 |
| BLK-014 | Footnotes & endnotes | Auto numbering, export to DOCX/PDF | P2 | M3 |
| BLK-015 | Captions & cross references ★ | "See Figure 3", auto numbering of figures/tables | P3 | M3 |
| BLK-016 | Widgets / custom nodes API | Embed custom React/Vue components as nodes | P1 | M2 |
| BLK-017 | Show blocks / visual blocks | Outline blocks for debugging layout | P2 | M2 |

## Lists

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| LST-001 | Bulleted & numbered lists | Nested, Tab/Shift+Tab | P0 | M1 |
| LST-002 | To‑do / checklist | Clickable checkboxes, keyboard toggle | P0 | M1 |
| LST-003 | List styles | disc/circle/square, decimal, roman, alpha, leading zero | P1 | M2 |
| LST-004 | Start index & reversed lists |  | P1 | M2 |
| LST-005 | Multi‑level lists (legal numbering) | 1. / 1.1 / 1.1.1, custom patterns, exported to DOCX numbering | P2 | M3 |
| LST-006 | List continuation / restart | Continue numbering across interrupted lists | P2 | M3 |

## Tables

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| TBL-001 | Insert table (grid picker) | Header row/column toggle | P0 | M1 |
| TBL-002 | Add/remove rows & columns | Context toolbar, keyboard | P0 | M1 |
| TBL-003 | Merge & split cells | Rectangular selections | P0 | M1 |
| TBL-004 | Column resize, row resize | Drag + numeric | P1 | M2 |
| TBL-005 | Table & cell properties | Borders, background, padding, alignment, width, height | P1 | M2 |
| TBL-006 | Table caption |  | P1 | M2 |
| TBL-007 | Multi‑cell selection & formatting | Apply style to selected cells, copy/paste cell ranges | P1 | M2 |
| TBL-008 | Nested tables |  | P2 | M2 |
| TBL-009 | Table styles / themes | Predefined styles (striped, bordered) | P2 | M2 |
| TBL-010 | Sort table, filter ★ | Sort by column, simple filter | P2 | M4 |
| TBL-011 | Formula cells ★ | `=SUM(A1:A5)` lightweight spreadsheet logic | P3 | M4 |
| TBL-012 | Paste from Excel / Google Sheets | Preserve merged cells, widths, colors | P1 | M2 |
| TBL-013 | Repeat header row across pages | For pagination / PDF / DOCX | P2 | M3 |
| TBL-014 | Large table virtualization ★ | 10k+ cells smooth | P2 | M2 |
| TBL-015 | Responsive tables | Horizontal scroll / stacked on mobile | P1 | M2 |

## Images & Media

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| MED-001 | Insert image (upload, URL, drag‑drop, paste) | Progress, retry, cancel | P0 | M1 |
| MED-002 | Image resize & alignment | Handles, presets, inline / block / wrap left/right | P0 | M1 |
| MED-003 | Alt text & caption | Required alt‑text option (a11y) | P0 | M1 |
| MED-004 | Responsive images | `srcset`, width breakpoints | P1 | M2 |
| MED-005 | Image link |  | P1 | M2 |
| MED-006 | Image editing | Crop, rotate, flip, filters, annotate | P2 | M2 |
| MED-007 | Image optimization | Client‑side compress / WebP/AVIF convert before upload | P2 | M2 |
| MED-008 | Upload adapters | Base64, simple XHR, S3 presigned, Cloudinary, custom adapter API | P0 | M1 |
| MED-009 | Video & audio | Upload/HTML5 players | P1 | M2 |
| MED-010 | Media embed | YouTube, Vimeo, X, Instagram, Spotify, Figma, Loom, Google Maps; oEmbed | P1 | M2 |
| MED-011 | File attachments | Inline file chip with icon, size, download | P1 | M2 |
| MED-013 | Image gallery / grid ★ |  | P3 | M4 |
| MED-014 | Diagram blocks ★ | Mermaid / draw.io style diagrams | P3 | M4 |

## Links

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| LNK-001 | Insert/edit/remove link | Balloon UI, Ctrl+K | P0 | M1 |
| LNK-002 | Auto‑link | URLs/emails turned into links while typing/pasting | P0 | M1 |
| LNK-003 | Link decorators | Open in new tab, `rel=nofollow/noopener`, download | P1 | M2 |
| LNK-006 | Internal link picker | Link to other docs/anchors via host app provider | P1 | M2 |

## Clipboard & Paste

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| CLP-001 | Paste plain text / as HTML | Paste-as-plain-text shortcut (Ctrl+Shift+V) | P0 | M1 |
| CLP-002 | Paste cleanup / sanitizer | Schema‑based normalization, strip scripts/styles | P0 | M1 |
| CLP-003 | Paste from Word | Lists, tables, styles, images, footnotes preserved | P1 | M2 |
| CLP-004 | Paste from Excel/Google Sheets |  | P1 | M2 |
| CLP-005 | Paste from Google Docs |  | P1 | M2 |
| CLP-006 | Paste Markdown → rich text | Auto‑detect | P1 | M2 |
| CLP-007 | Paste images from clipboard | Screenshots, upload automatically | P0 | M1 |
| CLP-008 | Paste options popover ★ | "Keep formatting / Match style / Text only" like Word | P2 | M2 |
| CLP-009 | Copy as Markdown / HTML ★ |  | P2 | M2 |

## Productivity

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| PRD-001 | Find & replace | Regex, match case, whole word, replace all; works in collab | P1 | M2 |
| PRD-002 | Word & character count | Live, selection count, reading time ★ | P0 | M1 |
| PRD-003 | Mentions (@user, #tag) | Async feed provider, custom renderer | P1 | M2 |
| PRD-004 | Templates | Insert predefined document/snippet templates | P1 | M2 |
| PRD-005 | Merge fields / merge tags | `{{first_name}}`, preview with data, fill‑in API, export with values | P1 | M2 |
| PRD-007 | Autosave | Debounced save adapter, "unsaved changes" guard | P0 | M1 |
| PRD-008 | Source code editing | HTML/Markdown source view with syntax highlight, validation | P1 | M2 |
| PRD-009 | Fullscreen / distraction‑free mode |  | P1 | M2 |
| PRD-010 | Keyboard shortcut help dialog | Searchable list | P0 | M1 |
| PRD-011 | Command palette ★ | Ctrl/Cmd+Shift+P, run any command | P2 | M2 |
| PRD-014 | Date/time insert | Locale formatted | P2 | M2 |
| PRD-015 | Content statistics & SEO ★ | Readability score, heading structure, keyword density | P3 | M4 |
| PRD-016 | Print | Print stylesheet, print preview | P1 | M3 |

## Math & Scientific Equation Editor

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| MATH-001 | Inline & block (display) equations | Inline in text (`$…$`) and centered display blocks (`$$…$$`); convert between them | P1 | M1 |
| MATH-002 | LaTeX input with live preview | Split source/preview, syntax highlight, autocomplete of commands (`\frac`, `\int` …), inline error messages | P1 | M1 |
| MATH-003 | Visual (WYSIWYG) equation editor | Structured editing: cursor moves inside fractions, exponents, roots, matrices; no LaTeX knowledge needed | P1 | M1 |
| MATH-004 | Symbol & template palettes | Tabs: basic, Greek, operators, relations, arrows, sets & logic, brackets, accents, big operators, functions, calculus, matrices, chemistry; searchable; recent/favorites | P1 | M1 |
| MATH-005 | Virtual math keyboard | On‑screen keyboard for touch/mobile, layouts per subject (numeric, algebra, calculus, Greek) | P1 | M1 |
| MATH-006 | Markdown/inline triggers | `$…$`, `$$…$$`, `\( \)`, `\[ \]` auto‑convert while typing or pasting | P1 | M1 |
| MATH-007 | AsciiMath / plain‑text shorthand ★ | Type `sqrt(x^2+1)/2` or `sum_(i=1)^n i` → rendered math | P2 | M1 |
| MATH-011 | Arithmetic & algebra | Fractions (nested, continued), powers, sub/superscripts, roots (nth), absolute value, floor/ceil, ±, ∓, inequalities, polynomials | P1 | M1 |
| MATH-012 | Calculus | Limits, derivatives (Leibniz, prime, dot), partial derivatives, single/double/triple/contour integrals with bounds, sums, products, series | P1 | M1 |
| MATH-013 | Matrices & arrays | Any size; pmatrix/bmatrix/vmatrix/Bmatrix; determinants; add/remove rows & columns; augmented matrices; dots (⋯ ⋮ ⋱) | P1 | M1 |
| MATH-014 | Piecewise / cases & systems of equations | `cases`, aligned systems with braces | P1 | M1 |
| MATH-015 | Multi‑line & aligned equations | align, gather, multline, split; step‑by‑step derivations aligned on `=` | P1 | M1 |
| MATH-016 | Linear algebra, vectors & tensors | Bold/arrow vectors, hats, norms, dot/cross products, transposes, indices | P1 | M1 |
| MATH-017 | Sets, logic & discrete math | ∀ ∃ ∈ ⊂ ∪ ∩ ∅, ℕℤℚℝℂ (blackboard bold), binomials, modular arithmetic | P1 | M1 |
| MATH-018 | Statistics & probability | Σ notation, expectation, variance, distributions, combinatorics, overline/hat estimators | P1 | M1 |
| MATH-019 | Trigonometry & functions | sin/cos/tan…, inverse/hyperbolic, log/ln/exp, custom operator names | P1 | M1 |
| MATH-020 | Accents, decorations & styles | hat, bar, tilde, dot, vec, overbrace/underbrace, cancel/strikeout, colors, boxed, mathcal/mathfrak/mathscr | P1 | M1 |
| MATH-021 | Physics & units ★ | Units with correct spacing (`\SI{9.8}{m/s^2}`), bra‑ket notation, physical constants | P2 | M2 |
| MATH-022 | Chemistry (mhchem) | Formulas, ions, isotopes, reaction arrows (→ ⇌), states, conditions above arrows | P2 | M2 |
| MATH-023 | Custom macros | `\newcommand` per document; org‑wide macro library | P2 | M2 |
| MATH-024 | RTL / Arabic math notation & localized digits ★ | Arabic mathematical notation, Bangla/Eastern‑Arabic numerals option | P3 | M4 |
| MATH-025 | Equation numbering & cross‑references | Auto (1), (2.3) by section, `\label`/`\ref`, "see Eq. (4)" links | P2 | M3 |
| MATH-026 | Equation inside tables, lists, headings, captions, footnotes |  | P1 | M2 |
| MATH-029 | Copy equation as LaTeX / MathML / image | Context menu | P1 | M1 |
| MATH-030 | Paste LaTeX, MathML, AsciiMath | Auto‑detect | P1 | M1 |
| MATH-031 | Import Word equations (OMML) | From DOCX import and paste from Word; stays editable | P1 | M3 |
| MATH-032 | Import MathType equations ★ | MathType objects in DOCX → editable equations | P2 | M3 |
| MATH-033 | Export to DOCX as native Word equations (OMML) | Editable in Microsoft Word | P1 | M3 |
| MATH-034 | Export to PDF as vector math | Crisp at any zoom, selectable/accessible (tagged with MathML in PDF 2.0) | P1 | M3 |
| MATH-035 | HTML output options | MathML, SVG, or KaTeX HTML; LaTeX source kept in data attribute | P1 | M1 |
| MATH-036 | Markdown & LaTeX document export ★ | `$…$` in Markdown; full `.tex` export of the document | P2 | M3 |
| MATH-037 | Screen‑reader speech for math | MathML + speech text (ClearSpeak/MathSpeak); explore equation part‑by‑part | P1 | M1 |
| MATH-038 | Keyboard navigation inside equations | Arrow keys through structure; full editing without mouse | P1 | M1 |
| MATH-039 | Braille output (Nemeth / UEB) ★ | For refreshable braille displays | P3 | M4 |
| MATH-040 | Alt text auto‑generated from equation |  | P2 | M2 |
| MATH-041 | Evaluate & simplify (CAS) ★ | Select expression → evaluate, simplify, expand, factor, solve; result inserted as new line | P3 | M4 |
| MATH-042 | Function graph block ★ | Plot `y = f(x)`, parametric/polar, multiple functions, zoom/pan; exported as SVG | P3 | M4 |
| MATH-044 | Syntax validation | Unbalanced braces, unknown commands highlighted before insert | P1 | M1 |
| MATH-045 | Lazy‑loaded math engine & render cache | Math code loaded only when a doc contains/inserts math; rendered output cached by LaTeX hash; 1,000 equations per doc stay smooth | P1 | M1 |

## Spelling, Grammar & Language Quality

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| SPL-001 | Native browser spellcheck support |  | P0 | M1 |
| SPL-002 | Spell checker (as‑you‑type) | Own service, Hunspell dictionaries, 30+ languages incl. Bangla | P2 | M3 |
| SPL-004 | Custom dictionaries | Per user / org, ignore words | P2 | M3 |
| SPL-005 | Autocorrect | Common typos, capitalization | P2 | M3 |
| SPL-006 | Language detection & per‑paragraph language ★ | `lang` attribute per block, used by spellcheck & screen readers | P2 | M3 |

## Page Layout & Document Mode

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| PAG-001 | Document (paper) editor UI | Word‑like page canvas | P1 | M3 |
| PAG-002 | Live pagination | Real page breaks computed on screen, page numbers | P1 | M3 |
| PAG-003 | Page setup | Size (A4, Letter, Legal…), orientation, margins | P1 | M3 |
| PAG-004 | Headers & footers | Different first page, odd/even, page number fields | P1 | M3 |
| PAG-005 | Section breaks ★ | Different orientation/margins per section | P2 | M3 |
| PAG-006 | Watermark | Text/image watermark ("DRAFT") | P2 | M3 |
| PAG-007 | Rulers & tab stops ★ | Word‑style horizontal ruler | P3 | M3 |
| PAG-008 | Zoom | 50%–200%, fit width | P1 | M3 |
| PAG-009 | Multi‑column text sections ★ | Newspaper columns | P3 | M3 |
| PAG-010 | Line numbering ★ | Legal/court documents | P3 | M3 |

## Import / Export & Conversion

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| CNV-001 | HTML input/output | Clean, semantic, configurable | P0 | M1 |
| CNV-002 | JSON document model I/O | Versioned schema, migrations | P0 | M1 |
| CNV-003 | Markdown input/output | GFM, tables, task lists, front‑matter | P0 | M1 |
| CNV-004 | Import from Word (DOCX) | Styles, lists, tables, images, comments, tracked changes, footnotes, headers/footers | P1 | M3 |
| CNV-005 | Export to Word (DOCX) | Includes comments, suggestions, page setup, headers/footers, TOC | P1 | M3 |
| CNV-006 | Export to PDF | Pixel‑accurate, fonts embedded (Bangla/Arabic/CJK shaping), PDF/A, tagged PDF (a11y) | P1 | M3 |
| CNV-007 | Client‑side conversion via WASM ★ | DOCX/PDF in the browser, no server — privacy + zero latency | P2 | M3 |
| CNV-009 | ODT, RTF, EPUB, plain text export |  | P2 | M3 |
| CNV-011 | Email‑safe HTML export | Inline CSS, table layout fallback | P2 | M3 |

## Accessibility & Compliance

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| A11Y-001 | WCAG 2.2 AA editor UI | Full keyboard nav, focus management, ARIA, contrast | P0 | M1 |
| A11Y-002 | Screen reader support | NVDA, JAWS, VoiceOver, TalkBack tested; live announcements | P0 | M1 |
| A11Y-003 | Accessibility help dialog | Shortcut list | P0 | M1 |
| A11Y-004 | Content accessibility checker ★ | Missing alt, heading order, contrast, table headers, link text — with one‑click fixes | P2 | M3 |
| A11Y-005 | Accessible output | Semantic HTML, tagged PDF, DOCX alt text | P1 | M3 |
| A11Y-006 | High contrast & reduced motion themes |  | P1 | M2 |
| A11Y-007 | Section 508 / EN 301 549 VPAT | Documentation | P1 | M3 |

## Internationalization

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| I18N-001 | UI translations | 40+ languages, community translation workflow | P0 | M1 |
| I18N-002 | RTL support | Arabic, Hebrew, Urdu; mirrored UI | P0 | M1 |
| I18N-003 | Bidirectional text | Mixed LTR/RTL paragraphs, direction per block | P1 | M2 |
| I18N-004 | IME composition | CJK, Bangla, Hindi, Vietnamese, Android GBoard — tested matrix | P0 | M1 |
| I18N-005 | Complex script shaping in exports ★ | Bangla/Devanagari/Arabic correct in PDF/DOCX | P1 | M3 |
| I18N-006 | Locale‑aware formatting | Dates, numbers, quotes | P2 | M2 |

## UI / UX & Customization

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| UI-001 | Editor types | Classic (toolbar), Inline, Balloon, Balloon‑block, Decoupled, Document (paper), Multi‑root | P0 | M1 |
| UI-002 | Toolbar | Grouping, overflow wrap/"more" menu, sticky, custom buttons/dropdowns | P0 | M1 |
| UI-003 | Contextual balloon toolbars | Link, image, table toolbars | P0 | M1 |
| UI-004 | Menu bar (File/Edit/Insert/Format) | Word‑like | P1 | M2 |
| UI-005 | Theming | CSS variables, light/dark/auto, brand tokens | P0 | M1 |
| UI-006 | Headless mode ★ | Use engine + commands with your own UI (React hooks / Vue composables) | P1 | M1 |
| UI-007 | Pre‑built React/Vue UI components | Toolbar, menus, pickers usable separately | P1 | M2 |
| UI-008 | Mobile & touch optimized | Mobile toolbar, touch selection handles, iOS/Android keyboards | P1 | M2 |
| UI-009 | Responsive layouts | Collapsible sidebar/toolbar | P0 | M1 |
| UI-010 | Word count/status bar |  | P1 | M1 |
| UI-011 | Custom icons | Icon set replacement | P1 | M1 |
| UI-012 | Character/content limits | Max length with warning UI | P1 | M2 |

## Developer Experience & APIs

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| DX-001 | TypeScript‑first API & full type definitions |  | P0 | M1 |
| DX-002 | Framework integrations | React, Vue 3, Angular, Svelte, Solid, Web Component, vanilla; Next.js/Nuxt SSR‑safe | P0 | M1 |
| DX-003 | Plugin / extension API | Schema, commands, keymaps, input rules, node views, UI components | P0 | M1 |
| DX-004 | Schema & content filtering (GHS) | Allowlist elements/attributes/classes/styles | P0 | M1 |
| DX-005 | Events & observable state | onChange, onSelection, onFocus, transaction hooks | P0 | M1 |
| DX-006 | Online builder ★ | Pick features → download/npm config/CDN snippet | P1 | M2 |
| DX-007 | CDN & npm distribution | ESM, tree‑shakeable, CDN with SRI | P0 | M1 |
| DX-008 | Devtools extension ★ | Inspect model, transactions, schema, collab state | P1 | M2 |
| DX-009 | Server‑side (Node) document API | Headless editor in Node for transforms/validation | P1 | M3 |
| DX-012 | Docs site | Guides, API reference (auto‑generated), live examples, recipes | P0 | M1 |
| DX-013 | Migration guides & importers ★ | From CKEditor 4/5, TinyMCE, Quill content & config | P2 | M2 |
| DX-014 | Coding‑agent skills / llms.txt ★ | AI‑friendly docs so coding agents integrate correctly | P2 | M2 |
| DX-015 | Starter templates | Next.js, Laravel, .NET, Spring, Django examples | P1 | M2 |

## Security (product features)

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| SEC-001 | XSS‑safe content model | Schema allowlist, URL scheme allowlist, no `on*` attrs | P0 | M1 |
| SEC-002 | CSP & Trusted Types compatible | No `eval`, optional no inline styles | P0 | M1 |

## Flutter SDK ★

| ID | Feature | Details | Priority | Milestone |
|---|---|---|---|---|
| FLT-001 | Flutter package on pub.dev | Android, iOS, Web, macOS, Windows, Linux; Dart 3, null‑safe | P1 | M2 |
| FLT-002 | `AxiomTextEditor` widget with full feature parity | Same engine as web: formatting, tables, media, paste, page layout, **math editor** | P1 | M2 |
| FLT-003 | Typed Dart controller API | `getHtml/getJson/getMarkdown`, `setContent`, `execute(command)`, `canExecute`, undo/redo, focus | P1 | M2 |
| FLT-004 | Dart events & streams | `onChange`, `onSelectionChange`, `onFocus/onBlur`, `onReady`, debounced content stream | P1 | M2 |
| FLT-005 | Native Flutter toolbar & UI widgets | Material 3 and Cupertino toolbars, bottom sheets, color/font pickers; or use the built‑in web toolbar | P1 | M2 |
| FLT-006 | Mobile‑first UX | Keyboard‑avoiding toolbar above the soft keyboard, selection handles, haptics, scroll into view | P1 | M2 |
| FLT-007 | Native math input on mobile | Math keyboard as a Flutter widget, palettes in bottom sheets, LaTeX/visual toggle | P1 | M2 |
| FLT-008 | Media from device | Image/video/file pickers, camera capture, Dart upload adapter (your API, S3, Firebase) | P1 | M2 |
| FLT-009 | Theming from `ThemeData` | Light/dark, colors, typography mapped to editor CSS variables | P1 | M2 |
| FLT-010 | Localization & RTL from Flutter | Uses app `Locale` and `Directionality`; Bangla/Arabic input | P1 | M2 |
| FLT-011 | Export & share | DOCX, PDF, Markdown, HTML saved to files or the system share sheet | P1 | M3 |
| FLT-012 | Native read‑only renderer ★ | Render the editor's JSON (incl. math & tables) as Flutter widgets, no WebView; ideal for feeds, chat, lists | P2 | M3 |
| FLT-013 | Offline bundled engine | Editor JS/CSS/fonts shipped inside the package, no CDN or network needed | P1 | M2 |
| FLT-014 | Dart plugin API | Custom toolbar buttons, custom commands, custom content nodes rendered by Flutter widgets | P2 | M3 |
| FLT-015 | Accessibility | TalkBack/VoiceOver inside the editor; semantics on native toolbar widgets | P1 | M2 |
| FLT-016 | Performance | Pre‑warmed/pooled WebView, editor ready < 300 ms on mid‑range Android, batched bridge messages | P1 | M2 |
| FLT-017 | Bridge security | Typed message allowlist, no `eval` of strings from Dart, external navigation blocked, strict CSP inside the WebView | P0 | M2 |
| FLT-018 | Example app, docs & pub.dev quality | Full demo app (notes, math homework, document), API docs, high pub.dev score | P1 | M2 |

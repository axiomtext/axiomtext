# 07 — Goal 1: The Free Rich Text + Math Editor

> **Goal 1:** ship a **completely free, open‑source** rich text editor with **every editing feature CKEditor 5, TinyMCE, Tiptap and Froala offer** plus a **full math equation editor**, with no paywalls, no license key and no editor‑load limits.

Everything in `02-feature-list.md` marked **`FREE`** is in scope: **223 features**, 39 of them math and 18 for the **official Flutter SDK**.

---

## 1. What "free" means here

| Promise | How |
|---|---|
| Free forever, for commercial use too | **MIT license** (not GPL like CKEditor 5 and TinyMCE) |
| No license key, no sign‑up | Works straight from npm or CDN (jsDelivr/unpkg) |
| No limits | No editor‑load counting, no feature tiers inside Goal 1 |
| No servers needed | Every Goal 1 feature runs **in the browser**, including math, DOCX and PDF export |
| Privacy | No telemetry by default; documents never leave the user's browser |
| Never taken back | Goal 1 features will never move behind a paywall later (written in the README) |

---

## 2. Scope

### Included (223 features)
| Area | Features | Notes |
|---|---|---|
| Core editing & formatting | 25 | Everything from bold to format painter |
| Blocks & structure | 17 | Headings, code blocks, callouts, slash menu, TOC, footnotes |
| Lists | 6 | Incl. legal multi‑level numbering |
| Tables | 15 | Merge/split, properties, paste from Excel, formulas |
| Images & media | 13 | Upload adapters, editing, embeds, video, diagrams |
| Links | 4 | |
| Clipboard & paste | 9 | Paste from Word / Excel / Google Docs |
| Productivity | 13 | Find & replace, mentions, templates, merge fields, source view |
| **Math editor** | **39** | Visual + LaTeX + AsciiMath + palettes + keyboard; all notation; Word equations in/out; accessible math; CAS & graphs |
| Spelling | 5 | Browser spellcheck + client‑side Hunspell (WASM) dictionaries incl. Bangla |
| Page layout | 10 | Pagination, page setup, headers/footers, watermark, rulers |
| Import/export | 9 | HTML, JSON, Markdown, **DOCX import/export, PDF export, ODT/RTF/EPUB** — all client‑side |
| Accessibility | 7 | WCAG 2.2 AA, accessibility checker |
| Internationalization | 6 | RTL, bidi, IME, Bangla/Arabic/CJK |
| UI / UX | 12 | Classic, inline, balloon, decoupled, document, headless |
| Developer experience | 13 | TypeScript, React/Vue/Angular/Svelte, plugin API, builder, devtools |
| Security | 2 | XSS‑safe model, CSP/Trusted Types |
| **Flutter SDK** | **18** | Same editor + math on Android, iOS, Web, desktop; Dart API; native toolbar & math keyboard; native read‑only renderer |

### Not in Goal 1 (and why)
| Feature | Reason | Later goal |
|---|---|---|
| Real‑time collaboration, comments sync, live cursors (COL‑*, FLT‑019) | Needs a server | Goal 2: free self‑hosted collab server + optional hosted cloud |
| AI features (AI‑*, MATH‑008/009/010/043, MED‑012) | Needs paid model APIs | Goal 3: bring‑your‑own‑key AI plugin (can still be free) |
| Link previews & link checker (LNK‑004/005) | Server fetch | Goal 2 |
| Server conversion API, PDF import, Google Docs (CNV‑008/010/012) | Server/API | Goal 3 |
| Grammar checker (SPL‑003) | AI/server | Goal 3 |
| File manager, dashboard, SSO, compliance (FIL‑*, PLT‑*, SEC‑003…006) | Platform | Goal 4 |

> Comments and track changes **without** real‑time (stored by the host app) can be pulled into Goal 1 later if users ask for them. They are client‑side and fit the free model.

---

## 3. Milestones

Estimates assume ~10–12 engineers working full‑time on this. With all 20, run M2 and M3 work in parallel and shorten by ~30%.

### M0: Foundation (weeks 1–4)
- Monorepo, CI, MIT license, code of conduct, contributing guide, license scanning.
- ProseMirror facade, plugin system, schema v1, playground, design tokens.
- Test corpora started: 500 equations, 300 Word/Google Docs paste samples, 300 DOCX files.

### M1: v0.1 public alpha, "Core + Math" (month 3)
- Core formatting, headings, lists, to‑do, basic tables, images, links, undo/redo, autoformat, paste cleanup.
- **Math v1:** inline/block equations, LaTeX mode with autocomplete, visual editor, palettes, virtual keyboard, `$…$` triggers, AsciiMath, algebra/calculus/matrices/cases/aligned/sets/statistics/trig/accents, copy/paste LaTeX & MathML, screen‑reader speech, validation, lazy loading.
- HTML / JSON / Markdown I/O; classic, inline, balloon editors; dark mode; RTL + Bangla input.
- React + Vue packages, docs site, live demo.
- **Launch:** GitHub + npm + demo site + announcement post.

### M2: v0.5 beta, "Feature parity" (month 6)
- Advanced tables, paste from Word/Excel/Google Docs, media embeds, video, attachments, image editing.
- Find & replace, mentions, slash menu, block handle, templates, merge fields, source view, code blocks, emoji, special characters, format painter, restricted editing, command palette.
- Math: physics units, chemistry, macros, equations in tables/captions, auto alt text.
- Menu bar, decoupled editor, mobile/touch, Angular + Svelte, online builder, devtools.
- Migration guides: "Replace CKEditor / TinyMCE in 10 minutes".
- **Flutter SDK beta:** `AxiomTextEditor` widget, Dart controller & events, native toolbar, mobile UX, math keyboard, media pickers, theming, RTL, offline bundle, example app (FLT‑001…010, 013, 015…018). Android, iOS and Flutter Web first.

### M3: v1.0, "Documents" (month 9)
- Pagination, page setup, headers/footers, sections, watermark, zoom, print, rulers.
- TOC, outline, footnotes, captions & cross‑refs, legal numbering, Word‑style styles.
- **Client‑side DOCX import/export** (own TypeScript writer/importer) including **Word equations (OMML)** and MathType import.
- **PDF export:** print‑to‑PDF with page styles in v1.0, programmatic vector PDF export in v1.1.
- Math: equation numbering & references, `.tex` export.
- Client‑side spell checker, accessibility checker.
- **Flutter SDK 1.0:** desktop platforms, export & share, native read‑only renderer, Dart plugin API (FLT‑011, 012, 014).

---

### M4: v1.1–1.2, "Extras" (month 11–12)
- Programmatic vector PDF export, columns, block mode, table sort/formulas, gallery, diagrams, multi‑cursor, SEO panel.
- Math: CAS evaluate/simplify/solve, function graphs, braille output, Arabic math notation.

Detailed sprint‑by‑sprint guide: `goal-1/02-development-guide.md`.

---

## 4. Licensing rules (protect the free promise)
- [ ] Project license: **MIT**. Contributions under DCO sign‑off.
- [ ] Allowed dependencies: MIT, Apache‑2.0, BSD, ISC, MPL‑2.0 (file‑level only). **No GPL/AGPL** dependencies in shipped packages.
- [ ] **Never copy code** from CKEditor 5 or TinyMCE (GPL) or Tiptap Pro (commercial). Use their public docs and demos only to compare features.
- [ ] License scanner in CI (`license-checker` for npm, `cargo-deny` for Rust).
- [ ] Bundled fonts (Noto for Bangla, Arabic, CJK and math) under SIL OFL.

Key free building blocks: webview_flutter (BSD‑3) or flutter_inappwebview (Apache‑2.0) for Flutter, ProseMirror (MIT), MathLive (MIT), KaTeX (MIT), MathJax (Apache‑2.0), Temml (MIT), Compute Engine (MIT), Shiki (MIT), DOMPurify (Apache‑2.0/MPL), Lit (BSD‑3).

---

## 5. Go-to-market & sustainability

Kept in the private `axiomtext/internal` repo.

---

## 6. Goal 1 checklist (summary)
Detailed items: `05-feature-checklist.md`. Every `FREE` feature must also meet the Definition of Done.
- [ ] M0 Foundation complete
- [ ] M1 v0.1 "Core + Math" released
- [ ] M2 v0.5 "Feature parity" released
- [ ] M3 v1.0 "Documents" released
- [ ] M4 v1.1–1.2 "Extras" released
- [ ] All 223 `FREE` features done
- [ ] Flutter SDK published on pub.dev; example app on Android, iOS, Web
- [ ] Math corpus (500 equations) passes in editor, HTML, DOCX, PDF
- [ ] Paste corpus (300 Word/Google Docs samples) passes
- [ ] DOCX round‑trip corpus ≥ 95% visual match
- [ ] WCAG 2.2 AA audit passed
- [ ] License scan clean (no GPL/AGPL)
- [ ] Docs, demo, migration guides and comparison pages live

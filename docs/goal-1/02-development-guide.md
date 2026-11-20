# Goal 1 — Phase‑by‑Phase Development Guide

How to build the free MIT editor (web + math + Flutter) from an empty folder to v1.2.
Feature IDs refer to `01-feature-list.md`.

| Milestone | Release | Duration | Ends |
|---|---|---|---|
| M0 | Foundation | 4 weeks | Month 1 |
| M1 | v0.1 alpha — Core + Math (82 features) | 8 weeks | Month 3 |
| M2 | v0.5 beta — Feature parity + Flutter beta (85) | 12 weeks | Month 6 |
| M3 | v1.0 — Documents + Flutter 1.0 (44) | 12 weeks | Month 9 |
| M4 | v1.1–1.2 — Extras (12) | 8–12 weeks | Month 11–12 |

Assumes ~10–12 people. Work in **2‑week sprints**, ending each sprint with a demo in the playground.

---

## 0. Infrastructure you need (no backend server)

| Need | Use | Cost |
|---|---|---|
| Code hosting + CI | GitHub (public repo) + GitHub Actions | Free for public repos |
| JS package distribution | npm organization `@axiomtext` (`@axiomtext/core`, `@axiomtext/math`, …) | Free for public packages |
| CDN for `<script>` users | jsDelivr / unpkg (serve npm packages automatically) | Free |
| Flutter distribution | pub.dev with a **verified publisher** | Free (needs a domain) |
| Docs + demo + playground site | Cloudflare Pages / GitHub Pages / Vercel / Netlify (static) | Free tier |
| **Domain name** | `axiomtext.dev` ✅ purchased — `docs.`, `demo.`, `play.` subdomains | ~$10–20 per year |
| Email on domain | `security@`, `hello@` via Cloudflare Email Routing or Zoho free | Free |
| Error/issue tracking | GitHub Issues + Discussions | Free |

**There is no backend server, no database and no API in Goal 1.** Image uploads go to the host app's own upload URL (the developer supplies an upload adapter); in the demo, images are stored as base64 in the browser.

---

## M0 — Foundation (weeks 1–4)

**Goal:** a repository where writing good, safe, fast code is the easy path.

### Week 1: repository & tooling
1. Create the GitHub org and public repo, add `LICENSE` (MIT), `README`, `CODE_OF_CONDUCT`, `CONTRIBUTING`, `SECURITY.md`.
2. Set up the monorepo:
   ```bash
   pnpm init
   pnpm add -Dw turbo typescript vitest @playwright/test eslint prettier @changesets/cli size-limit
   npx changeset init
   ```
3. Create the folder skeleton:
   ```
   text_editor/
   ├── apps/
   │   ├── playground/     # Vite app with every feature, used for dev + e2e
   │   └── website/        # docs + demo (Astro Starlight)
   ├── packages/
   │   ├── core/           # schema, commands, plugin system, events (no DOM)
   │   ├── view/           # DOM view, input, clipboard
   │   ├── ui/             # Lit web components, theme, icons
   │   ├── i18n/
   │   ├── plugins/        # one folder per feature
   │   ├── math/
   │   ├── convert/        # html, markdown, docx, pdf (client-side)
   │   ├── presets/        # classic, inline, balloon, document
   │   ├── react/ vue/ angular/ svelte/
   │   ├── bridge-protocol/   # TS + Dart message types (Flutter)
   │   ├── flutter/        # Dart package
   │   ├── test-utils/
   │   └── config/         # shared eslint, tsconfig, vitest
   ├── e2e/
   ├── benchmarks/
   ├── corpora/            # test documents: equations, paste samples, docx
   └── docs/
   ```
4. Shared `tsconfig` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.

### Week 2: CI and quality gates
- GitHub Actions workflow: install → lint → typecheck → unit tests → build → size‑limit → Playwright (Chromium, Firefox, WebKit).
- Security & license: CodeQL, Dependabot/Renovate, `license-checker` failing on GPL/AGPL.
- Branch protection on `main`: PR required, CI green, 1 review (2 for `core`/`view`).
- Conventional commits + Changesets for versioning.

### Week 3: architecture decisions
- Write ADRs in `docs/adr/`: ProseMirror behind our own API, JSON as canonical format, plugin‑per‑package, Web Components UI, MathLive + KaTeX for math, WebView engine for Flutter, MIT‑only dependencies.
- Define **document schema v1** (JSON) with a `version` field and a migration function.
- Define the **plugin contract**: `name`, `schema`, `commands`, `keymaps`, `inputRules`, `ui`, `i18n`, `toHTML/fromHTML`, `toMarkdown/fromMarkdown`.

### Week 4: skeleton running
- `core` + `view`: empty editor renders in the playground, typing works, undo/redo works.
- Design tokens (CSS variables), icon set, toolbar wireframes.
- Start the test corpora: 100 equations, 50 Word/Google Docs paste samples, 50 DOCX files (keep growing to 500/300/300).
- Benchmarks harness: typing latency, load time.

**M0 exit checklist**
- [ ] CI green with all gates (lint, types, tests, size, license, CodeQL)
- [ ] ADRs approved
- [ ] Editor renders and types in playground on 3 browsers
- [ ] Corpora folders created with first samples

---

## M1 — v0.1 alpha "Core + Math" (weeks 5–12)

**Goal:** a usable editor with basic formatting and a real math editor, public on GitHub/npm.

### Team split
| Stream | People | Owns |
|---|---|---|
| Engine | 3 | `core`, `view`, paste cleanup, IME, undo |
| Features | 3 | Formatting, lists, tables, images, links |
| Math | 2 | `math` package |
| UI & a11y | 2 | Toolbar, balloons, themes, keyboard nav |
| DX & docs | 1–2 | React/Vue wrappers, website, examples |

### Sprint plan
| Sprint | Engine | Features | Math | UI / DX |
|---|---|---|---|---|
| S1 (wk 5–6) | Command API, events, schema filtering | Bold/italic/…, headings, paragraph, blockquote | Equation nodes (inline/block), KaTeX rendering | Toolbar component, theme tokens |
| S2 (wk 7–8) | Paste sanitizer, autoformat, IME tests (CJK, Bangla, Android) | Lists, to‑do, links, auto‑link, font/color/alignment | LaTeX mode, autocomplete, `$…$` triggers, validation | Balloon toolbars, dark mode, RTL |
| S3 (wk 9–10) | HTML/JSON/Markdown I/O | Basic tables, images (upload adapter, resize, alt, caption) | MathLive visual editor, palettes, virtual keyboard | React + Vue wrappers, keyboard nav, shortcut dialog |
| S4 (wk 11–12) | Performance pass, bundle budget | Word count, autosave, remove formatting | Notation coverage tests (500 equations), copy/paste LaTeX/MathML, speech for screen readers | Website + live demo + quick start docs |

### How to build each feature (repeat for every feature)
1. Create `packages/plugins/<feature>/` from the plugin template.
2. Define schema nodes/marks → commands → keymaps/input rules → UI → i18n strings.
3. Add HTML + Markdown conversion for the feature.
4. Tests: unit (commands), integration (undo, paste), e2e (user flow), axe accessibility.
5. Add it to the playground and docs with a live example.
6. Check the **Definition of Done** (see bottom).

### M1 release steps
1. `pnpm changeset version` → `pnpm build` → `pnpm publish -r --provenance`.
2. Deploy the website (docs + demo) to static hosting on your domain.
3. Write a launch post: "A free MIT editor with a real math editor".
4. Post to GitHub, dev.to, Reddit r/webdev, Show HN.

**M1 exit checklist**
- [ ] All 82 M1 features done
- [ ] Typing latency p95 < 16 ms; core + view ≤ 70 KB gzip (incl. engine, ADR‑0008)
- [ ] 500‑equation math corpus renders correctly
- [ ] WCAG 2.2 AA check of toolbar and dialogs
- [ ] npm packages published; demo site live

---

## M2 — v0.5 beta "Feature parity" + Flutter beta (weeks 13–24)

**Goal:** match CKEditor/TinyMCE everyday editing features; Flutter developers can use it.

### Team split
| Stream | People | Owns |
|---|---|---|
| Tables & paste | 3 | Advanced tables, paste from Word/Excel/Google Docs |
| Productivity | 2 | Find & replace, mentions, slash menu, templates, merge fields, source view, code blocks |
| Media & math | 2 | Media embeds, video, attachments, image editing; physics/chemistry/macros |
| UI & DX | 2 | Menu bar, decoupled editor, mobile/touch, Angular/Svelte, builder, devtools |
| Flutter | 2 | Bridge protocol, Dart package, native toolbar, math keyboard |

### Sprint plan
| Sprint | Focus |
|---|---|
| S5 (wk 13–14) | Table resize & properties · paste from Word (lists, tables, styles) · slash menu · bridge protocol + code generation |
| S6 (wk 15–16) | Multi‑cell table ops · paste from Excel & Google Docs · find & replace · Flutter `AxiomTextEditor` widget on Android/iOS with bundled engine |
| S7 (wk 17–18) | Mentions, templates, merge fields · media embeds, video, attachments · Dart controller API & events |
| S8 (wk 19–20) | Code blocks, emoji, special chars, format painter, restricted editing · Material/Cupertino toolbars, mobile UX, math keyboard in Flutter |
| S9 (wk 21–22) | Menu bar, decoupled editor, mobile/touch, command palette · math physics units, chemistry, macros · Flutter Web + theming + RTL |
| S10 (wk 23–24) | Angular & Svelte · online builder · devtools · migration guides from CKEditor/TinyMCE · Flutter example app + pub.dev publish |

### Key techniques
- **Paste from Word:** build a normalization pipeline (Word HTML → clean HTML → schema). Test it against the paste corpus; every bug becomes a new corpus sample.
- **Flutter:** the editor engine is bundled as a `flutter` preset in CI and copied into `packages/flutter/assets/`. The Dart side never builds JavaScript.
- **Migration:** write content converters from CKEditor and TinyMCE HTML plus a config mapping table.

**M2 exit checklist**
- [ ] All 85 M2 features done
- [ ] Paste corpus (300 samples) ≥ 95% pass
- [ ] Flutter package on pub.dev (beta), example app on Android, iOS and Web
- [ ] 20+ UI languages
- [ ] Comparison page vs CKEditor/TinyMCE/Tiptap/Froala live

---

## M3 — v1.0 "Documents" + Flutter 1.0 (weeks 25–36)

**Goal:** Word‑like documents (pages, headers, TOC, footnotes) and Word/PDF import‑export, all in the browser.

### Team split
| Stream | People | Owns |
|---|---|---|
| Page layout | 3 | Pagination, page setup, headers/footers, sections, watermark, rulers, print |
| Word/PDF conversion | 3 | DOCX writer & importer (TypeScript), PDF export, ODT/RTF/EPUB |
| Document structure & math | 2 | TOC, outline, footnotes, captions, legal numbering, equation numbering, OMML, MathType |
| Quality tools | 1 | Client spell checker (Hunspell WASM), accessibility checker |
| Flutter | 2 | Desktop platforms, export & share, native read‑only renderer, Dart plugin API |

### Sprint plan
| Sprint | Focus |
|---|---|
| S11 (wk 25–26) | Pagination engine (incremental, measures in batches) · DOCX writer: paragraphs, styles, lists |
| S12 (wk 27–28) | Page setup, headers/footers · DOCX writer: tables, images, footnotes · Flutter desktop |
| S13 (wk 29–30) | Sections, watermark, zoom, print · DOCX importer · Word equations (OMML) in/out |
| S14 (wk 31–32) | TOC, outline, footnotes, captions/cross‑refs, legal numbering · PDF export via print styles · Flutter export & share |
| S15 (wk 33–34) | Equation numbering, MathType import, `.tex` export · spell checker · Flutter native renderer |
| S16 (wk 35–36) | Accessibility checker · ODT/RTF/EPUB · DOCX round‑trip corpus fixes · v1.0 hardening |

### Key techniques
- **DOCX:** export from your own JSON model with a TypeScript DOCX writer (you control the input, so it's predictable). Import maps only features your editor supports. Run both in a Web Worker.
- **PDF v1.0:** print the paginated view with print CSS (`@page`, page counters). Programmatic vector PDF export is an M4 item.
- **Fonts:** bundle Noto fonts (Bangla, Arabic, CJK, Math) as lazy‑loaded assets.

**M3 exit checklist**
- [ ] All 44 M3 features done
- [ ] DOCX round‑trip corpus (300 files) ≥ 95% visual match
- [ ] 100‑page DOCX export < 3 s in the browser
- [ ] Flutter 1.0 on all six platforms
- [ ] External accessibility audit passed
- [ ] **v1.0 launch:** Product Hunt, Hacker News, Flutter community, edtech communities

---

## M4 — v1.1–1.2 "Extras" (weeks 37–48)

| Sprint | Focus |
|---|---|
| S17–S18 | Programmatic vector PDF export · columns/layout blocks · block (Notion‑style) mode |
| S19–S20 | Table sort/filter and formulas · image gallery · diagram blocks (Mermaid) |
| S21–S22 | Math: CAS evaluate/simplify/solve, function graphs, braille output, Arabic math notation · multi‑cursor · SEO/readability panel |

**M4 exit checklist**
- [ ] All 12 M4 features done → **Goal 1 complete (223 features)**
- [ ] Plan Goal 2 (free self‑hosted collaboration server)

---

## Definition of Done (every feature)
- [ ] Typed public API with TSDoc; no internal types leaked
- [ ] Unit + integration + e2e tests; package coverage ≥ 85%
- [ ] Works in Chrome, Firefox, Safari, Edge (latest 2) + iOS Safari + Android Chrome
- [ ] Works in the Flutter WebView (for features in the Flutter preset)
- [ ] Keyboard accessible, ARIA labels, axe clean
- [ ] Strings translated via i18n; RTL checked
- [ ] Undo/redo and copy/paste correct
- [ ] HTML, JSON, Markdown (and DOCX where relevant) conversion
- [ ] No new XSS paths; parser fuzz‑tested
- [ ] Bundle impact within budget; heavy parts lazy‑loaded
- [ ] Docs page with live example; changelog entry

## Weekly rhythm
- **Monday:** sprint planning / priorities check.
- **Daily:** 15‑min standup per stream.
- **Thursday:** cross‑stream demo in the playground.
- **Every 2 weeks:** sprint review, retro, publish a `next` tag to npm for early users.
- **Every release:** changelog, blog post, update comparison page.

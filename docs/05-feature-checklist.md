# 05 — Development Checklist

Tick items as they are completed. IDs reference `02-feature-list.md`.
Each feature counts as **done** only when it meets the Definition of Done (bottom of this file).

---

## Phase 0 — Foundation
- [ ] pnpm workspace + Turborepo + Rust cargo workspace created
- [ ] Shared `tsconfig` (strict), ESLint, Prettier, Vitest presets in `packages/config`
- [ ] CI pipeline: lint · typecheck · unit · e2e (Chromium/Firefox/WebKit) · size‑limit · clippy · cargo test · cargo audit · CodeQL · secret scan
- [ ] Branch protection, CODEOWNERS, PR & issue templates, conventional commits, Changesets
- [ ] ADR‑001 … ADR‑010 written and approved
- [ ] JSON document schema v1 + versioning/migration strategy
- [ ] Threat model (STRIDE) v1
- [ ] Performance budgets defined and enforced in CI
- [ ] Design tokens, icon set, UI wireframes, a11y interaction patterns
- [ ] Playground app running
- [ ] Contribution guide & coding standards (`06-engineering-standards.md`) adopted

## Phase 1 — Core Editor MVP
### Engine
- [ ] Model facade over ProseMirror (no internal types in public API)
- [ ] Plugin system (register schema, commands, keymaps, input rules, UI, i18n)
- [ ] Command API (`editor.commands.x()`, `can()`, chaining)
- [ ] Event system (change, selection, focus, blur, transaction)
- [ ] Undo/redo with grouping (CORE‑014)
- [ ] Schema & content filtering / allowlist (DX‑004, SEC‑001)
- [ ] IME composition matrix tested (I18N‑004)
### Features
- [ ] Bold/italic/underline/strike (CORE‑001)
- [ ] Sub/superscript, inline code (CORE‑002)
- [ ] Font family, size, color, background (CORE‑003…005)
- [ ] Alignment, indent (CORE‑007, 008)
- [ ] Remove formatting (CORE‑011)
- [ ] Autoformat markdown shortcuts (CORE‑015)
- [ ] Horizontal line, page break (CORE‑021)
- [ ] Placeholder (CORE‑023)
- [ ] Headings, paragraph, blockquote (BLK‑001, 002)
- [ ] Bulleted/numbered lists, to‑do lists (LST‑001, 002)
- [ ] Basic tables: insert, rows/cols, merge/split (TBL‑001…003)
- [ ] Images: upload/paste/drop, resize, align, alt, caption, upload adapters (MED‑001…003, 008)
- [ ] Links + auto‑link (LNK‑001, 002)
- [ ] Paste plain/HTML + sanitizer, paste images (CLP‑001, 002, 007)
- [ ] Word/char count, autosave, shortcut dialog (PRD‑002, 007, 010)
### UI, I/O, platform
- [ ] Classic, inline, balloon editors (UI‑001)
- [ ] Toolbar with overflow, contextual balloons (UI‑002, 003)
- [ ] Light/dark theme via CSS variables, custom icons (UI‑005, 011)
- [ ] Headless mode API (UI‑006)
- [ ] HTML, JSON, Markdown I/O (CNV‑001…003)
- [ ] WCAG 2.2 AA UI, screen reader pass (A11Y‑001…003)
- [ ] i18n runtime + 10 languages, RTL (I18N‑001, 002)
- [ ] React + Vue wrappers (DX‑002)
- [ ] npm + CDN with SRI (DX‑007)
- [ ] CSP / Trusted Types compatible (SEC‑002)
- [ ] Docs site v1 (DX‑012)
- [ ] **Gate:** typing p95 < 16 ms · core + view ≤ 70 KB gz · core coverage ≥ 90% · 0 high/critical vulns

## Phase 2 — Pro Editing & Productivity (1.0 GA)
- [ ] Highlight pens, line height/spacing, styles dropdown (CORE‑006, 009, 019)
- [ ] Format painter, case change (CORE‑012, 013)
- [ ] Smart typography, special chars, emoji (CORE‑016…018)
- [ ] Restricted editing / read‑only (CORE‑022)
- [ ] Block drag & drop, block handle, slash menu (CORE‑025, BLK‑007, 008)
- [ ] Code blocks, callouts, accordion, HTML embed, bookmarks, show blocks (BLK‑003…005, 010, 011, 017)
- [ ] Custom widgets / node API (BLK‑016)
- [ ] List styles, start index (LST‑003, 004)
- [ ] Table resize, properties, caption, multi‑cell ops, nested, styles, responsive, virtualization (TBL‑004…009, 014, 015)
- [ ] Paste from Word / Excel / Google Docs / Markdown, paste options, copy as MD (CLP‑003…006, 008, 009, TBL‑012)
- [ ] Responsive images, image link, editing, optimization (MED‑004…007)
- [ ] Video/audio, media embed, attachments (MED‑009…011)
- [ ] Link decorators, link previews (SSRF‑safe), internal link picker (LNK‑003, 004, 006)
- [ ] Find & replace (PRD‑001)
- [ ] Mentions (PRD‑003)
- [ ] Templates, merge fields (PRD‑004, 005)
- [ ] Source editing, fullscreen, command palette (PRD‑008, 009, 011)
- [ ] Date insert (PRD‑014)
### Math editor v1
- [ ] Inline & block equation nodes, convert between them (MATH‑001)
- [ ] LaTeX mode with live preview, autocomplete, error messages (MATH‑002)
- [ ] Visual equation editor (MathLive node view) (MATH‑003)
- [ ] Symbol & template palettes, searchable (MATH‑004)
- [ ] Virtual math keyboard for touch (MATH‑005)
- [ ] `$…$` / `$$…$$` / `\(\)` triggers, AsciiMath input (MATH‑006, 007)
- [ ] Notation coverage: algebra, calculus, matrices, cases, aligned multi‑line, vectors, sets/logic, statistics, trig, accents (MATH‑011…020)
- [ ] Physics units, chemistry (mhchem), custom macros (MATH‑021…023)
- [ ] Equations inside tables/lists/headings/captions/footnotes (MATH‑026)
- [ ] Copy/paste LaTeX, MathML, AsciiMath; HTML output options (MATH‑029, 030, 035)
- [ ] Screen‑reader speech, keyboard navigation inside equations, auto alt text (MATH‑037, 038, 040)
- [ ] Syntax validation; lazy loading + render cache (MATH‑044, 045)
- [ ] Math test corpus: ≥ 500 equations across all notation areas render identically in editor, HTML, PDF, DOCX
- [ ] Security: KaTeX `trust:false`, macro expansion limits, fuzzed LaTeX parser
- [ ] Menu bar, decoupled editor, mobile/touch, high contrast (UI‑004, 008, A11Y‑006)
- [ ] Bidi text, locale formatting (I18N‑003, 006)
- [ ] Angular + Svelte wrappers, headless React hooks / Vue composables (DX‑002, UI‑007)
- [ ] Online builder, devtools, starter templates, llms.txt (DX‑006, 008, 014, 015)
- [ ] Character limits (UI‑012)
- [ ] **Gate:** 20+ UI languages · migration guide from CKEditor/TinyMCE · 1.0 launch

## Flutter SDK (Goal 1)
- [ ] Bridge protocol schema + TS/Dart code generation (contract tests)
- [ ] `flutter` editor preset built and bundled into package assets by CI
- [ ] `AxiomTextEditor` widget on Android, iOS, Flutter Web (FLT‑001, 002, 013)
- [ ] Controller API & event streams (FLT‑003, 004)
- [ ] Material & Cupertino toolbars, mobile UX, math keyboard (FLT‑005…007)
- [ ] Media pickers + Dart upload adapter (FLT‑008)
- [ ] Theming, localization, RTL (FLT‑009, 010)
- [ ] Accessibility, performance (< 300 ms ready), bridge security (FLT‑015…017)
- [ ] Example app, API docs, published on pub.dev (FLT‑018)
- [ ] Desktop: macOS, Windows, Linux (FLT‑001)
- [ ] Export & share, native read‑only renderer, Dart plugin API (FLT‑011, 012, 014)
- [ ] CI: Dart tests, golden tests, integration tests on Android & iOS emulators

## Phase 3 — Collaboration
- [ ] Yjs binding, real‑time co‑editing (COL‑001)
- [ ] Offline persistence + sync (COL‑002)
- [ ] Presence list, live cursors, follow user (COL‑003)
- [ ] Comments: threads, replies, resolve/reopen, mentions, reactions (COL‑004)
- [ ] Comments sidebar/inline/narrow, archive & filters (COL‑005, 006)
- [ ] Track changes + suggestion discussions (COL‑007, 008)
- [ ] Revision history with diff/restore (COL‑009)
- [ ] Comments, track changes and co‑editing on equations (MATH‑027, 028)
- [ ] Collaboration in the Flutter SDK (FLT‑019)
- [ ] Roles & permissions enforced server‑side (COL‑011)
- [ ] Async collaboration mode (COL‑013)
- [ ] Notifications + webhooks (COL‑014, DX‑011)
- [ ] Users API, multi‑root (COL‑015, 016)
- [ ] Collab server (Rust/yrs): auth, persistence, snapshots, compaction, NATS scaling, metrics
- [ ] Self‑hosted Docker + Helm community edition (COL‑017)
- [ ] REST API, Node server SDK, JWT helper SDKs (DX‑009, 010, PLT‑004)
- [ ] Document storage API (PLT‑011)
- [ ] **Gate:** 50 editors/doc p95 < 150 ms · convergence tests 10k sessions · chaos tests pass

## Phase 4 — Document Fidelity
- [ ] Document editor UI, pagination, page setup, headers/footers (PAG‑001…004)
- [ ] Section breaks, watermark, zoom, print (PAG‑005, 006, 008, PRD‑016)
- [ ] Outline, TOC, footnotes, captions/cross‑refs (BLK‑012…015)
- [ ] Multi‑level legal lists, list continuation (LST‑005, 006)
- [ ] Style sets mapped to DOCX styles (CORE‑020)
- [ ] Table header repeat across pages (TBL‑013)
- [ ] DOCX import/export incl. comments & suggestions (CNV‑004, 005, COL‑018)
- [ ] PDF export: tagged, PDF/A, fonts, complex scripts (CNV‑006, I18N‑005, A11Y‑005)
- [ ] WASM client conversion in worker (CNV‑007)
- [ ] Server conversion API (CNV‑008)
- [ ] ODT/RTF/EPUB/TXT (CNV‑009)
- [ ] Document compare (COL‑010)
- [ ] Equation numbering & cross‑refs (MATH‑025)
- [ ] Word OMML import/export, MathType import (MATH‑031…033)
- [ ] Vector math in PDF, Markdown/`.tex` export (MATH‑034, 036)
- [ ] **Gate:** ≥ 95% visual match on 300‑doc corpus · 100 pages < 3 s client‑side

## Phase 5 — AI
- [ ] AI gateway: adapters, streaming, metering, caps, logging policy (AI‑008, 015)
- [ ] Guardrails: prompt injection tests, schema validation (AI‑016)
- [ ] Quick actions + custom prompts (AI‑001, 002)
- [ ] AI chat sidebar (AI‑003)
- [ ] AI review, translate (AI‑004, 005)
- [ ] AI edits as tracked changes, streaming into doc (AI‑006, 007)
- [ ] Agent API, MCP, AI in comments (AI‑009, 010, 013)
- [ ] Ghost‑text autocomplete, generate structures (AI‑012, 014)
- [ ] Brand voice / style guides (AI‑011)
- [ ] Math AI: language → equation, photo → LaTeX, handwriting, explain/check steps (MATH‑008…010, 043)
- [ ] Grammar checker via AI review (SPL‑003), alt‑text generation (MED‑012)
- [ ] **Gate:** AI eval suite passes quality + safety thresholds

## Phase 6 — Enterprise & Platform
- [ ] Dashboard, usage analytics, billing (PLT‑001…003)
- [ ] SSO/SCIM, audit logs, data residency (PLT‑005…007)
- [ ] On‑prem/air‑gapped, LTS, SLA/status page (PLT‑008…010)
- [ ] Spell checker, dictionaries, autocorrect, language detection (SPL‑002, 004…006)
- [ ] Accessibility checker, VPAT (A11Y‑004, 007)
- [ ] Link checker, email‑safe export (LNK‑005, CNV‑011)
- [ ] File manager, storage backends, image pipeline, malware scan, signed URLs (FIL‑001…005)
- [ ] Encryption at rest, compliance program (SEC‑004, 006)
- [ ] Integrations: WordPress, Drupal, Laravel, .NET, Spring/Django/Rails, Electron (INT‑001…005, 007)
- [ ] Migration importers (DX‑013)
- [ ] External pentest done, findings fixed
- [ ] **Gate:** SOC 2 Type I · first enterprise customers

## Phase 7 — Differentiation & Ecosystem
- [ ] Block mode, columns, gallery, diagrams (BLK‑006, 009, MED‑013, 014)
- [ ] Table sort/filter, formulas (TBL‑010, 011)
- [ ] Snippets, SEO/readability (PRD‑006, 015)
- [ ] CAS evaluate/simplify/solve, function graphs (MATH‑041, 042)
- [ ] Braille math output, Arabic math notation & localized digits (MATH‑039, 024)
- [ ] Multi‑cursor (CORE‑024)
- [ ] Rulers, multi‑column sections, line numbering (PAG‑007, 009, 010)
- [ ] Section permissions, task assignment, approval workflow (COL‑012, 019, 020)
- [ ] E2E encryption, PII redaction (SEC‑004, 005)
- [ ] PDF import, Google Docs import/export (CNV‑010, 012)
- [ ] Industry packs: legal, email, education, healthcare, publishing
- [ ] Standalone Docs app public launch
- [ ] Marketplace, partner program, mobile bridges (INT‑006, 008, 009)

---

## Definition of Done (per feature)
- [ ] Public API typed, documented (TSDoc) and reviewed
- [ ] Unit tests (logic) + integration tests (editor) + e2e for user flows; coverage ≥ 85% for the package
- [ ] Works in Chrome, Firefox, Safari, Edge latest 2 versions; iOS Safari & Android Chrome
- [ ] Keyboard accessible, ARIA labels, screen reader announced, axe clean
- [ ] Translated strings externalized; RTL verified
- [ ] Works with undo/redo, copy/paste, collaboration (no divergence), track changes
- [ ] HTML/Markdown/JSON (and DOCX where relevant) conversion defined
- [ ] Sanitization reviewed; no new XSS vectors; fuzz test for parsers
- [ ] Bundle impact measured; within budget; lazy‑loaded if heavy
- [ ] Docs page with live example + changelog entry
- [ ] Product/design sign‑off in playground

# 04 — Phase‑by‑Phase Development Plan

> **Current focus is Goal 1, the free editor with math.** Its milestones (M0–M3) are in `07-goal-1-free-editor.md` and pull the client‑side features of Phases 1, 2, 4 and 7 forward. Server‑based phases (3 Collaboration, 5 AI, 6 Platform) come after Goal 1.

Assumes a dedicated team of ~10–12 (6 TS/frontend, 3 Rust, 1 QA/automation, 1 designer, 1 DevRel/docs), with PageCraft engineers contributing to conversion. Durations are estimates; phases 4 and 5 can run in parallel with 3.

| Phase | Name | Duration | Release |
|---|---|---|---|
| 0 | Foundation | 3–4 weeks | — |
| 1 | Core Editor MVP | 10–12 weeks | `0.1 alpha` |
| 2 | Pro Editing & Productivity (market parity) | 10–12 weeks | `1.0 GA` |
| 3 | Collaboration | 12 weeks | `1.x` + Collab Cloud beta |
| 4 | Document Fidelity (Pages, DOCX, PDF) | 12 weeks (parallel) | `2.0` |
| 5 | AI | 8–10 weeks (parallel) | AI add-on |
| 6 | Enterprise & Platform | 10–12 weeks | Enterprise GA |
| 7 | Differentiation & Ecosystem | ongoing | — |

Total to strong market position: **~12–15 months**.

---

## Phase 0 — Foundation (3–4 weeks)
**Goal:** a repo where good code is the easy path.
- Monorepo (pnpm + Turborepo), Rust cargo workspace, shared configs.
- CI: lint, typecheck, unit, e2e (3 browsers), size‑limit, `cargo clippy/test/audit`, CodeQL, secret scanning.
- Coding standards, PR templates, CODEOWNERS, branch protection, conventional commits, Changesets.
- ADR‑001…010 written and agreed.
- Document schema v1 designed (JSON format + versioning/migration strategy).
- Playground app + Storybook‑like UI catalog.
- Threat model (STRIDE) v1, security & performance budgets defined.
- Design system: tokens, icon set, toolbar/menus wireframes, a11y patterns.
- **Exit:** empty editor renders in playground, CI green, budgets enforced.

## Phase 1 — Core Editor MVP (10–12 weeks)
**Goal:** a fast, safe, accessible editor good enough for simple SaaS use.
- Core: model facade, commands, plugin system, events, undo/redo, schema & content filtering.
- View: selection, IME (CJK, Bangla, Android), clipboard basics, drag‑drop of images.
- Features: CORE‑001…009/011/014/015/021/023, BLK‑001/002, LST‑001/002, TBL‑001…003, MED‑001…003/008, LNK‑001/002, CLP‑001/002/007, PRD‑002/007/010.
- UI: classic, inline, balloon editors; toolbar with overflow; contextual balloons; light/dark theme.
- I/O: HTML, JSON, Markdown.
- A11y: WCAG 2.2 AA UI, screen reader pass, shortcut dialog.
- i18n: runtime + 10 languages incl. Arabic (RTL) and Bangla.
- Wrappers: React, Vue; CDN + npm.
- Docs site v1 with quick start & API reference.
- **Exit:** `0.1 alpha`; typing latency p95 < 16 ms; core + view ≤ 70 KB gz; 0 critical security findings; 90% unit coverage on core.

## Phase 2 — Pro Editing & Productivity (10–12 weeks) → 1.0 GA
**Goal:** feature parity with CKEditor/TinyMCE for everyday editing.
- Tables advanced (TBL‑004…009, 012, 014, 015), lists advanced (LST‑003/004).
- Paste from Word / Excel / Google Docs (CLP‑003…006, 008, 009).
- Media: responsive images, video/audio, embeds, attachments, image editing & optimization.
- Productivity: find & replace, mentions, slash menu, block handle, templates, merge fields, source editing, fullscreen, command palette, code blocks, emoji, special chars, format painter, case change, autoformat/typography, restricted editing.
- **Math editor v1:** inline & block equations, LaTeX mode with autocomplete, visual editor (MathLive), symbol/template palettes, virtual keyboard, AsciiMath, full notation coverage (algebra, calculus, matrices, cases, aligned multi‑line, sets/logic, statistics, physics units, chemistry), macros, paste/copy LaTeX/MathML, screen‑reader speech, syntax validation, lazy loading (MATH‑001…007, 011…023, 026, 029, 030, 035, 037, 038, 040, 044, 045).
- **Flutter SDK beta** (Android, iOS, Web): WebView‑hosted engine, Dart API, native toolbar & math keyboard (FLT‑001…010, 013, 015…018). Desktop, export, native renderer and plugin API follow in Phase 4 (FLT‑011, 012, 014).
- UI: menu bar, decoupled editor, mobile/touch, high contrast, Angular + Svelte wrappers, headless React hooks.
- DX: online builder, devtools extension, starter templates (Next.js, Laravel, .NET), llms.txt & agent skills.
- **Exit:** `1.0 GA`; public launch; migration guide from CKEditor/TinyMCE; 20+ UI languages.

## Phase 3 — Collaboration (12 weeks)
**Goal:** the best collaboration in the market, including self‑hosting.
- Collab client (Yjs binding), offline persistence, reconnection, presence, live cursors.
- Collab server (Rust + yrs): rooms, auth (JWT), persistence, snapshots, compaction, horizontal scaling (NATS), metrics.
- Comments (threads, resolve, reactions, mentions, sidebar/inline modes, archive).
- Track changes (suggestion mode, accept/reject, per‑author colors, comments on suggestions).
- Revision history (auto/named versions, diff view, restore).
- Permissions/roles, users API, multi‑root, async (non‑real‑time) mode.
- REST API + webhooks for documents/comments/suggestions/revisions; Node server SDK; JWT helper SDKs.
- Self‑hosted Docker image + Helm chart (community edition).
- **Exit:** 50 concurrent editors in one doc with p95 sync < 150 ms; chaos tests (network drop/merge) pass; convergence property tests pass 10k random sessions.

## Phase 4 — Document Fidelity (12 weeks, parallel with 3)
**Goal:** Word‑quality documents — our biggest moat via PageCraft.
- Document editor UI, live pagination, page setup, headers/footers, section breaks, watermark, zoom, print.
- TOC, document outline, footnotes/endnotes, multi‑level legal lists, captions & cross‑refs, styles mapping.
- PageCraft integration: DOCX import/export (incl. comments + tracked changes), PDF export (tagged, PDF/A, embedded fonts, complex scripts), ODT/RTF/EPUB.
- WASM build for client‑side conversion in a worker; server conversion API with async jobs.
- Document compare (DOCX ↔ DOCX → redline).
- Math in documents: equation numbering & cross‑refs, Word equations (OMML) import/export, MathType import, vector math in PDF, `.tex` export (MATH‑025, 031…034, 036).
- **Exit:** round‑trip fidelity suite (≥ 300 real‑world DOCX samples) ≥ 95% visual match; 100‑page export < 3 s client‑side.

## Phase 5 — AI (8–10 weeks, can start after Phase 2)
- AI gateway service: provider adapters (OpenAI, Anthropic, Azure, Bedrock, Vertex, local), streaming, metering, caps, PII redaction, logging policy.
- Quick actions, custom prompts library, AI chat sidebar, AI review, AI translate, ghost‑text autocomplete.
- All AI edits flow through track changes (human‑in‑the‑loop).
- AI agent API (typed document operations), server‑side AI editing, MCP server/client, AI in comments.
- Math AI: natural language → equation, photo/screenshot → LaTeX, handwriting → LaTeX, explain/check derivation steps (MATH‑008…010, 043).
- Guardrails: prompt‑injection tests, output schema validation, red‑team review.
- **Exit:** AI eval suite (quality + safety) passing thresholds; cost per action tracked.

## Phase 6 — Enterprise & Platform (10–12 weeks)
- Customer dashboard: projects, environments, keys, usage, billing (Stripe), trials.
- SSO/SCIM, audit logs, data residency (US/EU/APAC), on‑prem/air‑gapped Helm, offline licensing, LTS policy.
- Spell & grammar checker service, custom dictionaries, autocorrect; accessibility checker with fixes; link checker; email‑safe export.
- File manager / asset service (S3/GCS/Azure, image pipeline, malware scanning).
- CMS/framework integrations: WordPress, Drupal, Laravel, .NET, Spring, Django, Electron.
- Compliance: SOC 2 Type I → II, GDPR DPA, HIPAA BAA, VPAT, external pentest.
- **Exit:** first enterprise contracts; SOC 2 Type I report.

## Phase 7 — Differentiation & Ecosystem (ongoing)
- Smart math: CAS evaluate/simplify/solve, function graph blocks, braille output, Arabic math notation (MATH‑024, 039, 041, 042).
- Block (Notion‑style) mode, columns, galleries, diagrams, formula tables, snippets.
- Industry packs (legal, email, education, healthcare, publishing).
- Standalone Docs app public launch.
- Plugin marketplace, community translations, partner program.
- E2E‑encrypted collaboration, PII redaction, section‑level permissions, approval workflows.
- React Native/Flutter bridge, Google Docs import/export, PDF import.

---

## Release & quality gates (every phase)
1. All checklist items for the phase in `05-feature-checklist.md` ticked.
2. Security review + dependency audit clean (no high/critical).
3. Performance budgets met in CI benchmarks.
4. Accessibility audit (axe + manual screen reader) passed.
5. Docs + changelog + migration notes published.
6. Dogfooded in the playground and the Docs app for ≥ 1 week.

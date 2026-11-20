# 03 — Architecture & Tech Stack

## 1. Recommended tech stack

### 1.1 Editor SDK (client)
| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript 5.x (strict)** | Types are the API; matches market expectation |
| Document model & editing view | **ProseMirror** (model/transform/state/view), wrapped behind our own API | Battle‑tested contenteditable, IME and selection handling; used by Tiptap, Atlassian, NYT. Writing this from scratch costs years. Our wrapper keeps the option to swap later |
| Collaboration (client) | **Yjs** + y‑prosemirror, y‑indexeddb | CRDT: offline‑first, no central OT transform, self‑hostable |
| UI kit | **Lit Web Components** + CSS custom properties | Framework‑agnostic, small, works in React/Vue/Angular/Svelte |
| Framework wrappers | `@axiomtext/react`, `@axiomtext/vue`, `@axiomtext/angular`, `@axiomtext/svelte` | Thin adapters + headless hooks/composables |
| Flutter SDK | Dart 3 package; `webview_flutter` / `flutter_inappwebview` on mobile & desktop, `HtmlElementView` on Flutter Web; typed JSON‑RPC bridge; native renderer for read‑only | Same engine as web = full parity incl. math; one codebase to maintain |
| Heavy work off main thread | Web Workers + **WASM (Rust)** | DOCX/PDF conversion (PageCraft), diff, spellcheck, search index |
| Syntax highlight | Shiki (lazy) | Load only when used |
| Math — visual editing & virtual keyboard | **MathLive** (MIT) inside an equation node view | Structured WYSIWYG math, palettes, mobile keyboard |
| Math — fast rendering | **KaTeX** (MIT) | Fastest LaTeX → HTML; used for display in the document |
| Math — full coverage & accessibility | **MathJax** (Apache‑2.0) + Speech Rule Engine, lazy fallback | Rare LaTeX packages, speech text, braille, SVG output |
| Math — conversions | **Temml** (MIT) LaTeX→MathML; own MathML↔OMML mapper; mhchem | Word equations in/out, MathML output |
| Math — CAS & plotting | Cortex **Compute Engine** (MIT), function‑plot / JSXGraph | Evaluate/simplify/solve; graph blocks |
| Sanitization | Schema‑based parsing + DOMPurify for raw HTML embeds | Defense in depth |
| Build | **Vite** (apps), **tsup/Rollup** (libs), **pnpm workspaces + Turborepo** | Fast, cached, tree‑shakeable ESM |
| Testing | Vitest, Playwright (Chromium/Firefox/WebKit + mobile), fast‑check (property tests), axe‑core | |
| Docs | Astro Starlight + TypeDoc | |
| Versioning | Changesets, semver, conventional commits | |

### 1.2 Backend services
| Concern | Choice | Why |
|---|---|---|
| Language | **Rust** (Axum + Tokio) | Team knows Rust/C++; performance; shares PageCraft code |
| Collaboration server | **yrs** (Rust Yjs port) over WebSocket | Same CRDT format as client, horizontally scalable |
| Conversion service | **PageCraft** engine (DOCX/PDF/ODT) | Our moat: highest fidelity, also compiled to WASM |
| AI gateway | Rust service, provider adapters, streaming SSE | Model‑agnostic, metering, guardrails |
| Dashboard / billing web | **Next.js** (TypeScript) + Stripe | Fast product iteration |
| Primary DB | **PostgreSQL 16** | Docs metadata, comments, revisions, tenants |
| Cache / pub‑sub | **Redis** (or Valkey); **NATS** for cross‑node collab fan‑out | |
| Object storage | S3‑compatible (S3 / R2 / MinIO) | Snapshots, assets, exports |
| Search | PostgreSQL FTS first → OpenSearch/Meilisearch later | |
| Jobs | Postgres‑backed queue (e.g. apalis) or NATS JetStream | Conversions, notifications |
| Observability | OpenTelemetry → Grafana/Tempo/Loki/Prometheus, Sentry | |
| Infra | Docker, Kubernetes (Helm), Terraform; Cloudflare CDN for SDK | |
| Auth | JWT (EdDSA) issued by customer backend; dashboard via OIDC | |

---

## 2. High‑level architecture

```
┌──────────────────────────── Customer's web app ─────────────────────────────┐
│  React/Vue/Angular wrapper  →  Editor SDK                                    │
│  ┌──────────────┬──────────────┬──────────────┬───────────────────────────┐  │
│  │  UI Kit (Lit)│  Plugins     │ Collab client│  WASM workers             │  │
│  │  toolbar,    │  table,image,│ Yjs, presence│  DOCX/PDF (PageCraft),    │  │
│  │  menus, AI UI│  comments... │ IndexedDB    │  diff, spellcheck         │  │
│  ├──────────────┴──────────────┴──────────────┴───────────────────────────┤  │
│  │  Engine: commands · keymaps · input rules · history · schema · events  │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │  Model (immutable tree, steps/transactions)  ↔  View (DOM, IME, sel.)  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└───────────────┬──────────────────────┬───────────────────────┬──────────────┘
                │ WSS (JWT)            │ HTTPS (JWT)           │ HTTPS
        ┌───────▼───────┐     ┌────────▼────────┐     ┌────────▼────────┐
        │ Collab server │     │ API gateway     │     │ AI gateway      │
        │ (Rust + yrs)  │     │ docs, comments, │     │ providers, MCP, │
        │ rooms, presence│    │ revisions, hooks│     │ guardrails, meter│
        └──┬─────────┬──┘     └──┬──────────┬───┘     └────────┬────────┘
           │ NATS    │           │          │                  │
      ┌────▼───┐ ┌───▼────┐ ┌────▼───┐ ┌────▼──────┐    ┌──────▼──────┐
      │ Redis  │ │Postgres│ │  S3    │ │ Convert   │    │ LLM providers│
      │presence│ │metadata│ │snapshots│ │ (PageCraft)│   │ / local LLMs │
      └────────┘ └────────┘ └────────┘ └───────────┘    └─────────────┘
```

### 2.1 Client layers (strict dependency direction: top depends on bottom only)
1. **`core`** – schema, model, transactions, commands, plugin system, event bus. *No DOM access.* Runs in browser, Node, workers.
2. **`view`** – DOM rendering, selection, IME/composition, clipboard, node views.
3. **`ui`** – Lit components: toolbar, balloon, dropdowns, dialogs, sidebar; theme tokens; i18n.
4. **`plugins/*`** – each feature is an independent package (`schema` + `commands` + `ui` + `i18n` + `tests`).
5. **`collab`, `comments`, `track-changes`, `revisions`, `ai`, `convert`** – premium packages.
6. **Wrappers** – React/Vue/Angular/Svelte.
7. **Presets** – `classic`, `inline`, `balloon`, `document`, `block`, `minimal` bundles.

### 2.2 Key design decisions (write as ADRs in `docs/adr/`)
| ADR | Decision |
|---|---|
| ADR‑001 | Build on ProseMirror behind our own API facade (no ProseMirror types leak into public API) |
| ADR‑002 | CRDT (Yjs) over OT for collaboration; comments & suggestions stored as marks + Y.Map metadata |
| ADR‑003 | JSON is the canonical storage format; HTML/Markdown/DOCX are projections |
| ADR‑004 | Every feature is a separately versioned plugin package; core + view stays ≤ 70 KB gz |
| ADR‑005 | Track changes implemented as a transaction filter that converts edits into suggestion marks; AI uses the same path |
| ADR‑006 | Conversion engine = PageCraft (Rust) shared by WASM client and server |
| ADR‑007 | UI as Web Components with CSS variables; headless API first, UI consumes public API only |
| ADR‑008 | Customer backend issues JWTs; our services never store customer user passwords |
| ADR‑009 | Multi‑tenant isolation by `tenant_id` + Postgres Row‑Level Security |
| ADR‑010 | Licensing: permissive (MIT/Apache‑2.0) core, commercial premium packages with license‑key verification |

### 2.3 Data model (simplified)
```
tenants(id, name, region, plan)
environments(id, tenant_id, name, access_keys, allowed_origins)
documents(id, tenant_id, env_id, external_id, title, created_at, updated_at)
document_snapshots(id, document_id, ydoc_state_ref(S3), version, created_by, name?)
document_updates(document_id, seq, update_bytes, created_at)   -- compacted periodically
comment_threads(id, document_id, anchor_id, status, created_by, resolved_by, ...)
comments(id, thread_id, author_id, body_json, created_at, edited_at)
suggestions(id, document_id, type, author_id, status, data_json)
revisions(id, document_id, snapshot_id, name, authors[], diff_ref)
webhooks(id, env_id, url, secret, events[])
audit_log(id, tenant_id, actor, action, target, ip, at)
usage_events(tenant_id, kind, qty, at)
```

### 2.4 Real‑time collaboration flow
1. Host app backend signs JWT `{ sub, name, avatar, docs: { "doc-1": "editor" }, env, exp: 15m }`.
2. Client connects `wss://collab.../v1/docs/doc-1?token=...`; server validates signature, origin, permission.
3. Sync step 1/2 (Yjs state vectors), then incremental updates; awareness channel for cursors.
4. Server persists updates (append log) → periodic snapshot to S3 → compaction.
5. Multi‑node: room owner via consistent hashing; NATS fan‑out between nodes; Redis for presence TTL.
6. Read‑only/commenter roles enforced server‑side by rejecting disallowed update types.

### 2.5 Conversion flow
- **Client (WASM):** `editor.export('docx')` → JSON model → worker → PageCraft WASM → Blob. Fonts lazy‑loaded (incl. Bangla/Noto).
- **Server:** `POST /v1/convert` (async job id) → convert workers → S3 → webhook/`GET /jobs/:id`.

### 2.6 AI flow
Client action → AI gateway (JWT) → policy check (plan, caps, PII redaction) → provider adapter → streamed structured ops (not raw HTML) → validated against schema → applied as **suggestions** (track changes) → user accepts/rejects. All prompts/responses metered and optionally logged (per tenant setting).

### 2.7 Math editor architecture
- **Storage:** two nodes, `mathInline` and `mathBlock`. Canonical value = **LaTeX string** (+ optional `label`, `numbered`, `macros` ref). MathML/SVG are derived and cached, never the source of truth.
- **Editing:** clicking an equation opens a node view hosting MathLive (visual mode) with a toggle to LaTeX source mode (CodeMirror‑style input with autocomplete). Edits commit as one transaction, so undo, collaboration and track changes treat each equation change as one step.
- **Rendering:** KaTeX renders in the document; unsupported commands fall back to MathJax (lazy). Render results cached by `hash(latex + macros)`; off‑screen equations rendered lazily.
- **Input converters:** AsciiMath → LaTeX, MathML → LaTeX, OMML → MathML → LaTeX, MathType (MTEF) → MathML → LaTeX. All run in a worker.
- **Output converters:** LaTeX → MathML (Temml) → OMML for DOCX; MathML/SVG for HTML and PDF; LaTeX for Markdown/`.tex`.
- **Accessibility:** MathML in output + generated speech string as `aria-label`; equation explorer with arrow keys.
- **AI/OCR/handwriting:** sent through the AI gateway (vision model) → returns LaTeX → validated by the parser → shown as a suggestion for the user to accept.
- **Security:** LaTeX is parsed, never executed; `\href`, `\url`, `\includegraphics`, `\htmlClass/\htmlStyle` disabled by default (KaTeX `trust: false`); macro expansion depth & size limits to stop "macro bomb" DoS.

### 2.8 Flutter SDK architecture
```
Flutter app
 └─ AxiomTextEditor (widget) ── AxiomTextController (Dart API, streams)
      │                         │ typed JSON‑RPC messages (versioned protocol)
      ├─ Mobile/desktop: WebView ── bundled editor (JS/CSS/fonts from package assets)
      ├─ Flutter Web: HtmlElementView ── same editor, no WebView
      └─ Native toolbar / math keyboard / pickers (Flutter widgets) → controller.execute()
RichContentView (widget) ── renders editor JSON as native Flutter widgets (read‑only)
```
- **Bridge protocol:** shared schema file generates both the TypeScript and Dart message types, so the two sides can't drift. Every message has a version; unknown messages are rejected.
- **Engine bundle:** a dedicated `flutter` preset of the editor is built in CI and copied into the Dart package's `assets/`; package version is locked to the engine version.
- **Performance:** WebView pre‑warmed at app start (optional), content sent as JSON not HTML, change events debounced, large content transferred in chunks.
- **Security:** only the bundled local page is loaded; navigation to other URLs opens the system browser; no string `eval` from Dart; JavaScript channel accepts only allowlisted typed messages.
- **Testing:** Dart unit tests for the controller, `integration_test` on Android/iOS emulators in CI, golden tests for native toolbar and read‑only renderer, protocol contract tests shared with the web side.

---

## 3. Monorepo folder structure

```
text_editor/
├── apps/
│   ├── playground/            # Vite sandbox with every plugin, used for dev & e2e
│   ├── docs-site/             # Astro Starlight docs + live examples
│   ├── website/               # Marketing site + online builder (Next.js)
│   ├── dashboard/             # Customer dashboard, billing (Next.js)
│   └── docs-app/              # Standalone Google-Docs-like showcase app
├── packages/
│   ├── core/                  # schema, model facade, commands, plugin system, events
│   ├── view/                  # DOM view, IME, clipboard, node views
│   ├── ui/                    # Lit web components, theme tokens, icons
│   ├── i18n/                  # translation runtime + locale files
│   ├── presets/               # classic, inline, balloon, document, block builds
│   ├── plugins/
│   │   ├── basic-styles/
│   │   ├── heading/
│   │   ├── list/
│   │   ├── table/
│   │   ├── image/
│   │   ├── link/
│   │   ├── paste-office/
│   │   ├── find-replace/
│   │   ├── mention/
│   │   ├── code-block/
│   │   ├── math/               # equation nodes, MathLive view, KaTeX/MathJax render, converters, palettes
│   │   ├── math-cas/           # compute engine + graph block (lazy, premium)
│   │   ├── merge-fields/
│   │   ├── pagination/
│   │   └── ...
│   ├── collab/                # Yjs binding, presence, offline
│   ├── comments/
│   ├── track-changes/
│   ├── revisions/
│   ├── ai/
│   ├── convert/               # WASM bindings to PageCraft
│   ├── server-sdk/            # Node: headless editor, JWT helpers
│   ├── react/ vue/ angular/ svelte/
│   ├── flutter/               # Dart package published to pub.dev
│   │   ├── lib/
│   │   │   ├── axiomtext.dart          # public exports only
│   │   │   └── src/
│   │   │       ├── editor/             # AxiomTextEditor widget, platform views (WebView / web)
│   │   │       ├── controller/         # AxiomTextController, commands, events
│   │   │       ├── bridge/             # generated protocol types, message channel
│   │   │       ├── toolbar/            # Material & Cupertino toolbars, pickers
│   │   │       ├── math/               # native math keyboard & palettes
│   │   │       └── renderer/           # read-only native JSON renderer
│   │   ├── assets/editor/              # bundled engine (built by CI)
│   │   ├── example/                    # full demo app
│   │   ├── test/  integration_test/
│   │   └── pubspec.yaml
│   ├── bridge-protocol/       # shared message schema → generates TS + Dart types
│   ├── test-utils/            # model builders, DOM helpers, collab simulators
│   └── config/                # eslint, tsconfig, prettier, vitest presets
├── services/                  # Rust cargo workspace
│   ├── Cargo.toml
│   ├── collab-server/
│   ├── api/                   # REST: documents, comments, revisions, webhooks
│   ├── convert-service/
│   ├── ai-gateway/
│   ├── asset-service/
│   └── crates/
│       ├── auth/              # JWT validation, permissions
│       ├── storage/           # S3, Postgres repositories
│       ├── telemetry/         # tracing, metrics
│       ├── config/
│       └── domain/            # shared types
├── e2e/                       # Playwright suites (cross-browser, IME, collab)
├── benchmarks/                # perf benchmarks (typing latency, large docs)
├── infra/
│   ├── docker/
│   ├── helm/
│   └── terraform/
├── docs/                      # these planning docs + ADRs
│   └── adr/
├── .github/                   # CI workflows, CODEOWNERS, templates
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 3.1 Inside one plugin package
```
packages/plugins/table/
├── src/
│   ├── index.ts               # public exports only
│   ├── table.plugin.ts        # registers schema, commands, keymaps, UI
│   ├── schema/                # node specs (table, row, cell)
│   ├── commands/              # insertTable, addRowAfter, mergeCells ...
│   ├── keymaps.ts
│   ├── ui/                    # toolbar buttons, table picker (Lit)
│   ├── conversion/            # html/markdown/docx mapping
│   ├── i18n/en.json …
│   └── internal/              # not exported
├── tests/
│   ├── unit/
│   └── integration/
├── README.md
├── CHANGELOG.md
└── package.json               # "sideEffects": false
```

### 3.2 Inside one Rust service
```
services/collab-server/
├── src/
│   ├── main.rs                # bootstrap, config, telemetry
│   ├── http/                  # routes, handlers, middleware (auth, rate limit)
│   ├── ws/                    # websocket sessions, sync protocol
│   ├── rooms/                 # room registry, sharding
│   ├── persistence/           # update log, snapshots
│   └── error.rs
├── tests/
└── Cargo.toml
```

---

## 4. Performance architecture
- Tree‑shakeable ESM, `sideEffects: false`, per‑plugin lazy loading (`await import()`).
- Budgets enforced in CI (size‑limit): core+view ≤ 70 KB gz (incl. engine, ADR‑0008), classic preset ≤ 180 KB gz.
- Incremental rendering; node‑view virtualization for very long docs (render visible pages only).
- Pagination computed incrementally in a worker with layout measurements batched via `requestAnimationFrame`.
- Collab: binary updates, batching/debounce (≈50 ms), snapshot compaction, gzip/brotli on WS.
- Server: Rust async, connection pooling, room affinity, back‑pressure, horizontal autoscaling.

## 5. Security architecture
- Content: schema allowlist parse → never inject raw HTML; `javascript:`/`data:` URL filtering; sandboxed iframes for embeds.
- Transport: TLS everywhere, HSTS, WSS only.
- AuthZ: short‑lived JWT with per‑doc roles; server enforces roles on every update; origin allowlist per environment.
- Isolation: Postgres RLS per tenant; separate S3 prefixes + KMS keys per tenant (ENT).
- Uploads: MIME sniffing, size limits, SVG sanitization, EXIF strip, malware scan.
- SSRF protection for link previews/import‑from‑URL (deny private IP ranges, DNS rebinding checks).
- Supply chain: lockfiles, Dependabot/Renovate, `cargo audit`, `npm audit`, SBOM (CycloneDX), npm provenance, signed releases.
- AI: data minimization, PII redaction, tool allowlists, output validated against schema, no hidden auto‑apply.
- Secrets in Vault/cloud secret manager; no secrets in repo; rotation policy.

# 06 — Engineering Standards (Coding, Security, Performance)

## 1. Coding practices

### 1.1 TypeScript
- `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`; no `any` (use `unknown` + narrowing).
- ESM only; named exports; each package exposes one `index.ts` — everything else is internal.
- Pure functions for model logic; side effects isolated in view/UI layers.
- Immutable document state; all changes via transactions/commands (never mutate DOM directly from features).
- Public API changes require an API review + Changeset; deprecate for one minor before removing.
- Naming: `camelCase` functions, `PascalCase` types/classes, `kebab-case` files, `*.plugin.ts`, `*.command.ts`, `*.spec.ts`.
- Errors: typed error classes with codes (`EDITOR_E_SCHEMA_INVALID`), linkable to docs.
- No global state; multiple editors per page must work.

### 1.2 Rust
- `cargo fmt`, `clippy -D warnings`, `#![forbid(unsafe_code)]` unless justified in an ADR (WASM/FFI bridges).
- `thiserror` for library errors, `anyhow` only in binaries; no `unwrap()` in non‑test code.
- `tracing` spans on every request; structured logs; no PII in logs.
- Config via env + typed struct; 12‑factor services; graceful shutdown.

### 1.3 Git workflow
- Trunk‑based: short‑lived branches `feat/…`, `fix/…`, `chore/…`; PRs < 400 lines where possible.
- Conventional commits; squash merge; Changesets for releases.
- 1 approving review (2 for core, security, collab, conversion); CODEOWNERS enforced.
- CI must be green; no force‑push to `main`.

### 1.4 Testing strategy
| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | commands, schema, conversions, utils |
| Property / fuzz | fast‑check, cargo‑fuzz | random edits → valid doc; HTML/DOCX parsers; CRDT convergence |
| Integration | Vitest + happy‑dom / real browser mode | plugin interactions, paste, undo |
| E2E | Playwright (3 engines + mobile emulation) | user flows, IME, clipboard, collab with multiple contexts |
| Visual regression | Playwright screenshots | UI, pagination, export rendering |
| Accessibility | axe‑core + manual NVDA/JAWS/VoiceOver | every UI component |
| Performance | custom benchmarks in CI | typing latency, load time, large docs |
| Load | k6 / custom Rust load tester | collab server, conversion |
| Conversion fidelity | corpus of real DOCX/PDF files | round‑trip visual diff |

### 1.5 Documentation
- TSDoc on every public symbol → TypeDoc API reference.
- Every plugin has README, example, and docs page.
- ADRs for every significant decision (`docs/adr/NNN-title.md`).

## 2. Security standards
Baseline: **OWASP ASVS Level 2**, OWASP Top 10, CWE Top 25.

### Client
- [ ] All input parsed through the schema; unknown elements/attributes dropped.
- [ ] URL allowlist: `http`, `https`, `mailto`, `tel` (+ configurable); block `javascript:`, `vbscript:`, `data:` (except images if allowed).
- [ ] No `innerHTML` with untrusted data; Trusted Types policy provided.
- [ ] No `eval`/`new Function`; works under strict CSP.
- [ ] Embeds in sandboxed iframes with minimal permissions.
- [ ] SVG uploads sanitized or rasterized.
- [ ] Paste sanitizer fuzz‑tested with XSS payload corpus.

### Services
- [ ] JWT verification (EdDSA/RS256), `exp` ≤ 15 min, audience & environment checks, clock skew handling.
- [ ] Authorization checked per document per operation on the server.
- [ ] Rate limiting & quotas per tenant/IP; WebSocket message size limits.
- [ ] Postgres RLS by tenant; parameterized queries only.
- [ ] SSRF guards for any server‑side fetch (deny private ranges, re‑resolve DNS, timeouts, size caps).
- [ ] Upload validation (MIME sniff, size, malware scan), EXIF stripping.
- [ ] Secrets in a secret manager; rotation; least‑privilege IAM.
- [ ] Encryption in transit (TLS 1.2+) and at rest (AES‑256, KMS).
- [ ] Audit log for admin/security‑relevant actions.
- [ ] Security headers (HSTS, CSP, X‑Content‑Type‑Options, Referrer‑Policy).

### Supply chain & process
- [ ] Renovate/Dependabot; `npm audit`, `cargo audit`, `cargo deny` in CI.
- [ ] SBOM (CycloneDX) per release; npm provenance; signed container images (cosign).
- [ ] Threat model updated per phase; security review for collab, AI, conversion, uploads.
- [ ] Annual external pentest; responsible disclosure policy + bug bounty after GA.

### AI‑specific
- [ ] Document content is passed as data, never as system instructions.
- [ ] Model output validated against schema before applying; applied as suggestions.
- [ ] Tool/MCP calls allowlisted and permission‑checked.
- [ ] PII redaction option; tenant controls for logging/retention; zero‑retention providers for ENT.

## 3. Performance standards

| Metric | Budget |
|---|---|
| Core + view bundle (incl. ProseMirror engine) | ≤ 70 KB gzip (ADR‑0008) |
| Classic preset (common features) | ≤ 180 KB gzip |
| Editor init (empty) | < 50 ms on mid‑range laptop, < 150 ms on mid‑range Android |
| Typing latency (keypress → paint) | p95 < 16 ms (10‑page doc), < 30 ms (200‑page doc) |
| Open 100‑page document | < 1 s |
| Paste 20‑page Word doc | < 500 ms |
| Collab sync latency | p95 < 150 ms within region |
| Collab server | ≥ 10k concurrent connections per node |
| DOCX/PDF export (100 pages, client WASM) | < 3 s |
| Memory (200‑page doc) | < 150 MB |

Practices:
- Lazy‑load heavy plugins (math, code highlight, conversion WASM, AI UI).
- Avoid layout thrashing: batch DOM reads/writes; `requestAnimationFrame`; `ResizeObserver`.
- Virtualize off‑screen pages/large tables.
- Web Workers for diff, spellcheck, pagination measurement, export.
- Memoize decorations; incremental updates only for changed ranges.
- Benchmarks run in CI; regressions > 5% block merge.

## 4. Accessibility standards
- WCAG 2.2 AA; ARIA Authoring Practices for toolbar, menu, dialog, listbox, tree.
- Roving tabindex in toolbars; `Alt+F10` to toolbar, `Esc` back to content.
- Live region announcements for formatting changes, comments, collab joins.
- Focus visible, contrast ≥ 4.5:1, reduced motion support.

## 5. Observability & operations
- OpenTelemetry traces/metrics/logs; dashboards per service; SLOs + alerting.
- Client error reporting opt‑in (Sentry‑compatible hook), no document content sent.
- Feature flags for gradual rollouts; canary deploys; automated rollback.
- Backups: Postgres PITR, S3 versioning; quarterly restore drills.

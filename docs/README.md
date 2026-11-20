# AxiomText — Planning Docs

**AxiomText** — free, open‑source rich text & math editor · Website: https://axiomtext.dev · npm: `@axiomtext/*` · pub.dev: `axiomtext` · GitHub: `axiomtext`

Goal: build an embeddable rich‑text & document editor SDK + cloud platform that matches and beats CKEditor 5, TinyMCE, Tiptap and Froala.

| Doc | Contents |
|---|---|
| [02-feature-list.md](02-feature-list.md) | 305 features (incl. a 45-feature math editor and a 19-feature Flutter SDK) with IDs, priority, phase, tier (★ = beyond market) |
| [03-architecture-tech-stack.md](03-architecture-tech-stack.md) | Tech stack, system architecture, ADRs, data model, folder structure |
| [04-development-plan.md](04-development-plan.md) | Phase 0–7 plan, durations, exit criteria |
| [05-feature-checklist.md](05-feature-checklist.md) | Tick‑box checklist per phase + Definition of Done |
| [06-engineering-standards.md](06-engineering-standards.md) | Coding practices, testing, security, performance, a11y |
| [adr/](adr/README.md) | Architecture Decision Records |
| [goal-1/](goal-1/README.md) | **Goal 1 feature list + phase‑by‑phase development guide** |
| [07-goal-1-free-editor.md](07-goal-1-free-editor.md) | **Goal 1:** free MIT editor with all editing features + math (223 features incl. Flutter SDK, M0–M3) |

## The winning bet in one paragraph
A permissive‑license (MIT/Apache) core with both a complete pre‑built UI and a headless API; offline‑first CRDT collaboration with a free self‑hosted server; Word/PDF fidelity powered by the PageCraft Rust engine, running client‑side in WebAssembly as well as on the server; model‑agnostic AI where every edit is a reviewable tracked change; first‑class complex‑script support (Bangla, Indic, Arabic, CJK); and simple pricing with no editor‑load metering.

## Goal 1 (current focus)
Ship a completely free, MIT‑licensed editor with every editing feature the market leaders offer plus a full math equation editor. All 223 features marked `FREE` in the feature list run in the browser with no server, no license key and no limits. See `07-goal-1-free-editor.md`.

Next step: approve ADR‑001…010 and start M0 (Foundation).

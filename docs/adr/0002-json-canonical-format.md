# ADR-0002: JSON is the canonical document format

## Status
Accepted (M0)

## Decision
Applications store `DocumentJSON` = `{ version, doc }`. HTML, Markdown, DOCX and PDF are projections generated from it. `version` starts at 1; every schema change that affects stored data bumps it and adds a migration in `packages/core/src/document.ts`.

## Consequences
+ Lossless storage, safe parsing, easy migrations, works for Flutter bridge.
− Apps that want HTML must call `getHTML()` (cheap).

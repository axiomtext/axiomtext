# ADR-0008: Bundle size budgets

## Status
Accepted (M0)

## Context
The planning docs targeted ≤ 60 KB gzip for core + view. Measured in M0: 64.5 KB, of which ~55 KB is the ProseMirror engine itself.

## Decision
Budgets enforced by size-limit in CI: `@axiomtext/core` ≤ 40 KB, core + view (incl. engine) ≤ 70 KB, classic preset ≤ 180 KB. Any increase needs a PR explaining why.

## Consequences
Still competitive with CKEditor 5 and TinyMCE builds; heavy features (math, code highlighting, conversion) stay lazy-loaded.

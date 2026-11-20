# ADR-0003: One package per feature

## Status
Accepted (M0)

## Decision
Every feature is an `AxiomPlugin` in `packages/plugins/<name>` with schema, commands, keymap, engine plugins and i18n messages. Presets bundle common sets.

## Consequences
+ Tree-shaking: users only ship what they use. + Clear ownership and tests per feature.
− More packages to version; mitigated by Changesets `fixed` versioning (all `@axiomtext/*` share one version).

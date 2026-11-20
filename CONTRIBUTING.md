# Contributing to AxiomText

Thanks for helping build a free editor for everyone!

## Setup

```bash
corepack enable
pnpm install
pnpm dev
```

## Before opening a pull request

1. `pnpm check` passes (format, lint, typecheck, tests, bundle size, license check).
2. New behaviour has tests: unit tests in `packages/*/tests`, user flows in `e2e/`.
3. Add a changeset if a published package changed: `pnpm changeset`.
4. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org): `feat(table): merge cells`, `fix(view): …`.
5. Sign off your commits (`git commit -s`) — Developer Certificate of Origin.

## Rules that protect the project

- **License:** contributions are MIT. Only add dependencies licensed MIT, Apache-2.0, BSD, ISC or MPL-2.0. No GPL/AGPL.
- **Never copy code** from CKEditor, TinyMCE (GPL) or Tiptap Pro (commercial). Use their docs only to compare features.
- **Security:** never use `eval`, `new Function`, `innerHTML` with untrusted data, or `javascript:` URLs. All content goes through the schema.
- **Accessibility:** every UI control is keyboard reachable and has an accessible name.
- **Performance:** keep bundle-size budgets green; lazy-load heavy features.

## Adding a feature plugin

Create `packages/plugins/<name>/` following `packages/plugins/basic-styles/`:
schema (nodes/marks) → commands → keymap → i18n messages → tests → playground → docs.

## Definition of Done

See `docs/06-engineering-standards.md` and `docs/goal-1/02-development-guide.md`.

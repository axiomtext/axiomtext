# Changesets

Every PR that changes a published package needs a changeset:

```bash
pnpm changeset
```

All `@axiomtext/*` packages are versioned together (`fixed` group), so users always install matching versions.

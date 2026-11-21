# Releasing to npm

Packages are published **from your own computer** with your npm login and 2FA — no long-lived
token is stored anywhere. All public `@axiomtext/*` packages share one version number
(Changesets "fixed" group).

## One time

1. **npm account:** turn on two-factor authentication (npmjs.com → Account → Two-Factor
   Authentication → "Authorization and writes").
2. **Organization:** the packages publish under the `axiomtext` org — you must be an owner or a
   member with publish rights.
3. **Log in on your Mac** (opens the browser):
   ```bash
   npm login
   npm whoami        # → your npm user name
   ```

## Every release

```bash
git checkout main && git pull

# 1. Describe what changed (skip if a .changeset/*.md file already exists — v0.1.0 has one).
pnpm changeset

# 2. Set the new version numbers and write the CHANGELOG files.
pnpm changeset version
git add . && git commit -m "release: v$(node -p "require('./packages/core/package.json').version")"

# 3. Build everything and publish every package whose version isn't on npm yet.
pnpm release
#    npm asks for 2FA: approve in the browser, or run with a code instead:
#    pnpm build && pnpm changeset publish --otp=123456

# 4. Push the commit and the version tags (this also deploys the website).
git push --follow-tags
```

If a publish stops halfway (expired 2FA code, network), just run `pnpm release` again: packages
that are already on npm are skipped.

Check the result: https://www.npmjs.com/org/axiomtext — and after a few minutes the CDN files at
https://cdn.jsdelivr.net/npm/@axiomtext/presets@latest/dist/cdn/sri.json.

## Optional: publishing from GitHub Actions

`.github/workflows/release.yml` can also publish (manual run only, so it uses no minutes unless you
start it). Prefer npm **trusted publishing** over a token: after the first release, on npmjs.com
open each package → Settings → Trusted publishing → GitHub Actions, repository
`axiomtext/axiomtext`, workflow `release.yml`. Releases from Actions also get a provenance badge.

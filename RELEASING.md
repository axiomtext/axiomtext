# Releasing to npm

Packages are published **from your own computer** with your npm login and 2FA — no long-lived
token is stored anywhere. Three packages are published and share one version number (Changesets
"fixed" group): `axiomtext`, `@axiomtext/react` and `@axiomtext/vue`. Everything else in
`packages/` is private and bundled into `axiomtext`.

## One time

1. **npm account:** turn on two-factor authentication (npmjs.com → Account → Two-Factor
   Authentication → "Authorization and writes").
2. **Account:** publish while logged in as the `axiomtext` npm user, which owns `axiomtext` and the
   `@axiomtext` scope.
3. **Log in on your Mac** (opens the browser):
   ```bash
   npm login
   npm whoami        # → your npm user name
   ```

## Every release

```bash
git checkout main && git pull

# 1. Describe what changed (pick axiomtext; React and Vue follow automatically).
pnpm changeset

# 2. Set the new version numbers and write the CHANGELOG files.
pnpm changeset version
git add . && git commit -m "release: v$(node -p "require('./packages/axiomtext/package.json').version")"

# 3. Build everything and publish every package whose version isn't on npm yet.
pnpm release
#    npm asks for 2FA: approve in the browser, or run with a code instead:
#    pnpm build && pnpm changeset publish --otp=123456

# 4. Approve the staged release (see below), then push the commit and the version tags (this also deploys the website).
git push --follow-tags
```

### Approving the staged release

npm holds new versions for review ("staged publishing"). A brand-new package first shows a
`0.0.0-stage` placeholder on npm; that's expected, don't unpublish it. Approve each package with
2FA, `axiomtext` first:

```bash
npm stage list
npm stage approve <stage-id>
```

or use the **Staged packages** tab on npmjs.com.

If a publish stops halfway (expired 2FA code, network), just run `pnpm release` again: packages
that are already on npm are skipped.

Check the result: https://www.npmjs.com/package/axiomtext — and after a few minutes the CDN files at
https://cdn.jsdelivr.net/npm/axiomtext@latest/dist/cdn/sri.json.

## Optional: publishing from GitHub Actions

`.github/workflows/release.yml` can also publish (manual run only, so it uses no minutes unless you
start it). Prefer npm **trusted publishing** over a token: after the first release, on npmjs.com
open each package → Settings → Trusted publishing → GitHub Actions, repository
`axiomtext/axiomtext`, workflow `release.yml`. Releases from Actions also get a provenance badge.

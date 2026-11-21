# Deploying axiomtext.dev

**`git push` deploys.** Pushing `main` runs a git pre-push hook on your computer that checks the
code, builds the website and uploads it to the server. The push only reaches GitHub if the deploy
worked, so GitHub's `main` is always what is live. No GitHub Actions minutes are used.

```
git push ─► pre-push hook ─► pnpm check ─► build website ─► rsync to the server ─► switch ─► check https://axiomtext.dev ─► push to GitHub
```

- The site is static (docs, demo, playground): the server only needs **nginx**, no Node.js.
- Only the build is uploaded, into `/var/www/axiomtext.dev/releases/<date>-<commit>`.
  `current` points at the live one; switching is a single atomic step, and the 5 newest releases
  are kept so you can roll back instantly.
- If the new release doesn't answer, the script switches back to the previous one by itself.

Server: `161.97.179.220` · Domain: `axiomtext.dev` · Server commands assume Ubuntu/Debian.
Other sites on the server (e.g. Infotech Events) are not touched.

---

## One-time setup

### 1. DNS (Hostinger → Domains → axiomtext.dev → DNS / Nameservers)

Change **only** the `A` record for `@`:

| Type  | Name  | Points to                                                     | TTL |
| ----- | ----- | ------------------------------------------------------------- | --- |
| A     | `@`   | `161.97.179.220` (was `2.57.91.91`, Hostinger's parking page) | 300 |
| CNAME | `www` | `axiomtext.dev` (already correct)                             | 300 |

Keep all other records — the `MX`, `TXT` (SPF, Google verification), `_dmarc`, `_domainkey`,
`autodiscover` and `autoconfig` records are for your email. If there is an `AAAA` record for `@`,
delete it. Check from your Mac after a few minutes:

```bash
dig +short axiomtext.dev       # → 161.97.179.220
```

### 2. Server (once, as root)

From the project folder on your Mac:

```bash
scp -r deploy root@161.97.179.220:/root/axiomtext-deploy
ssh root@161.97.179.220 'bash /root/axiomtext-deploy/scripts/server-setup.sh you@example.com'
```

(Use your real email — Let's Encrypt only sends certificate expiry warnings.) The script installs
nginx/certbot/rsync if needed, reuses or creates the `deploy` user, creates the site folder, adds
the nginx site and — once DNS points at the server — turns on HTTPS. If DNS wasn't ready yet, run
the last command again later for HTTPS.

### 3. Your Mac (once)

```bash
deploy/scripts/laptop-setup.sh
```

It turns on the pre-push hook, saves the settings in `~/.axiomtext-deploy.env` (outside the
repository) and makes an SSH key. The first time it prints **one line** — run that line on the
server as root (it adds your key for the `deploy` user), then run `laptop-setup.sh` again. It
finishes by checking the connection.

### 4. First deploy

```bash
deploy/scripts/deploy-from-laptop.sh
```

Open https://axiomtext.dev. From now on, just `git push`.

---

## Everyday use

| Command                                           | What happens                                |
| ------------------------------------------------- | ------------------------------------------- |
| `git push`                                        | Checks, builds, deploys, then pushes `main` |
| `AXIOM_DEPLOY=quick git push`                     | Deploys without the checks (faster)         |
| `AXIOM_DEPLOY=0 git push`                         | Pushes without deploying                    |
| `deploy/scripts/deploy-from-laptop.sh`            | Deploys the current commit without pushing  |
| `deploy/scripts/deploy-from-laptop.sh --rollback` | Switches back to the previous release       |
| `deploy/scripts/deploy-from-laptop.sh --check`    | Only checks the setup and connection        |

Pushing other branches never deploys. Uncommitted changes stop the deploy (what you push is what
goes live).

GitHub Actions can still deploy by hand if you ever need it (**Actions → Website → Run workflow**;
needs the secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`).

## Troubleshooting

| Problem                         | Fix                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `dig` shows `2.57.91.91`        | The A record still points to Hostinger. Change it (step 1) and wait a few minutes.             |
| `Permission denied (publickey)` | Run the line from `laptop-setup.sh` on the server, then `laptop-setup.sh` again.               |
| `releases is missing`           | Step 2 wasn't run (or failed) on the server.                                                   |
| Certbot fails                   | DNS must point to the server first and port 80 must be open; then run `server-setup.sh` again. |
| Deploy says it switched back    | `ssh root@161.97.179.220 'tail -50 /var/log/nginx/error.log'`                                  |
| Push blocked by the hook        | Read the message (checks failed, uncommitted changes…) or use `AXIOM_DEPLOY=0 git push`.       |

#!/usr/bin/env bash
# Deploys axiomtext.dev from your own computer (no GitHub Actions minutes):
#   1. checks — format, lint, types, unit tests, sizes, licenses (pnpm check), unless --quick
#   2. builds the website: docs + demo + playground (static files only)
#   3. uploads ONLY the build to /var/www/axiomtext.dev/releases/<release> on the server (no source code)
#   4. switches the "current" link to it in one step, keeps the last 5 releases
#   5. checks https://axiomtext.dev answers with the new release (switches back if not)
#
# Usage (from anywhere inside the repository):
#   deploy/scripts/deploy-from-laptop.sh            check, build, deploy the commit you are on
#   deploy/scripts/deploy-from-laptop.sh --quick    skip the checks (build and deploy only)
#   deploy/scripts/deploy-from-laptop.sh --check    only check the setup and the SSH connection
#   deploy/scripts/deploy-from-laptop.sh --rollback switch back to the previous release
# The git pre-push hook (scripts/git-hooks/pre-push) runs it when you push to main.
#
# Settings come from ~/.axiomtext-deploy.env (never committed; made by deploy/scripts/laptop-setup.sh):
#   SSH_HOST=161.97.179.220   the server
#   SSH_USER=deploy           the user the server set up for deploys
#   SSH_PORT=22               optional
#   SSH_KEY=~/.ssh/axiomtext_deploy
#   SITE_HOST=axiomtext.dev
#   REMOTE_DIR=/var/www/axiomtext.dev   optional
# Works with the bash that ships with macOS (3.2) and with Linux.
set -euo pipefail

MODE=full
for arg in "$@"; do
  case "$arg" in
    --quick | --check | --rollback) MODE="$arg" ;;
    *) echo "Unknown option $arg (use --quick, --check, --rollback)" >&2; exit 2 ;;
  esac
done
CONFIG="${AXIOM_DEPLOY_CONFIG:-$HOME/.axiomtext-deploy.env}"
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

say() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
ok() { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }

# ---------------------------------------------------------------- settings and tools
[ -f "$CONFIG" ] || fail "No $CONFIG — run deploy/scripts/laptop-setup.sh first."
# shellcheck disable=SC1090
. "$CONFIG"
: "${SSH_HOST:?SSH_HOST missing in $CONFIG}"
SSH_USER="${SSH_USER:-deploy}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/axiomtext_deploy}"
SSH_KEY="${SSH_KEY/#\~/$HOME}"
SITE_HOST="${SITE_HOST:-axiomtext.dev}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/axiomtext.dev}"
[ -f "$SSH_KEY" ] || fail "SSH key $SSH_KEY not found."

SSH_OPTS=(-i "$SSH_KEY" -p "${SSH_PORT:-22}" -o BatchMode=yes -o ServerAliveInterval=30 -o ConnectTimeout=15)
remote() { ssh "${SSH_OPTS[@]}" "$SSH_USER@$SSH_HOST" "$@"; }

need() { command -v "$1" >/dev/null 2>&1 || fail "$1 is not installed ($2)."; }
need node "Node 22: brew install node@22"
need pnpm "corepack enable (or: npm install -g pnpm)"
need rsync "brew install rsync"
need curl "comes with macOS"

say "Checking the connection to $SSH_USER@$SSH_HOST"
remote "test -d $REMOTE_DIR/releases && test -w $REMOTE_DIR/releases" \
  || fail "Cannot reach the server, or $REMOTE_DIR/releases is missing (run deploy/scripts/server-setup.sh on the server)."
ok "Server reachable"
if [ "$MODE" = "--check" ]; then
  ok "Setup looks good. Deploy with: deploy/scripts/deploy-from-laptop.sh"
  exit 0
fi

# Points "current" at a release in one atomic step (nginx serves $REMOTE_DIR/current).
switch_to() {
  remote "cd $REMOTE_DIR && ln -sfn releases/$1 current.new && mv -T current.new current"
}

if [ "$MODE" = "--rollback" ]; then
  previous="$(remote "cd $REMOTE_DIR && cur=\$(readlink current | sed 's#releases/##'); ls -1 releases | sort | awk -v c=\"\$cur\" '\$0==c{print p; exit} {p=\$0}'")"
  [ -n "$previous" ] || fail "No earlier release on the server."
  say "Switching back to $previous"
  switch_to "$previous"
  ok "Live: https://$SITE_HOST ($previous)"
  exit 0
fi

# ---------------------------------------------------------------- what is deployed
[ -z "$(git status --porcelain --untracked-files=no)" ] \
  || fail "You have uncommitted changes — commit them first (the commit you push is what gets deployed)."
COMMIT="$(git rev-parse --short=10 HEAD)"
RELEASE="$(date -u +%Y%m%d-%H%M%S)-$COMMIT"
say "Deploying $COMMIT ($(git log -1 --format=%s | cut -c1-70))"

say "Installing dependencies"
pnpm install --frozen-lockfile --silent || fail "pnpm install failed."

# ---------------------------------------------------------------- checks
if [ "$MODE" != "--quick" ]; then
  say "Checks: format, lint, types, unit tests, sizes, licenses (a few minutes)"
  pnpm check || fail "Checks failed — nothing was deployed."
  ok "Checks passed"
fi

# ---------------------------------------------------------------- build
say "Building the website (docs, demo, playground)"
pnpm --filter '@axiomtext/website...' build >/dev/null || fail "Website build failed."
DIST="apps/website/dist"
[ -f "$DIST/index.html" ] && [ -f "$DIST/playground/index.html" ] || fail "The build is incomplete."
# Stamp the release so the check below can tell the new version is live.
printf '%s\n' "$RELEASE" > "$DIST/release.txt"
ok "Built $(du -sh "$DIST" | cut -f1)"

# ---------------------------------------------------------------- upload and switch
say "Uploading release $RELEASE"
# --link-dest reuses unchanged files from the live release, so uploads stay small and fast.
rsync -az --delete -e "ssh ${SSH_OPTS[*]}" --link-dest="$REMOTE_DIR/current/" \
  "$DIST/" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/releases/$RELEASE/" || fail "Upload failed; the live site was not changed."
previous="$(remote "readlink $REMOTE_DIR/current 2>/dev/null | sed 's#releases/##'" || true)"
say "Switching the site to $RELEASE"
switch_to "$RELEASE"

# https normally; plain http still works before HTTPS is set up (first deploy).
live() {
  local scheme
  for scheme in https http; do
    if [ "$(curl -fsS "$scheme://$SITE_HOST/release.txt" 2>/dev/null)" = "$RELEASE" ] \
        && curl -fsS "$scheme://$SITE_HOST/" 2>/dev/null | grep -q 'AxiomText'; then
      URL="$scheme://$SITE_HOST"
      return 0
    fi
  done
  return 1
}
say "Checking https://$SITE_HOST"
for _ in $(seq 1 12); do
  if live; then
    # Keep the 5 newest releases (never the live one).
    remote "cd $REMOTE_DIR/releases && ls -1 | sort | head -n -5 | grep -vx '$RELEASE' | xargs -r rm -rf" || true
    ok "Live: $URL ($COMMIT)"
    [ "$URL" = "https://$SITE_HOST" ] || printf 'Note: HTTPS is not set up yet — run deploy/scripts/server-setup.sh on the server again once DNS points to it.\n'
    exit 0
  fi
  sleep 5
done
if [ -n "$previous" ]; then
  switch_to "$previous"
  fail "The new release did not answer — switched back to $previous. Check: ssh $SSH_USER@$SSH_HOST 'sudo tail -50 /var/log/nginx/error.log'"
fi
fail "The site did not answer in time — check DNS, nginx and HTTPS (deploy/README.md)."

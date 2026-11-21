#!/usr/bin/env bash
# One-time setup on your Mac (or any computer you deploy from). Run it from the repository:
#   deploy/scripts/laptop-setup.sh
# 1. turns on the pre-push hook: pushing main checks, builds and deploys (scripts/git-hooks/pre-push)
# 2. writes ~/.axiomtext-deploy.env (server address, user, key) — outside the repository, never committed
# 3. makes an SSH key for this computer (~/.ssh/axiomtext_deploy) and shows the one line to add on the server
# 4. checks the tools and the connection
# Safe to run again: it keeps what is already there.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
CONFIG="$HOME/.axiomtext-deploy.env"
KEY="$HOME/.ssh/axiomtext_deploy"

echo "1/4  Pre-push hook"
git config core.hooksPath scripts/git-hooks
chmod +x scripts/git-hooks/pre-push deploy/scripts/*.sh
echo "     On: pushing main now deploys it."

echo "2/4  Settings ($CONFIG)"
if [ -f "$CONFIG" ]; then
  echo "     Already there — keeping it."
else
  host="${SSH_HOST:-161.97.179.220}"
  cat > "$CONFIG" <<CFG
# Where deploy/scripts/deploy-from-laptop.sh deploys to. Not part of the repository.
SSH_HOST=$host
SSH_USER=deploy
SSH_KEY=$KEY
SITE_HOST=axiomtext.dev
REMOTE_DIR=/var/www/axiomtext.dev
CFG
  chmod 600 "$CONFIG"
  echo "     Written (server $host)."
fi

echo "3/4  SSH key for this computer ($KEY)"
mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"
if [ -f "$KEY" ]; then
  echo "     Already there."
else
  ssh-keygen -q -t ed25519 -N "" -C "axiomtext-deploy@$(hostname -s)" -f "$KEY"
  echo "     Made a new key."
fi
# shellcheck disable=SC1090
. "$CONFIG"
if ssh -i "$KEY" -p "${SSH_PORT:-22}" -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new \
    "${SSH_USER:-deploy}@$SSH_HOST" true 2>/dev/null; then
  echo "     The server already accepts this key."
else
  echo
  echo "     The server does not know this key yet. Log in to the server as root and run this ONE line:"
  echo
  echo "     echo '$(cat "$KEY.pub")' >> /home/deploy/.ssh/authorized_keys"
  echo
  echo "     (If the server is not set up yet, first run deploy/scripts/server-setup.sh there — deploy/README.md.)"
  echo "     Then run deploy/scripts/laptop-setup.sh again."
  exit 0
fi

echo "4/4  Tools and connection"
deploy/scripts/deploy-from-laptop.sh --check
echo
echo "Done. From now on:"
echo "  git push                          checks, deploys, then pushes main (a few minutes)"
echo "  AXIOM_DEPLOY=quick git push       deploys without the checks"
echo "  AXIOM_DEPLOY=0 git push           pushes without deploying"
echo "  deploy/scripts/deploy-from-laptop.sh             deploy the current commit without pushing"
echo "  deploy/scripts/deploy-from-laptop.sh --rollback  go back to the previous release"

#!/bin/bash
# ONE-TIME server setup for axiomtext.dev. Run as root on the server:
#
#   curl -fsSL https://raw.githubusercontent.com/axiomtext/axiomtext/main/deploy/scripts/server-setup.sh -o axiomtext-setup.sh
#   sudo bash axiomtext-setup.sh you@example.com
#
# (or copy the file with scp). Safe to run again: every step checks first.
# It does NOT touch other nginx sites already on the server — it only adds
# /etc/nginx/sites-available/axiomtext.dev.
#
#  1. installs nginx, certbot and rsync (if missing)
#  2. creates (or reuses) the "deploy" user that your computer uploads as
#  3. creates /var/www/axiomtext.dev/releases, owned by deploy
#  4. installs the nginx site and, once DNS points here, gets a Let's Encrypt certificate
set -euo pipefail

EMAIL="${1:-}"
DOMAIN="${AXIOM_DOMAIN:-axiomtext.dev}"
REPO_RAW="${AXIOM_REPO_RAW:-https://raw.githubusercontent.com/axiomtext/axiomtext/main}"
APP_DIR="/var/www/$DOMAIN"
DEPLOY_USER=deploy

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "Run as root (sudo bash $0 you@example.com)"; exit 1; }
[ -n "$EMAIL" ] || { echo "Usage: sudo bash $0 you@example.com   (email for Let's Encrypt expiry notices)"; exit 1; }

say "1/4 Packages (nginx, certbot, rsync)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl rsync nginx certbot python3-certbot-nginx >/dev/null
systemctl enable --now nginx >/dev/null
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 'Nginx Full' >/dev/null || true
fi

say "2/4 Deploy user ($DEPLOY_USER)"
if id "$DEPLOY_USER" >/dev/null 2>&1; then
  echo "    Already exists — reusing it."
else
  adduser --disabled-password --gecos "" "$DEPLOY_USER" >/dev/null
  echo "    Created."
fi
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"

say "3/4 Site folder ($APP_DIR)"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR" "$APP_DIR/releases"
if [ ! -e "$APP_DIR/current" ]; then
  # A placeholder until the first deploy, so nginx and certbot have something to serve.
  install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/releases/00000000-placeholder"
  echo '<!doctype html><title>AxiomText</title><p>AxiomText — coming soon.</p>' \
    > "$APP_DIR/releases/00000000-placeholder/index.html"
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/releases/00000000-placeholder"
  sudo -u "$DEPLOY_USER" ln -sfn releases/00000000-placeholder "$APP_DIR/current"
fi

say "4/4 nginx site and HTTPS"
SITE_FILE="/etc/nginx/sites-available/$DOMAIN"
if [ -f "$SITE_FILE" ] && grep -q "ssl_certificate" "$SITE_FILE"; then
  echo "    $SITE_FILE already has HTTPS — leaving it as it is."
else
  if [ -f "$(dirname "$0")/../nginx-axiomtext.dev.conf" ]; then
    cp "$(dirname "$0")/../nginx-axiomtext.dev.conf" "$SITE_FILE"
  else
    curl -fsSL "$REPO_RAW/deploy/nginx-axiomtext.dev.conf" -o "$SITE_FILE"
  fi
  ln -sfn "$SITE_FILE" "/etc/nginx/sites-enabled/$DOMAIN"
  nginx -t && systemctl reload nginx
  echo "    nginx serves $APP_DIR/current for $DOMAIN and www.$DOMAIN."
fi

SERVER_IP="$(curl -fsS -4 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
DNS_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}')"
if grep -q "ssl_certificate" "$SITE_FILE"; then
  echo "    HTTPS is already on."
elif [ "$DNS_IP" = "$SERVER_IP" ]; then
  certbot --nginx -n --agree-tos -m "$EMAIL" --redirect -d "$DOMAIN" -d "www.$DOMAIN"
  echo "    HTTPS is on (renews automatically)."
else
  warn "$DOMAIN points to ${DNS_IP:-nothing}, not this server ($SERVER_IP)."
  warn "Change the DNS A record for @ to $SERVER_IP, wait a few minutes, then run this script again for HTTPS."
fi

say "Done"
echo "Next, on your computer (in the repository): deploy/scripts/laptop-setup.sh"
echo "It prints one line to add the computer's key here, in /home/$DEPLOY_USER/.ssh/authorized_keys."

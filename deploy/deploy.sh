#!/usr/bin/env bash
# Shortcut: deploy the current commit now (same as deploy/scripts/deploy-from-laptop.sh).
exec "$(dirname "$0")/scripts/deploy-from-laptop.sh" "$@"

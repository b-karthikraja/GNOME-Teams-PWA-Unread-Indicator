#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${HOME}/.local/share/gnome-shell/extensions/teams-unread-indicator@local"
mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
cp -a "${SCRIPT_DIR}/gnome-extension" "$DEST"
chmod -R u+rwX "$DEST"
echo "Installed GNOME extension files at: $DEST"
if command -v gnome-extensions >/dev/null 2>&1; then
  gnome-extensions enable teams-unread-indicator@local || true
  echo "If it does not appear, enable it in the Extensions app and sign out/in if prompted."
else
  echo "Install/enable it with the GNOME Extensions app or gnome-extensions CLI."
fi

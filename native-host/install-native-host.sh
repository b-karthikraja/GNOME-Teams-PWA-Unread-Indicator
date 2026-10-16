#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 CHROME_EXTENSION_ID" >&2
  echo "Open chrome://extensions and copy the 32-character ID of this unpacked extension." >&2
  exit 2
fi
EXT_ID="$1"
if [[ ! "$EXT_ID" =~ ^[a-p]{32}$ ]]; then
  echo "Invalid Chrome extension ID. Expected 32 characters, each between a and p." >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_SCRIPT="${SCRIPT_DIR}/teams_unread_native_host.py"
chmod +x "$HOST_SCRIPT"
HOST_DIR="${HOME}/.config/google-chrome/NativeMessagingHosts"
mkdir -p "$HOST_DIR"
cat > "${HOST_DIR}/com.local.teams_unread_indicator.json" <<JSON
{
  "name": "com.local.teams_unread_indicator",
  "description": "Local Teams unread count bridge for GNOME",
  "path": "${HOST_SCRIPT}",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://${EXT_ID}/"]
}
JSON
chmod 600 "${HOST_DIR}/com.local.teams_unread_indicator.json"
echo "Installed native host manifest at: ${HOST_DIR}/com.local.teams_unread_indicator.json"
echo "Keep this extracted folder in the same location; Chrome references the Python script by its absolute path."

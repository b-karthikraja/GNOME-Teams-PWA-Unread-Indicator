# GNOME Teams PWA Unread Indicator

A small, community-built integration for **Microsoft Teams PWA + Chrome + GNOME Shell** on Ubuntu. It reads the unread activity count exposed by the Teams web app title and displays that count as a badge in the GNOME top panel.

Clicking the panel indicator launches the configured Teams PWA command.

> **Unofficial project.** This is not affiliated with or endorsed by Microsoft.

## Features

- GNOME Shell 46 support.
- Microsoft Teams-style `T` icon in the GNOME top panel.
- Red unread-count badge.
- Reads the Teams unread activity count from the page title, e.g. `(3) Chat | Microsoft Teams`.
- Chrome Manifest V3 extension.
- Chrome Native Messaging bridge to a local Python host.
- Writes only the count, page title, and timestamp to a local JSON state file.
- No Microsoft Graph API, OAuth token, cookie, or message-body access.
- Configurable PWA launcher command.
- Works with the existing Chrome-installed Teams PWA.

## Architecture

```text
Microsoft Teams PWA
        |
        | document.title
        v
Chrome Extension
        |
        | Native Messaging
        v
Python Native Host
        |
        | state.json
        v
~/.cache/teams-unread-indicator/state.json
        |
        v
GNOME Shell Extension
        |
        v
GNOME Top Panel
```

## Requirements

- Ubuntu or another Linux distribution using GNOME Shell.
- GNOME Shell 46 for the included extension metadata.
- Google Chrome/Chromium with Native Messaging support.
- Python 3.
- Microsoft Teams opened in Chrome/PWA and signed in.

The included configuration was developed around **Ubuntu 24.04 + GNOME Shell 46**.

## Project structure

```text
.
├── chrome-extension/
│   ├── manifest.json
│   ├── background.js
│   └── teams-title-monitor.js
├── native-host/
│   ├── teams_unread_native_host.py
│   └── install-native-host.sh
├── gnome-extension/
│   ├── extension.js
│   ├── metadata.json
│   ├── stylesheet.css
│   └── icons/
│       └── teams.svg
├── install-gnome-extension.sh
├── LICENSE
└── README.md
```

## How unread detection works

Teams currently exposes its unread activity count in the page title. For example:

```text
(3) Chat | Microsoft Teams
```

The Chrome content script observes changes to the `<head>`/title and extracts the leading number:

```text
(3) Chat | Microsoft Teams  ->  3
Chat | Microsoft Teams      ->  0
```

The extension sends that number to the local Native Messaging host. The host validates the value and writes:

```text
~/.cache/teams-unread-indicator/state.json
```

Example:

```json
{
  "count": 3,
  "title": "(3) Chat | Microsoft Teams",
  "updated_at": "2026-10-16T10:00:00+00:00"
}
```

### Important limitation

This is the **unread activity count reported by Teams**, not necessarily the number of individual unread messages. Teams can include chats and other activity in this count.

If Microsoft changes the Teams title format, the parser in `chrome-extension/teams-title-monitor.js` may need to be updated.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/gnome-teams-pwa-unread-indicator.git
cd gnome-teams-pwa-unread-indicator
```

Keep this directory in a stable location. The Native Messaging manifest references the Python host using its absolute path.

### 2. Load the Chrome extension

Open:

```text
chrome://extensions
```

Then:

1. Enable **Developer mode**.
2. Click **Load unpacked**.
3. Select this repository's `chrome-extension/` directory.
4. Copy the extension ID shown by Chrome.

The ID looks like:

```text
abcdefghijklmnopabcdefghijklmnop
```

### 3. Register the Native Messaging host

Run:

```bash
./native-host/install-native-host.sh YOUR_EXTENSION_ID
```

For example:

```bash
./native-host/install-native-host.sh abcdefghijklmnopabcdefghijklmnop
```

The script creates:

```text
~/.config/google-chrome/NativeMessagingHosts/com.local.teams_unread_indicator.json
```

The manifest allows only your specific Chrome extension ID to communicate with the host.

### 4. Install the GNOME extension

```bash
./install-gnome-extension.sh
```

Then enable it if necessary:

```bash
gnome-extensions enable teams-unread-indicator@local
```

Check its status:

```bash
gnome-extensions info teams-unread-indicator@local
gnome-extensions list --enabled
```

### 5. Configure the Teams PWA launcher

The GNOME extension looks for:

```text
~/.config/teams-unread-indicator/launcher.json
```

If this file does not exist, clicking the indicator falls back to:

```text
https://teams.microsoft.com
```

To launch the installed Chrome PWA, first find its desktop entry:

```bash
grep -lEi 'microsoft teams|teams\.microsoft\.com' ~/.local/share/applications/*.desktop 2>/dev/null
```

Inspect matching files if needed:

```bash
grep -E '^(Name|Exec)=' ~/.local/share/applications/*.desktop 2>/dev/null | grep -i teams
```

If your PWA desktop entry is, for example:

```text
~/.local/share/applications/chrome-abcdefghijklmnopabcdefghijklmnop-Default.desktop
```

create:

```bash
mkdir -p ~/.config/teams-unread-indicator
printf '%s\n' '["gtk-launch","chrome-abcdefghijklmnopabcdefghijklmnop-Default"]' > ~/.config/teams-unread-indicator/launcher.json
```

Replace the example launcher ID with the actual `.desktop` filename without `.desktop`.

## Testing

After opening the Teams PWA, run:

```bash
cat ~/.cache/teams-unread-indicator/state.json
```

You should see something similar to:

```json
{"count":0,"title":"Chat | Microsoft Teams","updated_at":"..."}
```

When Teams has unread activity:

```json
{"count":3,"title":"(3) Chat | Microsoft Teams","updated_at":"..."}
```

To reload the GNOME extension:

```bash
gnome-extensions disable teams-unread-indicator@local
gnome-extensions enable teams-unread-indicator@local
```

For GNOME Shell logs:

```bash
journalctl -f /usr/bin/gnome-shell
```

## Configuration paths

| Purpose | Path |
|---|---|
| Chrome extension | `./chrome-extension/` |
| Native host Python script | `./native-host/teams_unread_native_host.py` |
| Chrome Native Messaging manifest | `~/.config/google-chrome/NativeMessagingHosts/com.local.teams_unread_indicator.json` |
| Unread state | `~/.cache/teams-unread-indicator/state.json` |
| PWA launcher | `~/.config/teams-unread-indicator/launcher.json` |
| GNOME extension | `~/.local/share/gnome-shell/extensions/teams-unread-indicator@local/` |

## Privacy

The Chrome extension reads only the Teams page title, extracts the leading unread count, and sends the count and title to the local Native Messaging host.

The Python host runs locally, validates the incoming count, writes the state file, and makes no network requests.

The project does **not** use Microsoft Graph or store Teams authentication tokens.

Do not commit your local Native Messaging manifest, Chrome profile, credentials, or other private configuration if you customize this project.

## Troubleshooting

### Badge does not appear

Check:

```bash
cat ~/.cache/teams-unread-indicator/state.json
```

If the file does not exist, make sure Teams is open and signed in, the Chrome extension is enabled, the Native Messaging host was installed with the correct extension ID, and reload the Teams PWA.

### Chrome reports a Native Messaging error

Check:

```bash
cat ~/.config/google-chrome/NativeMessagingHosts/com.local.teams_unread_indicator.json
ls -l native-host/teams_unread_native_host.py
```

Confirm that the manifest path points to the actual Python script and `allowed_origins` contains the exact Chrome extension ID.

### Teams count stays at zero

Check the actual page title. The current parser expects the count at the beginning in parentheses, such as:

```text
(3) Chat | Microsoft Teams
```

Microsoft can change this behavior at any time.

### Clicking the indicator opens the browser instead of the PWA

Configure `~/.config/teams-unread-indicator/launcher.json` with the correct Chrome PWA desktop entry as described above.

## Removing the project

```bash
gnome-extensions disable teams-unread-indicator@local
rm -rf ~/.local/share/gnome-shell/extensions/teams-unread-indicator@local
rm -f ~/.config/google-chrome/NativeMessagingHosts/com.local.teams_unread_indicator.json
rm -rf ~/.cache/teams-unread-indicator
rm -rf ~/.config/teams-unread-indicator
```

Then remove the unpacked extension from `chrome://extensions`.

## Contributing

Issues and pull requests are welcome. Improvements to Teams title parsing and support for newer GNOME Shell versions are especially useful.

## License

MIT License. See [LICENSE](LICENSE).

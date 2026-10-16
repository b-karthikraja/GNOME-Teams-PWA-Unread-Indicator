#!/usr/bin/env python3
"""Chrome Native Messaging host: write a validated unread count to a local state file."""
import json
import os
import struct
import sys
from datetime import datetime, timezone
from pathlib import Path

MAX_MESSAGE_SIZE = 1024 * 1024
STATE_DIR = Path.home() / ".cache" / "teams-unread-indicator"
STATE_FILE = STATE_DIR / "state.json"


def read_message():
    header = sys.stdin.buffer.read(4)
    if len(header) != 4:
        raise ValueError("Missing or incomplete Native Messaging header")
    (length,) = struct.unpack("<I", header)
    if length <= 0 or length > MAX_MESSAGE_SIZE:
        raise ValueError("Invalid Native Messaging message size")
    payload = sys.stdin.buffer.read(length)
    if len(payload) != length:
        raise ValueError("Incomplete Native Messaging payload")
    return json.loads(payload.decode("utf-8"))


def write_message(obj):
    payload = json.dumps(obj, separators=(",", ":")).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(payload)))
    sys.stdout.buffer.write(payload)
    sys.stdout.buffer.flush()


def main():
    try:
        message = read_message()
        count = message.get("count")
        if isinstance(count, bool) or not isinstance(count, int) or count < 0 or count > 100000:
            raise ValueError("Count must be an integer from 0 to 100000")
        title = message.get("title", "")
        if not isinstance(title, str):
            title = ""

        STATE_DIR.mkdir(parents=True, exist_ok=True)
        state = {
            "count": count,
            "title": title[:300],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        tmp = STATE_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(state), encoding="utf-8")
        os.replace(tmp, STATE_FILE)
        write_message({"ok": True})
    except Exception as exc:  # Keep stdout reserved for the Chrome protocol.
        print(f"teams unread native host: {exc}", file=sys.stderr)
        write_message({"ok": False, "error": str(exc)[:200]})


if __name__ == "__main__":
    main()

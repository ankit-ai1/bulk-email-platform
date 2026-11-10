#!/usr/bin/env bash
# Updates the worker on the VM straight from GitHub, pinned to one reviewed commit.
# Usage: ~/deploy.sh <full-commit-hash>
# .env and node_modules are kept; the previous code is saved in ~/worker.bak.
set -euo pipefail

SHA="${1:-}"
if [[ ! "$SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: ~/deploy.sh <full 40-character commit hash>"
  exit 1
fi

WORKER="$HOME/worker"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading commit $SHA ..."
curl -fsSL "https://codeload.github.com/ankit-ai1/bulk-email-platform/tar.gz/$SHA" | tar -xz -C "$TMP"
SRC="$(echo "$TMP"/*/worker)"
[ -f "$SRC/api.js" ] && [ -f "$SRC/index.js" ] || { echo "Worker code not found in that commit. Nothing changed."; exit 1; }

# Refuse anything carrying the payload seen in the injected commits.
if grep -rlE "global\['\\\\u0072'\]|INDEXER_URL|BLOCK_MULTIPLE|codeload|eval\(" "$SRC" --include=*.js --exclude=deploy.sh >/dev/null 2>&1; then
  echo "Suspicious code found in this commit. Nothing changed."
  exit 1
fi

echo "Backing up current code to ~/worker.bak ..."
rm -rf "$HOME/worker.bak" && mkdir -p "$HOME/worker.bak"
find "$WORKER" -maxdepth 2 \( -name node_modules -prune \) -o -type f \( -name '*.js' -o -name 'package*.json' -o -name '*.sh' \) -print \
  | while read -r f; do rel="${f#$WORKER/}"; mkdir -p "$HOME/worker.bak/$(dirname "$rel")"; cp "$f" "$HOME/worker.bak/$rel"; done

OLD_LOCK="$(sha256sum "$WORKER/package-lock.json" 2>/dev/null | cut -d' ' -f1 || true)"
cp -r "$SRC"/. "$WORKER"/
cp "$WORKER/deploy.sh" "$HOME/deploy.sh" && chmod +x "$HOME/deploy.sh"

if [ "$OLD_LOCK" != "$(sha256sum "$WORKER/package-lock.json" | cut -d' ' -f1)" ]; then
  echo "Packages changed, installing ..."
  (cd "$WORKER" && npm ci --omit=dev --no-audit --no-fund)
fi

echo "$SHA" > "$WORKER/DEPLOYED_COMMIT"
sudo systemctl restart synerax-worker
sleep 3
sudo journalctl -u synerax-worker -n 5 --no-pager
echo "Done. Now running commit $SHA"

#!/usr/bin/env bash
# =============================================================================
# Install pre-commit secret scanner hook
# =============================================================================
# Run this ONCE after cloning the repository:
#   bash hooks/install.sh
#
# After installation, the hook runs automatically before every git commit.
# =============================================================================

set -euo pipefail

HOOK_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pre-commit"
HOOK_DST=".git/hooks/pre-commit"

if [[ ! -d ".git" ]]; then
  echo "Error: run this from the root of your git repository." >&2
  exit 1
fi

if [[ ! -f "$HOOK_SRC" ]]; then
  echo "Error: hooks/pre-commit not found. Make sure you run from the repo root." >&2
  exit 1
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"

echo ""
echo "✔  Pre-commit Geheimnis-Scanner installiert / Secret scanner installed"
echo "   Pfad / Path: $HOOK_DST"
echo ""
echo "   Der Hook läuft automatisch vor jedem 'git commit'."
echo "   The hook runs automatically before every 'git commit'."
echo ""
echo "   Notfall-Bypass / Emergency bypass (never for real secrets!):"
echo "   git commit --no-verify -m \"your message\""
echo ""

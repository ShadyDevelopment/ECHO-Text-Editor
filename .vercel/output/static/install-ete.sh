#!/usr/bin/env bash
# Install ECHO Text Editor (ete) for the current user.
set -euo pipefail
DEST="${HOME}/.local/bin"
mkdir -p "$DEST"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
install -m 755 "${SCRIPT_DIR}/ete.py" "${DEST}/ete"
echo "Installed ${DEST}/ete"
echo "Add ~/.local/bin to PATH if 'ete' is not found, then run: ete --version"

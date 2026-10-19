#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -1)"; VERSION="${VERSION:-dev}"
APP_DIR="$(pwd)"; DESKTOP_DIR="${XDG_DESKTOP_DIR:-$HOME/Desktop}"; APPLICATIONS_DIR="$HOME/.local/share/applications"; mkdir -p "$APPLICATIONS_DIR"
DESKTOP_FILE="$APPLICATIONS_DIR/blue-ocean-service-studio.desktop"
cat > "$DESKTOP_FILE" <<EOF2
[Desktop Entry]
Type=Application
Name=BLUE OCEAN Service Studio
Comment=BLUE OCEAN Service Studio V${VERSION}
Exec=bash -lc 'cd "${APP_DIR}" && ./start-linux.sh'
Icon=${APP_DIR}/public/blue-ocean-mark.svg
Terminal=true
Categories=Office;Development;
StartupNotify=true
EOF2
chmod +x "$DESKTOP_FILE"
if [[ -d "$DESKTOP_DIR" ]]; then cp "$DESKTOP_FILE" "$DESKTOP_DIR/BLUE-OCEAN-Service-Studio.desktop"; chmod +x "$DESKTOP_DIR/BLUE-OCEAN-Service-Studio.desktop"; echo "Atalho criado em: $DESKTOP_DIR/BLUE-OCEAN-Service-Studio.desktop"; fi
echo "Atalho de aplicativo criado em: $DESKTOP_FILE"

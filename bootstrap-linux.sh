#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -1)"; VERSION="${VERSION:-dev}"
echo "BLUE OCEAN Service Studio V${VERSION} — bootstrap Linux"
command -v node >/dev/null || { echo 'ERRO: Node.js 20–22 não encontrado.' >&2; exit 1; }
command -v npm >/dev/null || { echo 'ERRO: npm 10+ não encontrado.' >&2; exit 1; }
npm ci --no-audit --no-fund
npm run release:verify
exec ./start-linux.sh

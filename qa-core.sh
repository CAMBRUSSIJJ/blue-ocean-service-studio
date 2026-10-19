#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -1)"; VERSION="${VERSION:-dev}"
echo "=== QA — BLUE OCEAN V${VERSION} ==="
npm run lock:verify
npm run source:authority
npm run qa
npm run foundation:smoke
for f in src/runtime/*.js; do node --check "$f" >/dev/null; done
if grep -R -q 'MutationObserver' src --include='*.js'; then echo 'FAIL MutationObserver'; exit 1; fi
if grep -R -qE 'prompt\(|confirm\(' src/runtime --include='*.js'; then echo 'FAIL diálogo nativo'; exit 1; fi
echo "QA Core V${VERSION}: OK"

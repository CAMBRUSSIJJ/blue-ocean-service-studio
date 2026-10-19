#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node scripts/v1151-build-doctor.mjs
if [[ ! -x node_modules/.bin/vite || ! -x node_modules/.bin/tsc ]]; then
  echo 'Restaurando dependências exatas do package-lock...'
  npm ci --no-audit --no-fund
fi
npm run dev -- --host 127.0.0.1 --port 4173

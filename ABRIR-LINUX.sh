#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f dist/index.html ]]; then
  echo 'A build pronta não está nesta pasta. Extraia o pacote Linux completo ou execute npm ci && npm run build.' >&2
  exit 2
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo 'Instale Python 3 para abrir a versão pronta no Linux.' >&2
  exit 2
fi
exec python3 scripts/serve-linux.py "$@"

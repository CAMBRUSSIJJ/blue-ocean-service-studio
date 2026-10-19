#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -1)"
VERSION="${VERSION:-dev}"
RELEASE="H17.0.5"
CHECK_ONLY=0
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=1

echo "BLUE OCEAN Service Studio V${VERSION} — ${RELEASE} — Linux Launcher"
echo

if [[ ! -f dist/index.html ]]; then
  echo "Esta versão é source-first: a build precisa ser gerada uma vez nesta máquina."
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "ERRO: Node.js 20–22 e npm 10+ são necessários para gerar a build V${VERSION}." >&2
    exit 1
  fi
  node scripts/v1151-build-doctor.mjs
  if [[ ! -x node_modules/.bin/vite || ! -x node_modules/.bin/tsc ]]; then
    echo "Instalando dependências exatas do package-lock..."
    set +e
    if command -v timeout >/dev/null 2>&1; then
      timeout --signal=TERM --kill-after=15s 240s npm ci --no-audit --no-fund --prefer-offline
      npm_status=$?
    else
      npm ci --no-audit --no-fund --prefer-offline
      npm_status=$?
    fi
    set -e
    if [[ "$npm_status" -ne 0 ]]; then
      echo "ERRO: npm ci não concluiu (código $npm_status). Verifique acesso ao registry npm e tente novamente." >&2
      echo "O source não será marcado como buildado enquanto a instalação exata não concluir." >&2
      exit "$npm_status"
    fi
  fi
  npm run release:verify
fi

./preflight-linux.sh
if [[ "$CHECK_ONLY" -eq 1 ]]; then
  if command -v python3 >/dev/null 2>&1; then python3 scripts/serve-linux.py --check
  elif command -v python >/dev/null 2>&1; then python scripts/serve-linux.py --check
  elif command -v node >/dev/null 2>&1; then node scripts/serve-linux.mjs --check
  else echo "ERRO: instale Python 3 ou Node.js para iniciar o servidor local." >&2; exit 1; fi
  echo "Launcher Linux: OK"; exit 0
fi

echo; echo "Abrindo em: http://127.0.0.1:4173/"; echo "Mantenha este terminal aberto. Ctrl+C encerra o servidor."; echo
if command -v python3 >/dev/null 2>&1; then exec python3 scripts/serve-linux.py
elif command -v python >/dev/null 2>&1; then exec python scripts/serve-linux.py
elif command -v node >/dev/null 2>&1; then exec node scripts/serve-linux.mjs
else echo "ERRO: instale Python 3 ou Node.js para iniciar o servidor local." >&2; exit 1; fi

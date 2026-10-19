#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
KIT="$ROOT/qa/whiteboard-sim"
cd "$KIT"
if [[ ! -d node_modules ]]; then
  echo "Dependências do Sim Kit não instaladas."
  echo "Execute uma vez:"
  echo "  cd \"$KIT\""
  echo "  npm install"
  exit 2
fi
python3 build-sim.py "$ROOT"
./run-all.sh

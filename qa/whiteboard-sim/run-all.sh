#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export SIM_OUTPUT_DIR="${SIM_OUTPUT_DIR:-$PWD/results}"
export SIM_PHASE_TIMEOUT="${SIM_PHASE_TIMEOUT:-280}"
rm -rf "$SIM_OUTPUT_DIR"
mkdir -p "$SIM_OUTPUT_DIR"
node preflight.cjs
crashed=0
for p in 0 1 2 3 4 5 6 7; do
  echo "\n>>> Rodando fase $p"
  set +e
  timeout "$SIM_PHASE_TIMEOUT" node "phase${p}.cjs"
  code=$?
  set -e
  if [[ "$code" -ne 0 ]]; then
    printf 'F%s falhou ou excedeu timeout; exit=%s\n' "$p" "$code" | tee "$SIM_OUTPUT_DIR/crash-$p.txt"
    crashed=1
  fi
done
if ! node summarize.cjs; then
  exit 1
fi
if [[ "$crashed" -ne 0 ]]; then
  exit 1
fi

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TMP="${TMPDIR:-/tmp}/rt-empty-types"
mkdir -p "$TMP"
tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM --skipLibCheck --typeRoots "$TMP" src/domain/model.ts src/domain/integrity.ts src/domain/graph-operations.ts
echo 'Domain TypeScript: OK'

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
chmod +x start-linux.sh 2>/dev/null || true
exec ./start-linux.sh "$@"

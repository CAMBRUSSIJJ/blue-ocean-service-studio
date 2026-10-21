#!/usr/bin/env bash
set -euo pipefail
test "$(uname -m)" = x86_64
mkdir -p /workspace/.cloud-tools /workspace/.cache/npm
cd /workspace/.cloud-tools
if [ ! -x node-v22.23.4-linux-x64/bin/node ]; then
  curl --fail --silent --show-error --location https://nodejs.org/dist/v22.23.4/SHASUMS256.txt -o SHASUMS256-v22.23.4.txt
  curl --fail --silent --show-error --location https://nodejs.org/dist/v22.23.4/node-v22.23.4-linux-x64.tar.xz -o node-v22.23.4-linux-x64.tar.xz
  awk '$2 == "node-v22.23.4-linux-x64.tar.xz"' SHASUMS256-v22.23.4.txt > node-v22.23.4.sha256
  test -s node-v22.23.4.sha256
  sha256sum -c node-v22.23.4.sha256
  tar -xJf node-v22.23.4-linux-x64.tar.xz
fi
export PATH=/workspace/.cloud-tools/node-v22.23.4-linux-x64/bin:$PATH
export npm_config_cache=/workspace/.cache/npm
if [ ! -f /workspace/.cloud-tools/npm-10.9.2/lib/node_modules/npm/package.json ]; then
  npm install --global --prefix /workspace/.cloud-tools/npm-10.9.2 npm@10.9.2 --no-audit --no-fund
fi
export PATH=/workspace/.cloud-tools/npm-10.9.2/bin:$PATH
test "$(node --version)" = v22.23.4
test "$(npm --version)" = 10.9.2
cd /workspace/blue-ocean-service-studio
npm ci --no-audit --no-fund
node scripts/prepare-assets.mjs
npm run doctor
python3 -c 'from playwright.sync_api import sync_playwright; from PIL import Image'
test -x /usr/bin/chromium

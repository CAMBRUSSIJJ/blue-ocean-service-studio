# Blue Ocean Service Studio cloud startup

Use the existing checkout at `/workspace/blue-ocean-service-studio`. Each cloud task is already isolated; do not create a Git worktree unless the user explicitly asks. Preserve tracked source, tests, manifests, lockfiles and existing user changes during setup.

The installed filesystem retains Node, npm, node_modules, generated assets and any completed dist build. Server processes must be started again in each new task. Use the supported Node 22 toolchain in every command session:

```bash
export PATH=/workspace/.cloud-tools/npm-10.9.2/bin:/workspace/.cloud-tools/node-v22.23.4-linux-x64/bin:$PATH
export npm_config_cache=/workspace/.cache/npm
export CHROMIUM_PATH=/usr/bin/chromium
cd /workspace/blue-ocean-service-studio
node --version  # v22.23.4
npm --version   # 10.9.2
```

Do not use the image's default Node 24 for this repository. If dependencies are absent or package-lock.json changes, run `npm ci --no-audit --no-fund`. Keep the lockfile unchanged. The saved install script can restore the pinned toolchain if necessary; it verifies the Node archive checksum and retains TLS/package verification.

Start development with `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` in a managed long-running terminal session. This generates the supported local assets before starting Vite. Finish install/build/QA before launching Vite: these commands regenerate public assets by deleting and recreating them, which can invalidate Vite's public-file cache. If you run them while Vite is active, stop and restart only this task's Vite process afterward. Missing runtime assets or CSS in development can otherwise break mobile navigation even though dist works. Reuse an existing instance only after verifying it is this application's server. Do not stop unrelated processes. Inspect server output on failure.

Readiness requires more than a PID: request `http://127.0.0.1:5173/app-version.json`, verify its product is `BLUE OCEAN Service Studio` and its version matches package.json, then run `BLUE_OCEAN_URL=http://127.0.0.1:5173 npm run entry:browser`. This uses the installed Python Playwright and system Chromium to exercise entry, local workspace, project and Journey creation, starter structure and persistence. Browser outputs are under ignored `artifacts/`. Use these loopback addresses only for internal requests; do not present a localhost preview link to the user.

The standard development workflow uses browser-local storage and the visible `Abrir workspace local sem conta` action. No backend, database, external login credentials or environment secrets are required for this workflow. Export backups when preserving application data beyond a browser context.

For production validation, run `npm run release:verify` (doctor, lockfile, TypeScript, source contracts, full QA, build and dist verification). Node 22 and npm 10.9.2 must remain active. For Journey behavior use `npm run editor:selection:test`, `npm run journey:a2:test`, `npm run journey:h1709:move:test`, `npm run journey:h1709:test`, `npm run journey:h1709:p3:test` and `npm run journey:layout:test`. After building, `npm run entry:browser` with BLUE_OCEAN_URL unset tests dist through the test's temporary internal HTTP server. `python3 scripts/h1710-journey-template-whiteboard-browser.py` covers templates, deletion, persistence and the Whiteboard; it also accepts BLUE_OCEAN_URL.

Optional broader editor/visual suites are documented in docs/deployment.md. AXE_PATH is optional and only enables additional accessibility checks when a trusted axe.min.js is supplied; do not claim those audits ran unless explicitly enabled.

After setup, check `git status --short --untracked-files=all`. Generated outputs may be present in ignored paths; tracked repository files must remain unchanged. A DNS-only warning from doctor does not prove registry access is unavailable: npm access works through the configured proxy. Preserve the platform's proxy, authentication and certificate configuration.

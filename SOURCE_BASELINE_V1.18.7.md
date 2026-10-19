# SOURCE BASELINE — V1.18.7 Dashboard Parity

## Base
V1.18.6 — Service Architecture Preview.

## Source authority
`src/` remains the canonical product source. Generated `public/` runtime assets are synchronized through `scripts/prepare-assets.mjs`.

## Main changes
- `src/views/WorkspaceHome.tsx`: Home rebuilt as the compact reference-style Dashboard.
- `src/runtime/dashboard-parity.css`: shell/Home parity layer.
- `src/App.tsx`: Dashboard-specific minimal header/sidebar composition and event routing.
- `src/runtime/workspace-home.js`: canonical Persona create path added.
- `src/main.tsx`: V1.18.7 body marker.
- `scripts/v1187-dashboard-parity-smoke.mjs`: dedicated release gate.
- Historical Home gates updated only where they previously asserted obsolete presentation instead of preserved capability.

## Preserved engines
- Service Health
- Attention Engine
- Continue Engine
- Workspace Preferences / Favorites / Pins
- Service Architecture

## Data invariants
No change to:
- Service Graph Schema V3
- canonical IDs
- migrations
- project IndexedDB/storage
- backups
- import/export contracts

## Reference handling
The user-provided dashboard screenshot was used only as a visual/interaction reference. No third-party brand, logo, domain, image asset, source code or proprietary content is shipped in this release.

## Packaging
Source-first. `node_modules` and `dist` are excluded. A dependency-aware Vite production build must be generated in an environment with working npm registry access.

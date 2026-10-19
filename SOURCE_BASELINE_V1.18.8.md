# SOURCE BASELINE — V1.18.8 Guided Service Builder Foundation

## Base
V1.18.7 — Dashboard Parity.

## Source authority
`src/` remains the canonical product source. Generated `public/` runtime assets are synchronized through `scripts/prepare-assets.mjs`.

## Main changes
- `src/runtime/guidance-engine.js`: deterministic guidance catalog and first-service snapshot engine.
- `src/runtime/guidance-engine.css`: universal guidance UI layer.
- `src/runtime/whiteboard-core.js`: Guided Builder V2 integration, assistance modes, contextual help and universal drawer.
- `src/views/WorkspaceHome.tsx`: explicit first-service/Guided Builder entry.
- `src/App.tsx`: global contextual Help action.
- `src/main.tsx`: V1.18.8 body marker.
- `scripts/prepare-assets.mjs`: publishes V1.18.8 runtime assets.
- `scripts/v1188-guided-builder-smoke.mjs`: dedicated 117-contract release gate.
- `preflight-linux.sh`: verifies V1.18.8 source/generated guidance assets.

## Assistance model
- Guided: full context, examples, checklist and next step.
- Essential: reduced prompts for experienced users.
- Off: professional interface without guidance overlays.

The floating coach remains opt-in to preserve a clean Whiteboard.

## Data invariants
No change to:
- Service Graph Schema V3
- canonical IDs
- migrations
- project IndexedDB/storage
- backups/import/export contracts

Guidance state is interface/methodology context, not a second service graph.

## Packaging
Source-first. `node_modules` and `dist` are excluded. A dependency-aware Vite production build must be generated in an environment with working npm registry access.

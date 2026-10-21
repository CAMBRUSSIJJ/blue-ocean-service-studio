# BLUE OCEAN Service Studio — Source Baseline V1.11.2

This archive is the editable source project corresponding to the V1.11.2 Functional Sidebar baseline.

## Important compatibility note

The project evolved from RealTalent Service Studio. Internal compatibility identifiers such as `RealTalentRuntime`, persisted storage keys, graph migrations and some historical `rt*` CSS/runtime selectors are intentionally preserved. Do not bulk-rename them during the audit: they are compatibility contracts, not visible branding.

## V1.11.2 source-level changes included

- Visible product identity: BLUE OCEAN Service Studio.
- Blue Ocean sidebar/brand layer in `src/runtime/blue-ocean-shell.js` and `.css`.
- Blue Ocean brand assets in `src/brand/`.
- H1 Journey/Blueprint fallback fix in `src/App.tsx`.
- H1 runtime fixes in `src/runtime/shell.js` and `src/runtime/journey-home.js`.
- Existing Service Graph, persistence, integrity, collaboration, simulation, intelligence, benefits, research and whiteboard runtimes preserved.
- Vercel source deployment config included.

## Commands

- `npm install`
- `npm run dev`
- `npm run typecheck`
- `npm run build`
- `npm run demo:smoke`

## Baseline rule for Work

Audit first. Do not implement new product capabilities before documenting architecture, broken/partial functions, duplicate runtime layers, legacy CSS and acceptance criteria for V1.12.0.

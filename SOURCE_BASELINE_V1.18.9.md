# SOURCE BASELINE — V1.18.9 Creation Architecture Reset

## Base
V1.18.8 — Guided Service Builder Foundation.

## Source authority
`src/` remains the canonical product source. Generated runtime assets in `public/` are synchronized with `scripts/prepare-assets.mjs`.

## Architecture reset
- `src/domain/graph-operations.ts`: true empty workspace, explicit Service creation and separate demo graph.
- `src/repositories/local-graph-repository.ts`: exact untouched-starter migration guard.
- `src/state/useStudioController.ts`: `hasService`, `createService` and explicit demo load.
- `src/domain/model.ts`: first-class `whiteboards` tab.
- `src/views/WhiteboardsView.tsx`: free-board library and truly blank board creation.
- `src/views/WorkspaceHome.tsx`: no-Service Home, Create Service flow and post-create start choice.
- `src/views/BlueprintView.tsx`: no automatic Blueprint creation and strict blueprint filtering.
- `src/App.tsx`: Whiteboards navigation and service-aware module availability.
- `src/runtime/whiteboard-core.js`: strict free/journey/blueprint semantics, blank Blueprint, blank Whiteboard, no starter seed and no invented default Persona.
- `src/runtime/shell.js`: blank-vs-Journey Blueprint creation modes.
- `src/runtime/workspace-home.js`: service-aware quick creation.
- `src/runtime/creation-reset.css`: blank Home, Service modal, Whiteboards library and start-choice styling.
- `src/style.css`: valid CSS import order.
- `src/runtime/data-integrity.js`: zero Journeys is a valid Service state.
- `scripts/v1189-creation-architecture-reset-smoke.mjs`: release-specific 83-contract gate.

## Core invariant
A user-created blank Service is not automatically populated by the application.

```text
Service created
Journeys: 0
Stages: 0
Whiteboards: 0
Blueprints: 0
Personas: 0
```

A subsequently created blank Whiteboard contains:

```text
viewKind: free
items: {}
edges: {}
```

## Compatibility
Existing non-starter projects remain preserved. Only the exact untouched historical default starter is eligible for automatic reset.

## Packaging
Source-first. `node_modules` and `dist` are excluded from final release ZIPs. Generate dependency-aware production output only in an environment with functional npm registry access.

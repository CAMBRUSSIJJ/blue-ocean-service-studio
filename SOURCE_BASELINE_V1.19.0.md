# SOURCE BASELINE — V1.19.0 Service Builder Assistant

## Base
V1.18.9 — Creation Architecture Reset.

## Source authority
`src/` remains the canonical product source. Generated runtime assets in `public/` are refreshed using `scripts/prepare-assets.mjs`.

## Core invariant
A blank Service/Whiteboard stays blank until explicit user action. The Service Builder Assistant is a guidance/control layer over the canonical Service Graph, not a second data model.

## Main implementation surfaces
- `src/runtime/whiteboard-core.js`
  - Service Builder Assistant state per board;
  - four assistant modes;
  - 11-step construction route;
  - service context/objective/boundaries;
  - deterministic Q&A;
  - explicit Persona/Journey/Stage creation;
  - Whiteboard-preserving Stage/Blueprint entity creation;
  - review and improvement surfaces;
  - assistant rendering and pause/resume behavior.
- `src/runtime/service-builder-assistant.css`
  - professional docked assistant panel;
  - tabs, progress, route, question/answer, review/improvement states;
  - responsive behavior.
- `src/runtime/guidance-engine.js`
  - mappings for assistant construction topics and object guidance.
- `src/views/WorkspaceHome.tsx`
  - guided entry creates/opens a blank free Whiteboard before assistant start.
- `src/views/WhiteboardsView.tsx`
  - dedicated “Montar com assistente” action over a blank free Whiteboard.
- `src/style.css`
  - assistant stylesheet imported before Tailwind directives.
- `scripts/v1190-service-builder-assistant-smoke.mjs`
  - 51 release-specific assistant contracts.

## Service Builder route
```text
Service
→ Objective & boundaries
→ Customer / Persona
→ Stages
→ Experience
→ Operation
→ Evidence
→ Problems
→ Metrics
→ Improvements
→ Final Review
```

## Creation semantics
- Assistant start: no graph mutation.
- Assistant question: no graph mutation.
- Assistant review: no graph mutation.
- Explicit create actions: mutate the canonical graph.
- Journey can be created/linked while the current board remains free.
- Stage/Persona get Smart Object instances on the free canvas.
- Experience/operation entities can be added without forcing a view switch.

## Compatibility
The V1.18.9 creation reset remains authoritative:
- no hidden default Service/Journey/Stage/Persona/Blueprint;
- free Whiteboards remain distinct from Blueprint;
- blank Blueprint remains blank;
- existing real projects remain preserved.

## Packaging
Source-first. `node_modules` and `dist` are excluded from final release ZIPs. A production Vite build must be generated in an environment with functional npm registry/dependency availability.

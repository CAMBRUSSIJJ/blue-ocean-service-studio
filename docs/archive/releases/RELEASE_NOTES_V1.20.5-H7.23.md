# BLUE OCEAN Service Studio V1.20.5-H7.23

## Journey Editor UX 4.0

H7.23 redesigns the Journey editor around the map itself. The Service Graph, Journey Map report, Journey Cover, Blueprint handoff and Whiteboard integrations remain unchanged.

### Canvas-first editor

The large Journey hero is replaced by a compact 72px working header containing the cover, Journey name, status, stage count and key signals. The editing canvas now starts substantially higher on the page.

The nested Journey navigation is reduced to:

- **Mapa**
- **Evidências**
- **Insights**

The Service Workspace above it remains responsible for Visão geral / Journey / Blueprint / Whiteboard.

### Compact toolbar

The permanent toolbar now prioritizes:

- + Etapa
- Essencial / Detalhado
- Desfazer / Refazer
- Zoom
- Ajustar à tela
- Mais ferramentas

Copy, paste, duplicate, delete, row visibility, stage width, focus and shortcuts remain available through the More menu instead of consuming permanent horizontal space.

### Essential vs Detailed

**Essencial** shows the five core lanes:

- Ações do cliente
- Pensamentos
- Emoções
- Touchpoints
- Problemas validados

**Detalhado** restores all ten canonical Journey Map dimensions, including Needs, Moments of Truth, Evidence, local Frictions and Opportunities.

### Stage presentation

Stages now default to 328px width. Each stage header displays:

- stage number;
- title;
- structural maturity score;
- evidence count;
- validated-problem count;
- moment-of-truth signal when applicable.

Selection, drag and inspector actions are contextual instead of permanently dominating the header.

### Emotion curve

The emotion curve is reduced to 70px while remaining derived directly from canonical Stage.emotion values. Clicking a point selects and reveals the matching stage.

### Cleaner lanes

Permanent borders were removed from most Journey cells. Cells use subtle surfaces and reveal stronger borders on hover/focus. The fixed left lane rail remains sticky while horizontal stage navigation continues independently.

### Inspector

The Inspector is reduced to 390px and gains a summary row for:

- Evidence
- Validated Problems
- Touchpoints
- Opportunities

All values are derived from the selected canonical Stage; no parallel data model was introduced.

### Journey minimap

Journeys with more than five stages receive a compact sticky minimap. Selecting a minimap stage navigates the canvas to that canonical stage.

## QA

- H7.23: 49/49 PASS
- H7.22: 47/47 PASS
- H7.21: 48/48 PASS
- Journey Maps 2.0: 41/41 PASS
- Service Blueprints 2.0: 36/36 PASS
- Whiteboard 2.0: 40/40 PASS
- Journey Cover: 35/35 PASS
- Dashboard Recovery: 20/20 PASS
- Accumulated QA: 2260 OK / 0 FAIL
- syntax:check: PASS
- lock:verify: PASS
- source:authority: PASS
- foundation:smoke: 12/12 PASS
- preflight Linux: PASS

A real `npm ci` attempt did not complete inside the available execution window. Partial dependencies were removed, so full typecheck/build are not declared PASS.

# BLUE OCEAN Service Studio V1.20.5-H7.22

## Unified Service Blueprint Workspace

H7.22 changes the product model from three separate navigation destinations into one service-design workspace.

### Navigation

The visible **Design do serviço** section now uses **Blueprints** as the single operational entry point, with **Hierarquias** remaining separate. Journey Maps and Whiteboards are no longer exposed as independent sidebar destinations.

Inside Blueprints, the user switches perspectives through:

- Visão geral
- Journey
- Blueprint
- Whiteboard

The underlying Service Graph is unchanged: Journey, Blueprint boards and Whiteboards remain canonical independent entities.

### Service workspace overview

A new overview explains the relationship between the three design perspectives:

- **Journey** — what the customer experiences.
- **Blueprint** — how the operation delivers that experience.
- **Whiteboard** — free exploration and composition.

It shows counts, connected-perspective maturity and recent artifacts using the existing Journey cover system and Blue Ocean object language.

### Journey inside Blueprints

The real H7.21 Journey Workspace 3.0 is embedded directly into the Service Workspace. It keeps its cover, overview, Journey editor, evidence and insights surfaces.

No Journey data is copied or forked.

### Blueprint library

The Blueprint perspective now opens in **Cards** by default while preserving the **Table** option. Cards show stage count, object count, context links and update date.

The deterministic Service Definition -> Blueprint and Journey -> Blueprint flows are preserved.

### Whiteboard inside Blueprints

Whiteboard 2.0 is embedded in the same Service Workspace. Existing context sync, Journey sync, Blueprint sync, Smart Objects and source tracing are preserved.

### Compatibility

Older QA contracts that expected Journey/Whiteboard navigation labels remain satisfied through hidden semantic compatibility markup only. The visible sidebar stays unified.

## QA

- H7.22: 47/47 PASS
- H7.21: 48/48 PASS
- Service Blueprints 2.0: 36/36 PASS
- Whiteboard 2.0: 40/40 PASS
- Accumulated QA: 2211 OK / 0 FAIL
- syntax:check: PASS
- lock:verify: PASS
- source:authority: PASS
- foundation:smoke: 12/12 PASS
- preflight Linux: PASS

Full typecheck/build are not declared PASS because dependencies are not installed in the final source package.

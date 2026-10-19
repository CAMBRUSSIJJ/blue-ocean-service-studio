# SOURCE BASELINE — V1.15.2

Baseline anterior: **V1.15.1 — Build Pipeline Recovery**.

Esta baseline adiciona somente a camada **Precision Studio Shell**. A arquitetura funcional, o Service Graph, a persistência e os contratos de runtime permanecem compatíveis com V1.15.1.

## Novos arquivos centrais

- `src/runtime/precision-studio-shell.css`
- `src/runtime/precision-studio-shell.js`
- `scripts/v1152-precision-studio-smoke.mjs`
- `RELEASE_NOTES_V1.15.2.md`

## Assets públicos

- `/v1152-precision-studio.css`
- `/v1152-precision-studio.js`

## Regra de evolução

Journey Workspace 3.0 e módulos seguintes devem reutilizar:
- tokens V1.13;
- Workspace V1.14;
- Global Navigation V1.15;
- build gates V1.15.1;
- shell, Inspector e toolbar contextual V1.15.2.

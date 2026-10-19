# Source Baseline — V1.16.1

Base: V1.16.0.

## Autoridade

`src/` continua sendo a única autoridade de produto. `public/` é gerado por `scripts/prepare-assets.mjs`. `dist/` é artefato de build e não deve receber correções manuais.

## Mudanças de runtime

- `src/runtime/whiteboard-core.js`: Whiteboard UX 1.16.1, Readiness, Inspector Universal e toolbar contextual simplificada.
- `src/runtime/whiteboard-core.css`: Inspector 320 px, Readiness e refinamento responsivo.
- `scripts/v1161-whiteboard-unified-smoke.mjs`: gate específico da versão.

## Dados

Nenhuma migration de schema nesta versão. Compatibilidade de dados preservada.

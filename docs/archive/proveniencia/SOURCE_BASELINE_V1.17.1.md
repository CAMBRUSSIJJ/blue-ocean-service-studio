# Source Baseline V1.17.1

Baseline derivada da V1.17.0 com foco exclusivo nas bibliotecas de Jornadas e Blueprints.

## Alterações canônicas

- `src/runtime/journey-home.js`: ordenação, filtros rápidos, seleção múltipla, ações em lote e previews estruturais.
- `src/runtime/shell.js`: mesmas capacidades aplicadas à biblioteca de Blueprints.
- `src/runtime/whiteboard-core.js`: preferências `sortBy` e `libraryPreset` persistidas no metadata existente.
- `src/runtime/library.css`: camada visual canônica da Library V1.17.1.
- `src/main.tsx`: marcador `bo-v1171`.
- `scripts/prepare-assets.mjs`: publica `v1171-library.css`.
- `scripts/v1171-library-smoke.mjs`: contratos da release.
- `package.json` / `package-lock.json`: versão 1.17.1 e gate da Library.

## Compatibilidade

Sem mudança de schema, IDs, storage keys ou formato de backup.

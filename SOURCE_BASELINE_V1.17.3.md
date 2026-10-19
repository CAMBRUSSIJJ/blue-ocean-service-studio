# Source Baseline V1.17.3

Baseline derivada da V1.17.2 com foco em unificar workspaces e estados de página.

## Alterações canônicas

- `src/runtime/unified-workspaces.js`: Configurações e coordenação de workspaces.
- `src/runtime/unified-workspaces.css`: geometria visual comum e estados de página.
- `src/runtime/research-workspace.js`: shell/header/tabs/toolbar canônicos e versão sincronizada.
- `src/runtime/service-intelligence.js`: shell/header/tabs/toolbar canônicos.
- `src/runtime/benefits-realization.js`: shell/header/tabs/toolbar canônicos.
- `src/runtime/operating-review.js`: shell/header/KPIs/tabs/toolbar canônicos.
- `src/runtime/collaboration.js`: Colaboração passa de drawer para workspace.
- `src/runtime/shell-consistency.js`: breadcrumbs de Colaboração e Configurações.
- `src/runtime/whiteboard-core.js`: expõe densidade existente ao workspace de Configurações.
- `scripts/v1173-unified-workspaces-smoke.mjs`: gate específico da release.

## Compatibilidade

Sem mudança de schema, IDs, storage keys ou formato de backup. A única preferência modificável pela nova tela (densidade do quadro) já existia em `meta.boardPrefs`.

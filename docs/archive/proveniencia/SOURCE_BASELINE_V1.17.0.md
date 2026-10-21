# Source Baseline V1.17.0

Baseline derivada da V1.16.3 com foco exclusivo na Home 2.0.

## Alterações canônicas

- `src/views/WorkspaceHome.tsx`: novo estado de primeiro uso e Home ativa orientada a ação.
- `src/runtime/workspace-home.js`: fallback compatível com Readiness, atenção e Guided Builder.
- `src/runtime/workspace-home.css`: layout Home 2.0, responsivo e baseado nos tokens BLUE OCEAN.
- `src/App.tsx`: Home recebe ação explícita de importação e descrição atualizada.
- `src/main.tsx`: marcador `bo-v1170`.
- `scripts/v1170-home2-smoke.mjs`: contratos da release.
- `package.json` / `package-lock.json`: versão 1.17.0 e gate Home 2.0.

## Compatibilidade

Sem mudança de schema, IDs, storage keys ou formato de backup.

# V1.20.5-H1 — Full Typecheck Hotfix

## Objetivo
Corrigir os 55 diagnósticos TypeScript reportados após a V1.20.5 sem alterar a arquitetura funcional do Service Frame, Context Library ou Studios.

## Correções
- `BlueprintView.tsx`: `semanticLabels` agora cobre `role`, `dependency` e `policy` exigidos por `WhiteboardSemantic`.
- `ContextLibraryView.tsx`: o relatório de Problem & Evidence usa os nomes canônicos `validationScore` e `validationChecks`.
- `WorkspaceHome.tsx`: drafts e reports anuláveis usam snapshots/fallbacks tipados e escalares derivados para que o TypeScript não perca o narrowing dentro de JSX/callbacks aninhados.
- `validatedProblem` ganhou estado derivado nulo-seguro (`hasValidatedProblem`, título e data derivados).
- Nenhum `as any` ou non-null assertion foi usado para esconder os erros.

## Compatibilidade
- `package.json.version`: 1.20.5 (hotfix de código, sem mudança de schema).
- `schemaVersion`: 3.
- `ServiceProjectState.version`: 1.
- Nenhuma migração de dados necessária.

## Validação
- `npm run syntax:check`: PASS.
- `npm run qa`: PASS.
- `npm run v1205h1:typecheck-hotfix-smoke`: 15/15.
- `npm run lock:verify`: PASS.
- `npm run source:authority`: PASS.
- `npm run foundation:smoke`: PASS.
- `./preflight-linux.sh`: PASS.

## Limitação do ambiente
O ambiente desta geração não resolve `registry.npmjs.org`; `npm ci` não consegue instalar React/Vite/@types e, portanto, `npm run typecheck` e `npm run build` completos não são declarados como PASS aqui. O hotfix foi construído diretamente sobre os 55 diagnósticos fornecidos e inclui um gate específico contra regressão dessas causas.

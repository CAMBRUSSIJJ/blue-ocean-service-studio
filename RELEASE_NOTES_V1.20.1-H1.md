# V1.20.1-H1 — WorkspaceHome Typecheck Hotfix

## Objetivo
Corrigir os 6 erros TypeScript reportados em `src/views/WorkspaceHome.tsx` sem mudar comportamento funcional da V1.20.1.

## Corrigido
- TS6133: remove `jobs` não utilizado.
- TS6133: remove `pains` não utilizado.
- TS6133: remove `designCount` não utilizado.
- TS6133: remove `validationCount` não utilizado.
- TS6133: remove `improvementCount` não utilizado.
- TS2339: a entidade retornada por `createDiscoveryEntity()` passa a ser explicitamente anotada como `GraphEntity` antes de acessar `entity.updatedAt`.

## Compatibilidade
- Preservado `type: discoveryCreate` no quick-create para não quebrar o contrato pré-Journey do UX Truth.
- `VERSION` continua `1.20.1`.
- `package.json.version` continua `1.20.1`.
- Nenhuma mudança em `schemaVersion`, Service Graph, Service Project, UX ou dados persistidos.

## QA
- `workspace-home:h1:smoke`: 9/9.
- `ux-truth:smoke`: 35/35.
- `syntax:check`: PASS.
- `lock:verify`: PASS.
- `source:authority`: PASS.
- `foundation:smoke`: 12/12.
- `preflight-linux.sh`: PASS.
- `npm run qa`: PASS / 0 FAIL.

## Limitação do ambiente
A instalação de dependências (`npm ci`) excede o limite do ambiente e deixa instalação parcial. Por isso `npm run typecheck` e `npm run build` completos não são declarados aqui. O hotfix foi direcionado exatamente aos 6 diagnósticos TypeScript fornecidos e ganhou gate específico para impedir regressão dessas correções.

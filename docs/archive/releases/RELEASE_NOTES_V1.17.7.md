# BLUE OCEAN Service Studio V1.17.7 — TypeScript Gate Recovery

Hotfix de engenharia sobre a V1.17.6. Não altera UX, schema ou persistência.

## Corrigido
- `WorkspaceHome.tsx`: remove a união instável entre `JourneyRecord` e o fallback do Service Graph, tipando explicitamente `journeyRecords`, `blueprintRecords` e `researchSources`.
- `BlueprintView.tsx`: `SmartObjectKind` agora possui labels para todos os objetos registrados no Service Graph.
- `smartContent`: objetos smart fora do core (`persona`, `evidence`, `metric`, etc.) são resolvidos por `graph.entities` em vez de cair incorretamente em `task`.
- `whiteboard-contract.ts`: resolução de smart objects passa a aceitar tanto registros core quanto entidades extensíveis, sem indexar um mapa de cinco chaves com a união completa de `RuntimeObjectKind`.

## Melhorado
- `source:verify` agora executa `npm run typecheck` real; `tsc --noCheck` deixa de ser o gate de release para tipos.
- `brand-polish.js` deixou de usar `MutationObserver`; o acabamento é atualizado por eventos explícitos da plataforma, mantendo o preflight Linux coerente com a arquitetura.

## Preservado
- Service Graph Schema V3, IDs, storage, migrations, UX da V1.17.6 e todos os dados existentes.

## Gate novo
- `npm run type-safety:smoke`

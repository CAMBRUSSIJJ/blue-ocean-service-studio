# V1.20.5-H7.11-H1 — Typecheck Cleanup

Base: V1.20.5-H7.11 — Whiteboard 2.0.

## Corrigido

- `src/services/design-handoff.ts`: removido import type `WhiteboardItem` não utilizado.
- `src/services/whiteboard-studio.ts`: removido parâmetro `board` não utilizado de `addExplicitRelationEdges` e ajustadas as três chamadas.
- `src/views/BlueprintView.tsx`: removido type alias `CanvasBlockProps` não utilizado.

As alterações são exclusivamente de limpeza de TypeScript e não mudam a lógica funcional da H7.11.

## Validação neste ambiente

- H7.11 Whiteboard 2.0 smoke: 40/40 PASS.
- `npm run lock:verify`: PASS.
- `npm run source:authority`: PASS.
- `npm run foundation:smoke`: 12/12 PASS.
- `npm run syntax:check`: PASS.
- `npm ci`: não concluiu dentro do limite do ambiente de geração; portanto o `npm run typecheck` completo não foi marcado como PASS aqui.

O hotfix foi criado especificamente a partir dos três diagnósticos TS6196/TS6133 observados no typecheck completo do usuário.

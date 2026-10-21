# Source Baseline — V1.19.6

Base: V1.19.5 UX Truth & Service Project Entry.

Mudança arquitetural principal: `service.project` passa a ser a fundação canônica do ciclo de criação do serviço.

Arquivos centrais:
- `src/domain/model.ts`
- `src/domain/schema.ts`
- `src/domain/graph-operations.ts`
- `src/domain/migrations.ts`
- `src/services/service-project.ts`
- `src/runtime/data-integrity.js`
- `src/views/WorkspaceHome.tsx`
- `src/runtime/service-project-home.css`
- `scripts/v1196-service-project-foundation-smoke.mjs`

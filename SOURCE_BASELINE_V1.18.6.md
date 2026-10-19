# SOURCE BASELINE — V1.18.6

Base: V1.18.5 Continue + Favorites + Pins.

Autoridade de fonte permanece em `src/`.

Mudanças desta baseline:
- `src/services/service-architecture-engine.ts` deriva inventário, camadas, cobertura e gaps diretamente do Service Graph.
- `WorkspaceHome.tsx` recebe o preview **Arquitetura do serviço** e a Central **Service Architecture**.
- `src/runtime/service-architecture.css` contém a apresentação visual responsiva da nova superfície.
- `scripts/v1186-service-architecture-smoke.mjs` valida comportamento real do engine sobre o demo e grafos degradados.
- `scripts/prepare-assets.mjs` publica `v1186-service-architecture.css`.
- Service Health, Attention Engine e Workspace Preferences continuam independentes.
- Nenhuma alteração em Service Graph Schema V3, IDs, migrations, storage ou backups.
- Multi-serviço não é simulado: o domínio atual continua com um Service por Service Graph.

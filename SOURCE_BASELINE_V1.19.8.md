# Source Baseline — V1.19.8

- Baseline binária recuperável: `Blue-Ocean-Service-Studio-V1.19.6-Source.zip`.
- A Library continha fingerprint/hash da V1.19.7, mas os ZIPs V1.19.7 não estavam recuperáveis nesta execução.
- Os contratos necessários da V1.19.7 (Service Home clicável, workspaces de fase e Definition persistente) foram reconstituídos na V1.19.8 e cobertos por `scripts/v1197-service-home-smoke.mjs`.
- V1.19.8 adiciona `src/services/discovery-workspace.ts` e `scripts/v1198-discovery-workspace-smoke.mjs`.
- Nenhum `node_modules`, `dist`, `.generated`, `__pycache__` ou instalação parcial é autoridade de fonte.

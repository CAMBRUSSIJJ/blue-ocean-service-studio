# Source Baseline V1.17.2

Baseline derivada da V1.17.1 com foco exclusivo no Wizard “Montar serviço” 2.0.

## Alterações canônicas

- `src/runtime/whiteboard-core.js`: stepper, preview ao vivo, continuidade automática e resumo final do builder.
- `src/runtime/wizard2.css`: camada visual exclusiva do Wizard 2.0.
- `src/main.tsx`: marcador `bo-v1172`.
- `scripts/prepare-assets.mjs`: publica `v1172-wizard.css`.
- `scripts/v1172-wizard-smoke.mjs`: contratos específicos da release.
- `package.json` / `package-lock.json`: versão 1.17.2 e gate do wizard.

## Compatibilidade

Sem mudança de schema, IDs, storage keys ou formato de backup. O builder continua escrevendo diretamente no Service Graph existente.

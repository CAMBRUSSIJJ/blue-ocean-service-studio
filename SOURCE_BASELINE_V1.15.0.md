# Source Baseline — V1.15.0

Baseline anterior: V1.14.0 Workspace Home.

## Arquitetura preservada

- Service Graph continua como fonte única de verdade.
- `dataBridge` continua sendo o contrato de leitura/persistência.
- Global Navigation é uma camada de consulta e roteamento, não de armazenamento.
- APIs existentes de Journey, Blueprint, Research, Intelligence, Benefits e Operating Review são reutilizadas.
- Nenhuma migração ou chave de storage foi alterada.

## Novos arquivos principais

- `src/runtime/global-navigation.js`
- `src/runtime/global-navigation.css`
- `scripts/v1150-global-navigation-smoke.mjs`

## Integrações ajustadas

- `src/App.tsx`: trigger nativo da busca global.
- `src/state/useStudioController.ts`: foco contextual vindo da busca.
- `src/views/ActionPlanView.tsx`: abertura direta de tarefa.
- runtimes Research, Intelligence e Benefits: APIs de deep-link não destrutivas.
- `scripts/prepare-assets.mjs`: assets V1.15.

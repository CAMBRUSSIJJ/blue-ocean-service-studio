# V1.20.5-H7.40-H15 — Service Model Integration

## Escopo desta entrega

H15 inicia a integração do Service Model sem alterar a arquitetura visual consolidada na H14. Esta entrega implementa a primeira fundação: **Service Model Index**.

## Implementado

- `src/services/service-model-index.ts` como projeção read-only do `ServiceGraph`.
- Resolução unificada de objetos com `resolveObject`.
- Navegação de relações com `relationsFor`.
- Rastreabilidade e "onde isso é usado?" com `usageFor`.
- Cobertura estrutural com `coverageFor`.
- Distinção explícita entre problema observado, problema validado e problema priorizado.
- Reutilização de Personas, Necessidades, Jobs, Dores, Hipóteses, Evidências, Stakeholders/Ecologia, Journeys, Touchpoints, Canais, Blueprints, Whiteboards, Oportunidades, Iniciativas e Métricas já existentes.
- Relações de Service Definition, Ecologia, Journey/Stage, Whiteboard/Blueprint, Improvement Backlog/Portfolio, Outcomes, Governance e Operations Bridge entram no mesmo índice.
- Nenhuma migração destrutiva e nenhuma duplicação das entidades persistidas.

## Contrato

O índice é derivado em memória a partir do grafo canônico. Ele não grava, migra ou altera os objetos de origem.

## Próximas frentes previstas

- H15.2: generalizar Usage & Relations na UI.
- H15.3: Project Overview 2.0 usando saúde + cobertura do modelo.
- H15.4: maior descobribilidade de Atores e Touchpoints.
- H15.5: crosswalk semântico de Problema → Oportunidade → Iniciativa → Métrica → Resultado.

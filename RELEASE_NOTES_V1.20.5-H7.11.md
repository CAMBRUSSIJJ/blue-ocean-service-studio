# V1.20.5-H7.11 — Whiteboard 2.0

Base: **V1.20.5-H7.10 — Service Blueprints 2.0**.

## Objetivo

Transformar o Whiteboard em uma superfície de composição livre do serviço sem perder a arquitetura canônica construída em Discovery, Service Definition, Journey e Blueprint.

## Adicionado

- `whiteboard-studio.ts` como camada determinística de sincronização e health do Whiteboard.
- Whiteboard Health com integridade de Smart Objects, cobertura do Design Context, frames, relações e cobertura de Journey.
- busca e filtros na biblioteca de Whiteboards.
- resumo de quadros, Smart Objects, conexões e quadros contextualizados.
- sincronização idempotente de **Contexto → Whiteboard**.
- sincronização idempotente de **Journey → Whiteboard**.
- sincronização idempotente de **Blueprint → Whiteboard**.
- frames de composição para Contexto, etapas da Journey e etapas do Blueprint.
- ação `Abrir origem` no Inspector e na toolbar contextual de Smart Objects.
- navegação de origem para Contexto, Journey, Blueprint e Plano de Ação.

## Smart Objects operacionais

Conteúdo autorado no Blueprint nas lanes Frontstage, Backstage, Processos e Sistemas / suporte pode ser promovido durante o handoff para entidades canônicas do Service Graph.

A entidade criada mantém:

- `sourceBlueprintBoardId`;
- `sourceBlueprintItemId`;
- `stageId`;
- `blueprintLane`.

O Whiteboard recebe uma representação Smart Object dessa entidade, em vez de uma cópia textual desconectada.

## Regras preservadas

- Whiteboard continua sendo uma superfície livre para raciocínio e composição.
- sincronizações não inventam conteúdo operacional.
- Persona, Necessidade, Job, Dor, Problema e Evidência continuam apontando para suas entidades canônicas.
- Contexto, Journey e Blueprint são sincronizados de forma idempotente.
- referências quebradas entram no health como Smart Objects órfãos.
- zoom, minimap, frames, conexões, alinhamento, grupos e Inspector existentes permanecem sob o `whiteboard-core` atual.

## Compatibilidade

Durante a regressão, o contrato H3 ainda exigia a expressão histórica `raciocinar livremente` na biblioteca. A copy foi preservada sem reverter a nova arquitetura.

## QA

- H7.11 Whiteboard 2.0: **40/40 PASS**.
- H7.10 Service Blueprints 2.0: **36/36 PASS**.
- H7.9 Journey Maps 2.0: **41/41 PASS**.
- H7.8 Context-to-Service Handoff: **37/37 PASS**.
- `npm run qa`: **1747 OK / 0 FAIL**.
- preflight Linux: **PASS**.
- lock verify: **PASS**.
- source authority: **PASS**.
- foundation smoke: **12/12 PASS**.
- syntax check: **PASS**.

## Limitação registrada

`npm ci` excedeu novamente o limite do ambiente. A instalação parcial foi encerrada e removida. Portanto `npm run typecheck` completo e `npm run build` completo não são classificados como PASS nesta geração.

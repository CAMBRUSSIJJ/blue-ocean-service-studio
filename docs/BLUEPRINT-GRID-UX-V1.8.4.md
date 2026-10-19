# Blueprint Grid UX — V1.8.4

## Objetivo

Resolver perda de contexto em Blueprints largos/altos e reduzir passos para inserir conteúdo na matriz.

## Primitives visuais

### Stage header

Derivado de `orderedStages()` e alinhado às colunas do Blueprint.

### Lane label

Derivado de `blueprintLanes` e alinhado verticalmente às linhas operacionais.

### Blueprint Cell

Identidade:

`blueprint:<stageId>:<laneKey>`

A célula contém somente informação de interação e contagem. Objetos continuam armazenados no board e entidades no Service Graph.

### Semantic line

As linhas de interação, visibilidade e interação interna recebem ajuda contextual, mantendo seu papel didático no modo guiado.

## Comportamento

- os sticky guides vivem fora do canvas transformado;
- pan/zoom recompõem seus alinhamentos a partir de `pan`, `zoom` e `blueprintMetrics()`;
- ações da célula têm hit-area própria sem bloquear cards sobrepostos;
- células ocultas por View Visibility permanecem ocultas sem apagar dados.

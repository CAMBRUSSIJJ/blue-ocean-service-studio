# Service Intelligence — V1.9.5

## Objetivo
Transformar informação já existente no Service Graph em acompanhamento de execução, governança e resultado.

## Fluxo de transformação

Pesquisa → Problema → Oportunidade → Iniciativa → Métrica → Resultado

Nenhuma etapa cria uma cópia paralela dos objetos. O workspace apenas consulta e complementa as entidades existentes.

## Prontidão de execução
O indicador de 0–100 é determinístico e mede cobertura estrutural:
- 25% ownership;
- 25% problemas com oportunidade de tratamento;
- 20% oportunidades com iniciativa;
- 20% etapas com métricas;
- 10% dependências prontas.

Ele não é uma nota de qualidade do serviço.

## Dependências
As relações vêm de:
- `Opportunity.problemIds`;
- `Task.opportunityId`;
- `Task.dependencyIds`;
- `Task.metricIds`.

## RACI
Cada iniciativa pode registrar:
- Responsible (`owner`);
- Accountable;
- Consulted;
- Informed.

## Roadmap
As iniciativas utilizam os mesmos `Task` do Action Plan e podem guardar:
- horizonte `now | next | later`;
- impacto 1–5;
- esforço 1–5;
- risco `low | medium | high`;
- prioridade definida pelo usuário;
- resultado esperado;
- prazo;
- métricas vinculadas;
- dependências de execução.

## Métricas
Métricas permanecem entidades `metric` do Service Graph, com valor atual, meta, unidade, direção desejada, owner e etapa.

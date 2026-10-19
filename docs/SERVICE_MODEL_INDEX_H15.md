# H7.40-H15 — Service Model Index

O `Service Model Index` é uma projeção **read-only** do `ServiceGraph` existente. Ele não cria um segundo banco de dados, não migra entidades e não altera a arquitetura da H14.

## API

```ts
const index = serviceModelIndex(graph);
const node = resolveObject(index, 'persona', personaId);
const relations = relationsFor(index, 'persona', personaId);
const usage = usageFor(index, 'persona', personaId);
const coverage = coverageFor(index);
```

## Objetos normalizados

O índice resolve, entre outros: Serviço, Personas, Necessidades, Jobs, Dores, Hipóteses, Problemas validados, Evidências, Atores da Ecologia, Journeys, Etapas, Touchpoints, Canais, Problemas observados, Oportunidades de etapa, Ações, Whiteboards, Blueprints, Problemas priorizados, Oportunidades de melhoria, Iniciativas, Métricas, Medições, Pesquisa, Experimentos, Aprendizados, Decisões, Governança e vínculos operacionais.

## Distinções semânticas importantes

- `validatedProblem`: problema validado em Discovery.
- `stageProblem`: fricção/problema observado em uma etapa da Journey.
- `improvementProblem`: problema já levado para o backlog de melhoria.
- `stageOpportunity`: oportunidade operacional ligada a uma etapa.
- `improvementOpportunity`: oportunidade priorizada para melhoria.

Essas distinções permitem montar o lifecycle sem fundir estruturas que já têm responsabilidades próprias.

## Relações cobertas nesta fase

- Contexto e relações entre GraphEntities.
- Journey → Stage → Need/Touchpoint/Evidence/Problem.
- Touchpoint → Channel e handoffs de canal.
- Whiteboard/Blueprint → objetos inteligentes e Design Context.
- Service Definition → Persona/Problem/Evidence.
- Ecologia → Persona/Evidence e Actor → Actor.
- Research → Source/Observation/Evidence.
- Experimento → Journey/Stage/Touchpoint → Learning → Decision.
- Improvement Problem → Opportunity → Initiative → Metric.
- Metric → targets e Measurement.
- Governance → objeto governado.
- Operations Bridge → objeto operacional.

## Garantias

1. Nenhuma mutação do grafo durante indexação.
2. Nenhuma entidade persistida nova para representar relações que já existem.
3. Relações desconhecidas são ignoradas, nunca inventadas.
4. Whiteboard continua livre; apenas smart objects entram na rastreabilidade.
5. O índice pode ser descartado e reconstruído a qualquer momento a partir do `ServiceGraph`.

# V1.9.2 — Research & Evidence Workspace

## Objetivo

Fechar o elo entre pesquisa e melhoria do serviço sem criar uma base paralela de dados.

## Fluxo

```text
Research Source
      ↓
Evidence
      ↓
Insight
   ↙      ↘
Problem  Opportunity
```

Cada promoção preserva referências às evidências de origem. Evidências continuam sendo entidades do mesmo Service Graph usado por Journey, Blueprint e Journey Management.

## Research Repository

Fontes aceitas nesta versão: entrevistas, observações, pesquisas/surveys, atendimento/tickets, analytics, documentos, workshops e outras fontes.

Cada fonte pode armazenar título, tipo, data, responsável, participante/contexto, resumo e tags.

## Evidence Workspace

A evidência guarda o que foi observado, dito ou medido. Pode ser vinculada a múltiplas fontes, etapa da Jornada, confiança e amostra/volume.

Estados de confiança:
- Hipótese;
- Evidência parcial;
- Evidenciado.

## Insight Workspace

Insights são interpretações sustentadas por uma ou mais evidências. Um insight pode ser promovido a Problema ou Oportunidade, mantendo a rastreabilidade.

## Compatibilidade

Sem migração destrutiva. Projetos V1.9.1 recebem `research.sources` e `entities.insight` apenas quando necessário. A coleção existente `entities.evidence` é preservada.

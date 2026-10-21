# Blue Ocean Service Studio V1.20.5-H7.35 — Improvement Portfolio

## Objetivo
Transformar oportunidades selecionadas da H7.34 em iniciativas de melhoria executáveis e governadas, preservando a rastreabilidade até os problemas de origem e conectando execução a decisões, experimentos, métricas e dependências.

## Entregas
- Nova perspectiva **Portfolio** no Service Workspace, elevando a leitura integrada para 13 perspectivas.
- Separação explícita entre **Oportunidade** (o que vale a pena melhorar) e **Iniciativa** (como a melhoria será executada).
- Somente oportunidades `Selecionadas` ou `Planejadas` podem originar iniciativas.
- Conversão explícita e idempotente: uma oportunidade não cria iniciativas duplicadas por repetição de clique.
- Fluxo operacional: **Backlog → Planejada → Em execução → Validando → Implementada**.
- Planejamento por responsável, resultado esperado, impacto esperado, esforço, risco de entrega, prazo e progresso.
- Dependências entre iniciativas com detecção determinística de bloqueios.
- Implementação de uma iniciativa força progresso para 100% e libera dependentes quando todas as dependências estão implementadas.
- Detecção de atraso por prazo para iniciativas ainda não implementadas.
- Rastreabilidade da iniciativa até Oportunidade e Problemas de origem.
- Vínculos explícitos e validados com Decisões, Experimentos e Métricas canônicas existentes.
- Experimentos já presentes na proveniência dos problemas são inferidos na criação, sem inventar novos artefatos.
- Score de valor operacional determinístico baseado em Impacto esperado e Facilidade (inverso do Esforço), usado apenas para ordenação/apoio visual do portfolio.
- Overview e summary do Service Workspace atualizados com a camada EXECUTAR.

## Guardrails
Criar ou editar uma iniciativa não altera automaticamente os problemas, oportunidades, decisões, experimentos, métricas, Journey, Proposição, Canais ou Blueprint. Os vínculos são referências explícitas. Dependências inexistentes, auto-dependências e IDs inválidos são descartados na atualização do domínio.

## QA
Ver `QA_V1.20.5-H7.35.txt`.

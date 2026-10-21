# V1.9.5 — Service Intelligence

A V1.9.5 transforma o Service Graph em uma camada executiva de acompanhamento sem criar dashboards paralelos ou duplicar dados.

## Visão executiva
- Prontidão de execução calculada a partir de ownership, tratamento de problemas, cobertura do roadmap, medição e dependências.
- Indicadores explicitamente estruturais: não avaliam subjetivamente a qualidade do serviço.
- Lista “Onde olhar primeiro” com problemas sem tratamento, iniciativas vencidas, risco declarado, ausência de owner, dependências pendentes e métricas sem meta.
- Comparação informativa de oportunidades por impacto/esforço; a prioridade final permanece decisão humana.

## Dependências
- Mapa de Problema → Oportunidade → Iniciativa → Métrica.
- Dependências explícitas entre iniciativas.
- Identificação de bloqueios quando pré-requisitos ainda não estão concluídos.

## Responsabilidade
- Cobertura de owner para jornadas, oportunidades, iniciativas e métricas.
- RACI nas iniciativas: Responsible, Accountable, Consulted e Informed.
- Distribuição simples de carga por responsável.

## Métricas
- Valor atual, meta, unidade, direção desejada, etapa e owner.
- Status “na meta / fora da meta / sem leitura”.
- Vínculo entre iniciativas e métricas de resultado.

## Roadmap de transformação
- Horizontes Agora / Próximo / Depois.
- Status A fazer / Em andamento / Concluído.
- Impacto, esforço, risco, prioridade humana, resultado esperado e prazo.
- Dependências e métricas vinculadas por iniciativa.
- Iniciativas continuam sendo os mesmos objetos `tasks` do Service Graph.

## Arquitetura
- Novo runtime `serviceIntelligence` registrado no Runtime Registry.
- `service.intelligence` guarda apenas estado mínimo do workspace.
- Oportunidades, tarefas/iniciativas e métricas existentes são reutilizadas diretamente.
- Research, Layers & Scenarios, Presentation & Workshop, Journey Management, Blueprint Health e Recovery foram preservados.

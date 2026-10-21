# V1.8.12 — Stage Flow Builder

## Objetivo
Transformar o editor em um fluxo de construção por etapa, reduzindo a dependência de conhecimento prévio em Service Design e diminuindo a sensação de cards soltos.

## Entregas
- Stage Flow Builder por etapa.
- Checklist Experiência / Operação / Aprender e melhorar.
- Progresso estrutural por etapa.
- Navegação etapa anterior / próxima.
- Atalhos Jornada / Blueprint dentro do construtor.
- Builder geral encaminha Experiência e Operação para a etapa incompleta correta.
- Experiência passa a exigir ação do cliente, touchpoint e emoção em todas as etapas.
- Operação passa a exigir Frontstage, Backstage, Processo e Sistema em todas as etapas.
- Smart Flow indica a próxima relação recomendada.
- Quick action de Smart Card comunica “Próximo”.
- Quick-add das células usa nomes semânticos em vez de “Adicionar” genérico.
- APIs `__rtGuidedBuilder.stage()` e `stageReport()` para diagnóstico e extensões futuras.

## QA
- Preflight Linux.
- Sintaxe dos runtimes customizados.
- Contratos do Stage Flow Builder.
- Preservação do Service Graph, Journey/Blueprint, Health e Import/Export.

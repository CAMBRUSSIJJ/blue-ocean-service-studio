# Blue Ocean Service Studio V1.20.5-H7.33 — Current × Future Service

## Objetivo
Separar formalmente o estado atual do serviço do estado futuro desejado e tornar os gaps explícitos, rastreáveis e gerenciáveis.

## Entregas
- Nova perspectiva **Atual × Futuro** no Service Workspace.
- Snapshot determinístico do estado atual de Proposição, Journeys, Canais, Blueprints e responsabilidades.
- Estado futuro independente, inicializado a partir do atual e editável sem mutar objetos canônicos.
- Projeção explícita de decisões H7.32 aprovadas/aplicadas no futuro, sem aplicação operacional.
- Comparador campo a campo com gaps `changed`, `added` e `removed`.
- Gestão de gap com status, responsável e nota.
- Responsabilidades capturadas de Journey, Canal e RACI de atividades.
- Refresh do estado atual preserva o futuro planejado para expor drift real.
- Reset explícito do futuro volta a alinhar o target ao snapshot atual.

## Guardrails
Editar o futuro, projetar decisões ou tratar gaps não altera Journey, Proposição, Canal, Blueprint ou responsabilidades canônicas. A aplicação operacional continua pertencendo ao H7.32.

## QA
Ver `QA_V1.20.5-H7.33.txt`.

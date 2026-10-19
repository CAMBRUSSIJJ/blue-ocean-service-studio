# Service Operating Review — V1.9.7

## Princípio
A revisão operacional não mantém um banco paralelo. Ela lê e governa objetos que já existem no Service Graph.

## Agenda automática
A agenda é derivada de:
- iniciativas vencidas;
- iniciativas bloqueadas por dependências;
- iniciativas de alto risco ou sem owner;
- benefícios em risco ou com revisão/previsão vencida;
- métricas fora da meta, sem meta ou sem leitura;
- problemas sem oportunidade de tratamento;
- decisões pendentes ou vencidas.

## Reunião
Ao iniciar uma revisão, o sistema congela `agendaSnapshot` e indicadores executivos. Isso mantém o histórico fiel ao contexto da reunião mesmo que o grafo seja alterado depois.

## Decisões
Cada decisão pode registrar tipo, owner, prazo, justificativa, origem na agenda e status. Uma decisão pode ser promovida para a estrutura de iniciativas existente (`tasks`) sem duplicar o sistema de execução.

## Governança 0–100
A cobertura considera presença de owner, cadência, próxima revisão, revisão recente e qualidade do acompanhamento das decisões. É um indicador estrutural de governança; não é uma avaliação subjetiva da qualidade do serviço.

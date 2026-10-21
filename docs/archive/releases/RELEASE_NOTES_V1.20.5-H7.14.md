# V1.20.5-H7.14 — Service Depth & Adaptive Home

Base: **V1.20.5-H7.13 — Blue Ocean Identity System**.

## Objetivo
Fazer a identidade Blue Ocean refletir a verdade do serviço. A Home deixa de premiar mera existência de artefatos e passa a medir maturidade real, além de adaptar continuidade, Recentes, Favoritos e Aprender ao estado atual do Service Graph.

## Adicionado / melhorado
- `service-depth.ts`: score determinístico de 0–100 com seis componentes ponderados;
- profundidade: Contexto 20, Journey 25, Evidências 15, Problemas validados 15, Blueprint 20 e Composição/Whiteboard 5;
- estados de profundidade: Superfície, Costa, Corrente, Profundidade e Blue Ocean;
- Corrente principal não linear: `Contexto → Journey → Blueprint`, com Whiteboard como ramificação de exploração;
- Whiteboard vazio não conta como progresso e recebe estado `Ainda vazio` / CTA `Começar`;
- Recentes adaptam o grid à quantidade real de artefatos e exibem estado de trabalho;
- Favoritos vazios foram compactados;
- “Continue de onde parou” prioriza artefatos com trabalho real;
- próximo passo agora considera também a ausência de Problema validado;
- Sinais do serviço interpretam o estado, em vez de mostrar apenas contadores;
- Aprender ganha um conteúdo recomendado de acordo com o próximo gap real do serviço.

## Regra de produto
A existência de um objeto não significa maturidade. Um Journey sem estrutura, um Blueprint vazio ou um Whiteboard sem objetos/conexões não recebem o mesmo crédito de um artefato utilizável.

## Compatibilidade
- H7.13 preservada como camada de identidade;
- H7.12 preservada como base de layout da Home;
- H7.11-H1 permanece na linhagem;
- sem mudança de schema ou migração de dados.

# Blue Ocean Service Studio V1.20.5-H7.34 — Problems, Opportunities & Prioritization

## Objetivo
Consolidar sinais de problema dispersos pelo Service Graph em um backlog único, rastreável e priorizável, conectando problemas a oportunidades de melhoria sem duplicar entidades canônicas nem alterar as fontes automaticamente.

## Entregas
- Nova perspectiva **Prioridades** no Service Workspace, elevando a leitura integrada para 12 perspectivas.
- Backlog central de problemas e oportunidades com sincronização explícita e idempotente.
- Descoberta de sinais provenientes de Pesquisa, Problemas validados, Journey, Canais/Handoffs, Protótipos, Atual × Futuro e Blueprint.
- Proveniência múltipla: um mesmo problema pode mostrar várias origens sem ser duplicado.
- Histórico preservado: quando uma origem desaparece, o item permanece no backlog como fonte inativa em vez de ser apagado.
- Priorização determinística por **Impacto, Frequência, Esforço, Risco e Urgência**.
- Fórmula normalizada de 0–100 com bandas Baixa, Média, Alta e Crítica; nenhuma IA altera o score.
- Triagem com status, responsável, notas, evidências e filtros por origem/prioridade/status.
- Criação de oportunidades a partir de problemas selecionados e importação idempotente de oportunidades legadas.
- Overview e summary do workspace atualizados com a camada PRIORIZAR.

## Fórmula de prioridade
`30% Impacto + 20% Frequência + 15% Risco + 25% Urgência + 10% Facilidade`

A Facilidade é derivada como `6 - Esforço`, preservando o sentido de que menor esforço aumenta a oportunidade de priorização.

## Guardrails
Sincronizar, classificar, priorizar ou criar oportunidades no H7.34 não altera automaticamente Pesquisa, Problemas canônicos, Journey, Touchpoints, Canais, Handoffs, Protótipos, Atual × Futuro ou Blueprint. O backlog materializa sinais e decisões de triagem em uma camada própria e rastreável.

## QA
Ver `QA_V1.20.5-H7.34.txt`.

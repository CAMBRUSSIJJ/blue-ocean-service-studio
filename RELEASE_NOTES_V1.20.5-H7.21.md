# V1.20.5-H7.21 — Journey Workspace 3.0

Evolução da experiência de Jornadas sobre a H7.20-H1, sem alterar a composição principal do Dashboard.

## O que mudou
- nova biblioteca de Jornadas com capa real, busca, filtros, ordenação e status;
- cards de Journey passam a usar a capa Blue Ocean/personalizada como identidade visual principal;
- criação de Journey mostra a capa padrão antes de abrir o artefato;
- novo hero da Journey com capa, nome, objetivo, status, responsável, atualização e sinais do mapa;
- navegação interna em quatro superfícies: **Visão geral**, **Jornada**, **Evidências** e **Insights**;
- Visão geral resume Journey Health, evidências, problemas validados, momentos da verdade e sequência das etapas;
- editor preserva a matriz Journey Maps 2.0 e adiciona uma curva emocional baseada nos dados reais das etapas;
- aba Evidências mostra cobertura por etapa sem copiar ou inventar entidades;
- aba Insights usa gaps, Momentos da Verdade, prontidão e blockers já calculados pelo engine determinístico;
- clique em etapa nas superfícies auxiliares retorna para a etapa canônica no editor;
- Journey Cover H7.18-H1, Journey Maps 2.0 H7.9 e transição Journey → Blueprint permanecem compatíveis.

## Princípio de implementação
H7.21 não cria um segundo modelo de Journey. Todas as novas superfícies leem e atualizam o mesmo Service Graph canônico e o mesmo relatório de Journey Maps 2.0.

## Limitações de validação
O `npm ci` não concluiu dentro da janela disponível deste ambiente. Por isso, `typecheck` e `build` completos com dependências instaladas não são declarados como PASS. O `syntax:check`, os smokes determinísticos, a suíte acumulada e os gates de release passaram.

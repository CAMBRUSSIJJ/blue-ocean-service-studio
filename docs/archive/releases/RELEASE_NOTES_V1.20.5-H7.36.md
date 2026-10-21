# Blue Ocean Service Studio V1.20.5-H7.36 — Metrics & Service Outcomes

## Objetivo
Fechar o ciclo entre desenho, melhoria e resultado real do serviço. A H7.36 conecta métricas canônicas a Proposição, Journey, Touchpoints, Handoffs, Blueprints e Iniciativas, registra medições ao longo do tempo e distingue entrega de mudança de outcome comprovado.

## Entregas
- Nova perspectiva **Resultados** no Service Workspace, elevando a leitura integrada para 14 perspectivas.
- Métricas continuam canônicas em `entities.metric`; a H7.36 adiciona somente vínculos e histórico de medições em `service.outcomes`.
- Seis tipos explícitos de vínculo: **Proposição → percepção de valor**, **Journey → outcome**, **Touchpoint → experiência**, **Handoff → SLA**, **Blueprint → operação** e **Iniciativa → resultado**.
- Baseline, valor atual, meta, unidade, responsável e direção `Quanto maior, melhor` / `Quanto menor, melhor`.
- Histórico de medições com data, valor e nota opcional; a leitura mais recente atualiza o valor corrente da métrica.
- Status determinístico `Na meta / Fora da meta / Sem leitura`.
- Progresso determinístico do baseline até a meta, limitado a 0–100%.
- Tendência por histórico: melhorando, piorando, estável ou sem tendência.
- Cobertura de medição por perspectiva do serviço.
- Integração bidirecional explícita com H7.35: vincular uma métrica a uma Iniciativa sincroniza `metricIds`; remover o vínculo explícito remove essa referência quando não há outro vínculo equivalente.
- Compatibilidade com vínculos de métricas já existentes em iniciativas H7.35: o report materializa vínculos implícitos sem persistir ou duplicar estado.
- Outcome por iniciativa: `Resultado comprovado`, `Resultado parcial`, `Em acompanhamento`, `Resultado não atingido` ou `Sem prova de resultado`.
- Alerta explícito para iniciativa `Implementada` sem métrica mensurável ou sem leitura/meta comparável.
- Overview e summary do Service Workspace atualizados com a camada **MEDIR**.

## Guardrails
A H7.36 não altera automaticamente Proposição, Journey, Touchpoint, Handoff, Blueprint ou o conteúdo de uma Iniciativa. O vínculo é explícito. Registrar uma medição modifica apenas o histórico de outcomes e o valor corrente da métrica canônica. IDs de métricas e alvos são validados antes da criação do vínculo.

## QA
Ver `QA_V1.20.5-H7.36.txt`.

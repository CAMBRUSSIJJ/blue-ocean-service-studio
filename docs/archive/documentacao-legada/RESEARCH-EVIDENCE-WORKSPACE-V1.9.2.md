# Research & Evidence Workspace V1.9.2

## Princípio

Pesquisa não é um anexo da Jornada. É uma camada do Service Graph que explica por que um problema, oportunidade ou decisão existe.

## Modelo

- `research.sources`: origem da informação;
- `entities.evidence`: observação/dado verificável;
- `entities.insight`: interpretação sustentada por evidências;
- `problems` / `opportunities`: decisões estruturadas promovidas de um insight.

## Regras

1. Fonte não é evidência.
2. Evidência não é insight.
3. Insight não é automaticamente problema ou oportunidade.
4. Promoção é explícita e mantém IDs de origem.
5. Journey Health e Journey Management usam a mesma evidência cadastrada no Research Workspace.

## Integração de runtime

O módulo `v192-research-workspace.js` usa exclusivamente `RealTalentRuntime.api('dataBridge')` para ler/transacionar o projeto. Ele registra `researchWorkspace` no Runtime Registry e não cria armazenamento separado.

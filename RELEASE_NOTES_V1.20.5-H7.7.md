# V1.20.5-H7.7 — Evidências 2.0

## Adicionado
- `EvidenceView.tsx` dedicada para biblioteca e detalhe de Evidências.
- `evidence-studio.ts` para proveniência, qualidade, relações e direção decisória da evidência.
- `evidence-h77.css` para a nova superfície de Evidências.
- filtros: alta confiança, origem rastreável, em hipóteses, contradições e sem relações.
- abas: Visão geral, Fonte, Contexto, Hipóteses e Problemas e Uso.
- tipos de fonte: entrevista, observação, survey, analytics, documento, suporte, experimento e outra fonte.
- proveniência estruturada: origem/referência, método, data de coleta, amostra/contexto e confiança.
- score determinístico de qualidade e estado `Pronta para decisão`.
- direção explícita da evidência em Hipóteses e Problemas: `Sustenta`, `Contradiz` ou `Contextual`.

## Melhorado
- Evidências deixam de usar a tabela contextual genérica.
- observação e interpretação ficam em campos separados para reduzir confusão entre fato e conclusão.
- relações passam a manter `personaIds`, `needIds`, `jobIds`, `painIds`, `hypothesisIds` e `problemIds` no registro de evidência.
- alvos relacionados mantêm `evidenceIds` bidirecionalmente.
- Hipóteses preservam `evidenceLinks` com stance explícita.
- Problemas preservam `supportingEvidenceIds` e `contradictingEvidenceIds` de acordo com a direção escolhida.
- remoção de Evidência limpa também `evidenceLinks` estruturados, evitando referência órfã.

## Regra de produto
Evidência nasce diretamente porque representa algo observado, medido ou documentado. Ela não vira conclusão automaticamente: primeiro registra-se o fato e sua proveniência; depois a evidência é conectada ao contexto e classificada como suporte, contradição ou contexto para Hipóteses/Problemas.

## QA
- H7.7: 34/34 PASS
- regressão: 1593 OK / 0 FAIL
- preflight Linux: PASS
- lock verify: PASS
- source authority: PASS
- foundation smoke: 12/12 PASS
- syntax check: PASS
- full typecheck/build: não marcados como PASS; `npm ci` expirou antes de concluir a instalação neste ambiente.

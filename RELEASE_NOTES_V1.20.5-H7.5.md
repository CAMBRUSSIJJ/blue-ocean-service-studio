# V1.20.5-H7.5 — Hipóteses 2.0

## Adicionado
- `HypothesesView` dedicada para a aba Hipóteses.
- Serviço `hypotheses-studio` sobre o Problem & Evidence Engine canônico.
- Campos: premissa, comportamento esperado, critério de validação, impacto se estiver errada, confiança e risco.
- Abas: Visão geral, Contexto, Evidências, Validação e Uso.
- Filtros: todas, em validação, validadas, com evidência, base incompleta e alto risco.
- Stance explícito de evidência: Sustenta, Contradiz e Contextual.
- Ação de promoção para Problema validado quando a base determinística está completa.

## Melhorado
- Hipóteses deixam de ser uma linha genérica da Context Library.
- O estado passa a ser derivado: Hipótese, Em validação ou Validada.
- Prontidão exige formulação testável, Dor, contexto do cliente, evidência e suporte observável.
- Contradição de alta confiança bloqueia a validação até ser resolvida.
- Problema validado preserva rastreabilidade por `sourceHypothesisId`.

## Preservado
- Personas 2.0, Necessidades 2.0, Jobs 2.0 e Dores 2.0.
- Problem & Evidence Engine existente.
- Routing H6, sidebar e identidade Blue Ocean.
- Service Graph como source of truth.

## QA
- H7.5: 24/24 PASS.
- Regressão: 1532 OK / 0 FAIL.
- Preflight Linux: PASS.
- Full typecheck/build: pendente no ambiente Linux com dependências instaladas.

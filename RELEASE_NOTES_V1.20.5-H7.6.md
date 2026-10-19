# V1.20.5-H7.6 — Problemas 2.0

## Adicionado
- `ProblemsView.tsx` dedicada.
- `problems-studio.ts` para estrutura, relações e qualidade do problema validado.
- `problems-h76.css` para biblioteca e detalhe de Problemas.
- filtros: prontos para definição, base incompleta, críticos e com evidência.
- abas: Visão geral, Contexto, Evidências, Definição e Uso.
- score determinístico de qualidade e readiness para Service Definition.
- coordenador `bo-open-context-page` para o CTA `Criar hipótese` sair de Problemas e abrir a criação de Hipótese.

## Melhorado
- Problemas deixam de usar a tabela genérica do Context Library.
- Problema validado preserva sua `sourceHypothesisId` como rastreabilidade protegida.
- relações passam a manter `problemIds` bidirecionalmente.
- remoção de objetos contextuais limpa também `needIds`, `jobIds`, `painIds`, `hypothesisIds` e `problemIds` quando presentes.

## Regra de produto
Problema não nasce por cadastro direto. Ele aparece nesta aba após uma Hipótese ser validada com evidência suficiente.

## QA
- H7.6: 27/27 PASS
- regressão: 1559 OK / 0 FAIL
- preflight Linux: PASS
- syntax check: PASS
- full typecheck/build: pendentes, porque `npm ci` expirou no ambiente de geração.

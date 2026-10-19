# V1.20.5-H7.4 — Dores 2.0

## Adicionado
- `PainsView` dedicada para a aba Dores.
- Serviço `pains-studio` para perfil, relações, completude e rastreabilidade da Dor.
- Severidade: baixa, média, alta e crítica.
- Frequência: rara, ocasional, frequente e constante.
- Campos: contexto, impacto, sinal observável, alternativa atual e consequência.
- Abas: Visão geral, Pessoas, Relações, Evidências e Uso.
- Filtros: todas, não usadas, com evidência, base incompleta e alta severidade.

## Melhorado
- Dores deixam de ser uma linha genérica da Context Library.
- A Dor passa a representar uma fricção observada antes de virar hipótese/problema.
- Relações são mantidas nos dois sentidos no Service Graph.
- Completude aponta se existe base suficiente para problem framing.

## Preservado
- Personas 2.0, Necessidades 2.0 e Jobs 2.0.
- Routing H6, sidebar e identidade Blue Ocean.
- Service Graph como source of truth.

## QA
- H7.4: 22/22 PASS.
- Regressão: 1508 OK / 0 FAIL.
- Preflight Linux: PASS.
- Full typecheck/build: pendente no ambiente Linux com dependências instaladas.

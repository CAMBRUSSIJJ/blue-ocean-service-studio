# V1.20.5-H7.3 — Jobs 2.0

## Adicionado
- `JobsView` dedicada: biblioteca + detalhe próprio.
- `jobs-studio` como camada de domínio para perfil, relações e completude do Job.
- Campos JTBD: situação/gatilho, progresso desejado, motivação, barreiras, alternativa atual e sinal de sucesso.
- Job Statement dinâmico no formato `Quando… eu quero… para poder…`.
- Abas: Visão geral, Pessoas, Relações, Evidências e Uso.
- Filtros: Todos, Não usados, Com evidência, Base incompleta e Alta importância.
- Relações canônicas com Persona, Necessidade, Dor, Hipótese, Problema e Evidência.
- Gate `v1205h73:jobs-2-smoke` com teste funcional do domínio.

## Melhorado
- Jobs deixam a tabela genérica do Workspace e passam a ter editor próprio.
- Completude determinística específica de Job to Be Done.
- Rastreamento de uso e relações do Service Graph dentro da aba.
- Necessidades: criação passou a usar timestamp explícito, removendo dependência de `entity.updatedAt` no `GraphEntity` genérico.

## Corrigido
- Relações Job ↔ objetos relacionados são mantidas nos dois sentidos (`relatedIds` + `jobIds`).
- Criação de Job e Necessidade usa um único timestamp explícito para entidade e `service.updatedAt`.

## Removido
- Jobs não dependem mais da tela/modal genérico de `WorkspaceLibraryView`.

## Limitações / pendências
- O ambiente de empacotamento não concluiu `npm ci`; portanto `npm run typecheck` e `npm run build` completos não são declarados como PASS aqui.
- Browser truth visual do H7.3 deve ser confirmado no Linux após build local.

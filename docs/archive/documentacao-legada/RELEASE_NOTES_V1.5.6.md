# RealTalent Service Studio V1.5.6 — Structured Views Foundation

## Objetivo
Transformar Jornada e Blueprint em visualizações estruturadas reutilizáveis sobre o mesmo Service Graph, sem duplicar entidades.

## Entregas
- Structured Grid Engine com primitives explícitas `Column`, `Lane` e `Cell`.
- Journey: 3 etapas padrão × 5 lanes = 15 células estruturadas na base de demonstração.
- Blueprint: 3 etapas padrão × 6 lanes = 18 células estruturadas.
- Filtros por busca, tipo, etapa, origem do objeto, responsável e tags.
- Visibilidade específica por visualização, incluindo lanes e tipos de objeto.
- Saved Views: salva layout semântico, filtros, visibilidade e viewport.
- Linked Object: liga um card a outro Whiteboard, Journey ou entidade do Service Graph.
- Campos `Responsável` e `Tags` nas entidades Smart Object.
- Metadados `structuredViewsVersion: 1` e estado estruturado por quadro.
- Compatibilidade de leitura com metadados V1.5.5.1.

## Princípio de arquitetura
`View != Data`.

A View guarda a forma de leitura. O Service Graph guarda o conteúdo canônico.

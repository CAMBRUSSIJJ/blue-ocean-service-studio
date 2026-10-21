# V1.20.5-H3 — Workspace IA & Blueprint Migration

## Motivo
A revisão visual em navegador mostrou que a Context Library ainda concentrava objetos demais em uma única tela e que o Service Frame havia sido colocado na superfície errada. As referências visuais enviadas pelo usuário apontaram para uma arquitetura mais clara: objetos de trabalho com páginas próprias, tabelas enxutas e criação contextual; Whiteboard livre para exploração; Blueprint responsável pela estrutura formal Frontstage / Backstage.

## Mudanças principais
- Service Frame saiu da interface de Whiteboards e passou para Blueprints.
- Whiteboards agora é explicitamente um ambiente livre de exploração.
- Blueprints ganhou biblioteca própria e ação `Criar Service Blueprint`.
- A Context Library monolítica foi removida do source visual e deixou de ser uma tela da aplicação.
- Personas, Necessidades, Jobs, Dores, Hipóteses, Problemas, Evidências, Portfólio, Métricas, Templates e Arquivo passam a ter páginas próprias.
- Sidebar foi reorganizada no padrão Dashboard + Workspace expansível, com módulos separados.
- Dashboard foi reconstruído com ações rápidas, recentes, favoritos e aprendizado.
- Portfólio separa Oportunidades, Dores e Soluções.
- Criação global deixou de ser o padrão; cada módulo possui sua própria ação de criação.

## Arquitetura preservada
- Service Graph continua sendo a fonte única de verdade.
- As páginas de Workspace não duplicam Persona, Need, Job, Pain, Problem ou Evidence.
- Problema validado continua não podendo nascer diretamente; criação inicia como hipótese quando aplicável.
- `serviceBlueprintFrame` cria Whiteboard canônico com `viewKind: blueprint` e `layoutMode: service`.
- Versão funcional permanece `1.20.5`; H3 identifica o hotfix de IA/UX.

## Removido
- `src/views/ContextLibraryView.tsx`
- `src/runtime/context-library.css`
- CTA `Novo Service Frame` / `Montar serviço` de Whiteboards.
- Context Library monolítica como superfície de navegação.

## Referência visual
As capturas fornecidas pelo usuário foram usadas como referência de estrutura, densidade, navegação, tabelas e organização. Nenhuma marca, nome ou asset proprietário da plataforma de referência foi copiado para o produto.

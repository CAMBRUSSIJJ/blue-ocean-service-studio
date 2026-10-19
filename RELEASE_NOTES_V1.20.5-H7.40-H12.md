# V1.20.5-H7.40-H12 — Primary Sidebar + Project Context Switch

## Objetivo
Restaurar a sidebar principal completa do Blue Ocean e separar claramente o momento em que o usuário entra em um projeto.

## Fluxo final
- Fora de um projeto: sidebar principal completa.
- Serviço: mostra os projetos do serviço sem trocar a sidebar.
- Abrir projeto: troca para a sidebar contextual do projeto.
- Serviço dentro do projeto: abre o Guided Service Workspace.

## Sidebar principal restaurada
### Desenho do serviço
- Serviço
- Hierarquias

### Contexto
- Personas
- Necessidades
- Jobs
- Dores
- Hipóteses
- Problemas
- Evidências

### Gestão
- Oportunidades
- Catálogo de métricas
- Pesquisa
- Templates
- Arquivo

Também permanecem Colaboração e Configurações.

## Context switch
A sidebar contextual do projeto só é renderizada quando `projectShellOpen === true`, isto é, após o usuário abrir explicitamente um projeto.

## QA
- H7.40-H12: 31/31 PASS
- `npm run qa`: PASS (exit 0)
- `syntax:check`: PASS
- `lock:verify`: PASS
- `source:authority`: PASS
- Foundation: 12/12 PASS
- Project Foundation: 46/46 PASS
- preflight Linux: PASS

## Limitação
O React typecheck completo e o Vite build não foram declarados como PASS nesta execução porque o pacote final é source-clean e não contém `node_modules`; sem dependências instaladas o `tsc` reporta módulos React ausentes. O `syntax:check` e os gates de source passaram.

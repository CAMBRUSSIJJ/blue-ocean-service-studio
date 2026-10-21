# V1.20.2 — Service Context Library

## Objetivo
Reorganizar a UX do serviço antes de avançar o Service Readiness. A Home deixa de concentrar editores extensos e o conhecimento de Discovery passa a ser navegado como uma biblioteca canônica do serviço.

## Adicionado
- Nova rota `Contexto` no shell.
- `Context Library` com abas próprias para:
  - Personas
  - Necessidades
  - Jobs
  - Dores
  - Hipóteses
  - Problemas
  - Evidências
- Universal Inspector contextual à direita.
- Busca e filtros reais: Todos, Relacionados, Sem relações e Em uso no Whiteboard.
- Criação rápida com modal essencial e enriquecimento posterior no Inspector.
- Relacionamentos bidirecionais entre objetos de contexto.
- Uso/representação no Whiteboard contabilizado sem duplicar a entidade canônica.
- Remoção canônica limpa relações, referências da Definition e instâncias visuais para não deixar Smart Objects órfãos.
- Problemas validados continuam nascendo exclusivamente da validação explícita de hipóteses.

## Service Home
- A fase Entender agora apresenta um resumo compacto da Context Library.
- Os Studios extensos deixam de ser a superfície principal da Home.
- Home direciona para o local correto de trabalho em vez de tentar ser dashboard, biblioteca e editor ao mesmo tempo.
- `Dashboard` foi renomeado para `Visão geral` na navegação principal.

## Navegação
Arquitetura principal passa a refletir o trabalho do serviço:

```text
Visão geral

CONTEXTO
  Contexto
  Pesquisa

DESENHO
  Whiteboards
  Journey maps
  Blueprints

VALIDAÇÃO
  Métricas
  Simulação

MELHORIA
  Plano de Ação
  Benefícios
```

## + Criar global
A lista plana foi reorganizada em grupos:
- Contexto: Persona, Necessidade, Problema, Evidência.
- Desenho: Whiteboard, Jornada, Blueprint.
- Melhoria e medição: Oportunidade, Ação, Métrica.

Criações de contexto abrem diretamente a aba correta da Context Library.

## Whiteboard
- Biblioteca ganhou categoria `Contexto`.
- Reutiliza Persona, Necessidade, Job, Dor, Hipótese, Problema validado e Evidência existentes.
- Problema validado usa picker somente de reutilização; não pode ser criado diretamente no canvas.
- Post-it/card livre pode ser transformado em Persona, Necessidade, Job, Dor, Hipótese, Evidência, Insight ou Oportunidade.
- `Revisar contexto` abre diretamente a Context Library.
- Service Graph Browser ganhou filtro Contexto.
- Problemas canônicos em `entities.problem` passam a aparecer no navegador do grafo sem duplicar registros legados.

## Arquitetura
- `schemaVersion` permanece `3`.
- Service Graph continua sendo a fonte única de verdade.
- Context Library é uma superfície de navegação/edição, não um novo armazenamento.
- Whiteboard continua sendo representação visual dos mesmos objetos canônicos.

## Compatibilidade
Foram migrados contratos estáticos antigos que codificavam a IA anterior:
- ActiveTab sem rota `context`.
- grupo `MELHORAR` em vez de `MELHORIA`.
- rótulo `Dashboard` em vez de `Visão geral`.
- retorno do Whiteboard para `home` em vez de `context`.
- criação global `Problema / hipótese` em vez do fluxo de Problema via Context Library.
- gate V1.20.1 que exigia versão exatamente 1.20.1.

Nenhuma dessas migrações afrouxa regras funcionais do Service Graph.

## QA
- `npm run qa`: PASS.
- 1575 / 1575 verificações com contagem explícita em 43 gates.
- Context Library: 85 / 85.
- Discovery Workspace: 51 / 51.
- Persona Studio: 89 / 89.
- Problem & Evidence Studio: 107 / 107.
- Service Definition Studio: 87 / 87.
- H1 WorkspaceHome Typecheck: 9 / 9.
- TypeScript parser: PASS.
- `whiteboard-core.js`: `node --check` PASS.
- Core typecheck isolado do domínio: PASS.
- package-lock: PASS.
- source authority: PASS.

## Browser Truth
`UNAVAILABLE` neste ambiente.

O Playwright Python está instalado, mas o executável Chromium esperado não está instalado. Nenhum PASS visual foi inferido.

## Dependências / build
`npm ci` foi tentado novamente. A operação excedeu o limite do ambiente e deixou apenas uma instalação parcial (~804 KB), sem `tsc`/`vite`; ela foi removida antes do empacotamento.

Portanto:
- Typecheck React/Vite completo: **NÃO DECLARADO**.
- Build Vite completo: **NÃO DECLARADO**.

## Validação do pacote Linux
O Linux Source Launcher foi extraído novamente em diretório limpo antes da entrega. `VERSION` e `package.json` reportaram `1.20.2`, `START.sh` preservou modo `755`, os diretórios proibidos estavam ausentes e os gates `syntax:check`, `whiteboard-core`, lock, source authority, foundation, Context Library, core typecheck, preflight e `npm run qa` passaram dentro do pacote extraído.

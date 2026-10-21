# V1.20.3 — Structured Service Frame

## Objetivo
Transformar o Whiteboard em uma superfície de construção de serviço, e não apenas em um canvas livre. O mesmo serviço passa a ser estruturado por etapas na horizontal e por camadas semânticas na vertical.

## Adicionado
- `Service Frame` como quinta visualização canônica do Whiteboard (`layoutMode: service`).
- Cinco camadas estruturais: Cliente, Frontstage, Backstage, Processos de suporte e Sistemas e recursos.
- Linha de interação entre Cliente e Frontstage.
- Linha de visibilidade entre Frontstage e Backstage.
- Etapas do serviço na horizontal, reutilizando a Journey canônica quando existe.
- Criação de etapa diretamente no Service Frame; quando necessário, cria o fluxo principal de forma canônica.
- Metadados visuais `serviceStageId` e `serviceLayer` nas instâncias do Whiteboard.
- Drag/drop estruturado: mover um card entre células altera etapa/camada sem duplicar a entidade do Service Graph.
- Cobertura determinística por etapa × camada com gaps explícitos.
- CTA `Novo Service Frame` na biblioteca de Whiteboards.
- Acesso `Ver Blueprint` como projeção formal do mesmo serviço.
- Serviço puro `src/services/service-frame.ts` para regras de layer, placement e coverage.

## Alterado
- A antiga composição de 12 lanes foi substituída pela estrutura de 5 camadas. Problema, Evidência, Métrica e Oportunidade continuam objetos do Service Graph, mas não são camadas estruturais do serviço.
- O modo `service` foi promovido a `WhiteboardLayoutMode` tipado.
- O editor React legado (`BlueprintView`) passa a reconhecer `Service Frame` e os objetos Job/Dor/Hipótese.
- `resource` participa da camada Sistemas e recursos.
- `+ Estrutura` e ferramentas do Whiteboard passam a chamar a composição de `Service Frame`.
- Design System preservado: tipografia >= 11px, paleta estrutural via tokens e dívida `!important` mantida em 290.

## Regra canônica
O Service Frame não cria uma segunda base de dados. `serviceStageId` e `serviceLayer` são metadados de representação da instância visual; Personas, problemas, processos, sistemas e demais objetos continuam únicos no Service Graph.

## QA
- `npm run qa`: PASS.
- 44 gates com contagem explícita: 1630/1630, 0 FAIL.
- V1.20.3 Structured Service Frame: 71/71.
- Compatibilidade Service Composition V1.19.4+: 43/43.
- Typecheck isolado `model + service-frame`: PASS.
- `syntax:check`, `lock:verify`, `source:authority`, `foundation:smoke`, `preflight-linux`: PASS.
- ZIP Linux reextraído: VERSION 1.20.3, START.sh 755, 1630/1630, diretórios proibidos ausentes.

## Limitações declaradas
- Browser Truth: UNAVAILABLE neste ambiente porque o Chromium esperado pelo Playwright não está instalado.
- `npm ci` excedeu o limite do ambiente e deixou uma instalação parcial; ela foi removida.
- Typecheck React/Vite completo e build Vite completo não são declarados nesta release neste ambiente.

# QA — V1.8.3

## Gate estático

`./qa-core.sh` verifica:

- Whiteboard Core, Journey Studio, Blueprint Studio e Blueprint Home preservados;
- API `window.__rtBlueprintEditor`;
- migração da V1.8.2;
- header Blueprint padronizado;
- breadcrumb e status;
- painel Blueprint com três abas;
- cobertura operacional;
- controle de lanes e linhas semânticas;
- Contexto e Governança;
- Inspector separado do documento;
- Configurações do canvas renomeadas;
- side panels mutuamente exclusivos;
- paleta RealTalent e responsividade;
- assets V1.8.3 carregados no `dist/index.html`.

## Release gate

- `node --check` em `v183-whiteboard.js` e `v183-shell.js`;
- `unzip -t` do ZIP final;
- `start-linux.sh` executado a partir de extração limpa;
- HTTP 200 para index e assets V1.8.3.

## QA de interação — harness Chromium controlado

Cenário 1366×768 com os assets finais V1.8.3 injetados no navegador:

- Blueprint View aberta: OK;
- breadcrumb `Blueprints / Serviço principal`: OK;
- título e status no header: OK;
- botão `Blueprint ▾`: OK;
- painel Blueprint: OK;
- abas Estrutura / Contexto / Governança: OK;
- cobertura operacional: OK;
- 6 controles de lane: OK;
- campos Nome do Blueprint e Jornada vinculada: OK;
- Responsável e Status: OK;
- selecionar objeto fecha painel Blueprint e abre Inspector: OK;
- título do Inspector usa o tipo semântico do objeto: OK;
- abrir Biblioteca fecha painel Blueprint: OK;
- minimapa não sobrepõe o painel Blueprint: OK;
- erros JavaScript observados: 0.

Captura de QA externa ao pacote: `rt183_blueprint_editor_qa.png`.

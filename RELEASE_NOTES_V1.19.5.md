# Blue Ocean Service Studio V1.19.5 — UX Truth & Service Project Entry

## Objetivo
Parar de tratar uma mudança visual como entregue apenas porque uma função ou string existe na fonte e iniciar a migração Discovery-first do produto: primeiro entender cliente, necessidade e problema; depois desenhar o serviço.

## Adicionado
- **Service Project Home** no Dashboard com as fases Entender → Definir → Desenhar → Validar → Melhorar.
- Fase inicial **Entender** com contadores e criação rápida de Persona, Necessidade e Problema/Hipótese; Evidência usa o Research Workspace.
- Problemas podem existir como `problemHypothesis` antes de uma Journey, evitando criar estrutura artificial só para registrar uma dor.
- Gate de contexto mínimo: montagem estruturada do serviço requer pelo menos 1 Persona + 1 Problema/Hipótese; Whiteboard livre continua disponível.
- **UX Truth Gate** com níveis L1 Código, L2 Contrato, L3 Runtime e L4 Visual.
- Manifesto `qa/ux-truth/V1.19.5.json` com rotas críticas e UI legada proibida.
- `npm run ux-truth:smoke` e `npm run ux-truth:browser`.
- Roadmap `ROADMAP_SERVICE_PROJECT_V1.19.5_A_V1.21.0.md`.

## Removido / substituído
- O modal gigante **“Preparar o Serviço”** não é mais um caminho de runtime. A API legada redireciona para o contexto do Service Project.
- O fluxo “criar serviço → escolher imediatamente Whiteboard/Guiado/Template” deixa de ser o fluxo principal; após criar o projeto, o usuário entra em Discovery.
- A copy técnica `representação(ões) visuais` foi removida da confirmação de exclusão de quadro.

## Ajustado
- Menu global de criação prioriza Persona, Problema/Hipótese e Pesquisa antes das ferramentas de desenho.
- Whiteboards informa quando falta contexto e oferece retorno ao Dashboard, sem impedir quadros livres.
- Gates históricos V1.17/V1.18/V1.19 foram atualizados somente onde um fluxo antigo foi deliberadamente substituído por seu sucessor Discovery-first, mantendo os contratos de workspace vazio, blank canvas e ausência de criação escondida.

## QA comprovado neste ambiente
- `npm run qa`: **1139 OK / 0 FAIL**.
- `npm run ux-truth:smoke`: **35/35**.
- `npm run composition:smoke`: **59/59**.
- `npm run creation-reset:smoke`: **83/83**.
- `npm run assistant:smoke`: **51/51**.
- `npm run syntax:check`: PASS.
- `npm run lock:verify`: PASS.
- `npm run source:authority`: PASS.
- `npm run foundation:smoke`: PASS.
- `./preflight-linux.sh`: PASS.

## O que NÃO foi declarado como aprovado
- `npm ci` não concluiu neste ambiente; uma instalação parcial foi removida antes do empacotamento.
- `npm run typecheck` completo não é válido sem uma instalação de dependências íntegra.
- `npm run build` React/Vite completo não foi executado com dependências íntegra.
- Browser Truth L3/L4 ficou **UNAVAILABLE**, não PASS: Playwright Python existe, mas o Chromium correspondente não está instalado neste ambiente.

Essa separação é intencional: V1.19.5 passa a distinguir claramente contrato de fonte de prova real de navegador.

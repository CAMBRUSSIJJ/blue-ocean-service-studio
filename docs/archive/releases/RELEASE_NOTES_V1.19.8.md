# V1.19.8 — Discovery Workspace

## Objetivo

Transformar a fase **Entender** da Service Home em um workspace operacional de Discovery antes do desenho do serviço.

O fluxo passa a explicitar:

`Persona → Necessidade → Job → Dor → Hipótese → Evidência`

O Discovery continua apoiado no **Service Graph canônico**. O `Service Project` não duplica listas de Personas, Necessidades, Jobs, Dores, Hipóteses ou Evidências.

## Adicionado

- `src/services/discovery-workspace.ts` com relatório derivado do Discovery.
- Seis dimensões de contexto: Persona, Necessidade, Job, Dor, Hipótese e Evidência.
- Criação rápida dos seis objetos diretamente na fase Entender.
- Relação opcional entre um novo objeto e um objeto de contexto existente.
- Confiança de evidência (`low`, `medium`, `high`).
- Fluxo visual de descoberta com perguntas-guia para cada dimensão.
- Stream de contexto recente e contagem de relações.
- Cobertura do Discovery e critério de contexto mínimo para avançar.
- Gate compartilhado com Whiteboards / Guided Builder.
- Gate específico `discovery:smoke`.

## Service Home preservada/reconstruída

A release mantém o comportamento esperado da V1.19.7:

- fases clicáveis e persistentes;
- workspace próprio para Entender, Definir, Desenhar, Validar e Melhorar;
- editor persistente de Definir;
- resumo lateral das cinco fases;
- transição Entender → Definir → Desenhar.

## Definir

A definição do serviço continua persistida em `service.project.definition` por `updateServiceProjectDefinition()`:

- promessa;
- resultado esperado;
- escopo;
- início;
- fim;
- princípios.

## Regra de readiness do Discovery

Contexto mínimo para construção guiada:

- pelo menos 1 Persona;
- pelo menos 1 Necessidade **ou** Job;
- pelo menos 1 Dor **ou** Hipótese;
- pelo menos 1 Evidência.

O quadro livre continua disponível sem esse bloqueio.

## Compatibilidade de arquitetura

- `schemaVersion` permanece `3`.
- `ServiceProjectState` continua responsável por ciclo/fase e definição.
- Discovery permanece no Service Graph e é apenas derivado pela Home.
- Jobs e Dores usam o mecanismo genérico de `GraphEntity`, sem duplicar bancos ou criar um segundo modelo de dados.
- Whiteboard continua sendo uma view/ambiente de composição, não a fonte de verdade.

## QA

- Regressão existente: **1183 OK / 0 FAIL**.
- V1.19.7 Service Home reconstructed smoke: **19 OK / 0 FAIL**.
- V1.19.8 Discovery Workspace: **51 OK / 0 FAIL**.
- `npm run syntax:check`: PASS.
- `npm run lock:verify`: PASS.
- `npm run source:authority`: PASS.
- `npm run foundation:smoke`: PASS.
- `./preflight-linux.sh`: PASS.

### Browser Truth

Status: **UNAVAILABLE** neste ambiente.

Playwright Python está presente, porém o Chromium esperado pelo Playwright não está instalado. Nenhum PASS visual foi inferido dessa indisponibilidade.

### Typecheck/build React/Vite

`npm ci` excedeu o limite do ambiente e deixou uma instalação parcial sem React/TypeScript utilizáveis. O `node_modules` parcial foi removido antes do empacotamento.

Por isso:

- typecheck completo React/Vite: **NÃO DECLARADO**;
- build React/Vite: **NÃO DECLARADO**.

## Próxima etapa

**V1.19.9 — Persona Studio**: aprofundar Persona simples/profissional, relacionando contexto, necessidades, Jobs e evidências sem quebrar a simplicidade progressiva do Discovery Workspace.

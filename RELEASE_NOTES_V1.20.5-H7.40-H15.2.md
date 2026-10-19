# V1.20.5-H7.40-H15.2 — Usage & Relations

## Objetivo

Transformar a camada de Service Model introduzida na H15 em uma experiência visível e navegável, sem reorganizar a arquitetura global da H14/H15 e sem duplicar entidades existentes.

## Entregas

- Novo painel compartilhado **Uso e relações**, derivado do `Service Model Index`.
- Separação explícita entre **Utilizado em** e **Relacionado a**.
- Agrupamento de conexões por domínio: Pessoas, Descoberta, Design, Pesquisa, Melhoria, Gestão, Operação, Governança, Aprendizado e Definição.
- `ServiceObjectReference` reutilizável para referências de objetos do serviço.
- Navegação universal via `openServiceObject(kind, id)` reutilizando os eventos e superfícies já existentes.
- Persistência transitória de foco em `sessionStorage` para atravessar Contexto e Service Workspace sem criar uma nova rota global.
- Integração do painel em Persona, Necessidade, Job, Dor, Hipótese, Problema validado, Evidência, Ator/Ecologia, Touchpoint, Iniciativa e Métrica.
- Foco de Journey, Blueprint e Whiteboard preparado no `BlueprintWorkspaceView` para navegação cruzada.
- Touchpoints ganham seleção explícita na visão de Canais para abrir suas relações.
- Primeiro ciclo permanece **read-only**: a H15.2 lê e navega as relações existentes; não cria um editor genérico de vínculos.
- Novo CSS responsivo com `focus-visible` e targets de 44 px/48 px em touch.

## Arquitetura preservada

- A sidebar global não ganha uma nova seção “Elementos do serviço”.
- `Serviço` continua como entrada global.
- `Design do serviço`, `Contexto` e `Gestão` continuam organizando a atividade do usuário.
- O `ServiceGraph` permanece autoridade dos dados.
- O `Service Model Index` permanece derivado/read-only.

## Arquivos centrais

- `src/components/ServiceUsageRelations.tsx`
- `src/services/service-object-navigation.ts`
- `src/runtime/usage-relations-h740h152.css`
- `scripts/v1205h740h152-usage-relations-smoke.mjs`

## QA desta execução

- H15.2 Usage & Relations: **75/75 PASS**
- H15 Service Model Index: **36/36 PASS**
- H14 Interaction & Accessibility Polish: **35/35 PASS**
- H13 Persistent Global Sidebar: **25/25 PASS**
- H12 Primary Sidebar + Project Context Switch: **31/31 PASS**
- H11 Service-first Project Navigation: **20/20 PASS**
- H7.37 Service Governance: **211/211 PASS**
- H7.36 Metrics & Service Outcomes: **203/203 PASS**
- H7.35 Improvement Portfolio: **176/176 PASS**
- H7.29 Channels + Touchpoints + Continuity: **129/129 OK**
- H7.25 Service Ecology + Stakeholder Network: **60/60**
- `syntax:check`: **PASS**
- `lock:verify`: **PASS**
- `source:authority`: **PASS**
- `preflight-linux.sh`: **PASS**
- Service Model + navigation core em TypeScript strict/noUnused: **PASS**

O `npm run qa` completo não foi usado como fonte de um total acumulado nesta execução. Os gates acima e o preflight foram executados diretamente.

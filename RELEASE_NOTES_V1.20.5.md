# V1.20.5 — Frontstage / Backstage Advanced System

## Objetivo
Aprofundar o Service Frame sem voltar ao grid excessivamente complexo. As cinco camadas permanecem canônicas; papéis, canais, dependências, políticas e evidências passam a enriquecer os objetos de Frontstage/Backstage/Processo/Sistema por relações do Service Graph.

## Adicionado
- `src/services/frontstage-backstage.ts` com modelo determinístico de contexto operacional.
- Entidades canônicas `role`, `dependency` e `policy` no runtime/modelo.
- Relações por ID: `roleIds`, `channelIds`, `dependencyIds`, `policyIds`, `evidenceIds`.
- `serviceVisibility`: `customer-visible` para Cliente/Frontstage e `internal` para Backstage/Processos/Enablement.
- Evidência operacional tipada como `physical`, `digital`, `human`, `documentary` ou `operational`.
- Botão **Operação** no Service Frame e diagnóstico operacional por etapa.
- Inspector com seção **Contexto operacional** para Frontstage, Backstage, Processo, Sistema/Recurso e Touchpoint.
- Biblioteca operacional para criar e relacionar Papéis, Canais, Dependências, Políticas e Evidências.
- Relatório `buildFrontstageBackstageReport()` com gaps explicáveis por etapa.

## Regra de UX
A V1.20.5 NÃO cria novas lanes. `Cliente / Frontstage / Backstage / Processos / Sistemas e recursos` continuam sendo as cinco camadas estruturais. Contexto operacional é propriedade/relação dos objetos existentes.

## Diagnósticos por etapa
O relatório avançado verifica:
1. presença de Frontstage;
2. presença de Backstage;
3. canal no Frontstage;
4. papel responsável;
5. dependências internas;
6. políticas/regras operacionais;
7. evidência física ou digital visível ao cliente.

O resultado é determinístico; não existe IA atribuindo qualidade subjetiva.

## Compatibilidade
- `schemaVersion` permanece `3`.
- Service Project permanece `version: 1`.
- Service Frame permanece `serviceStageId + serviceLayer` como metadados de posicionamento.
- As novas relações ficam no Service Graph; não há cópia paralela de dados no Whiteboard.
- V1.20.4 Service Readiness permanece funcional e separado deste diagnóstico avançado.

## QA
- V1.20.5 específico: **77 OK / 0 FAIL**.
- `npm run qa`: **PASS**.
- 49 gates com contagem explícita: **1818 / 1818**.
- `syntax:check`: PASS.
- `lock:verify`: PASS.
- `source:authority`: PASS.
- `foundation:smoke`: PASS.
- Linux preflight: PASS.
- Typecheck isolado (`model + service-frame + frontstage-backstage`): PASS.
- Browser Truth: **UNAVAILABLE** por ausência do Chromium do Playwright.
- `npm ci`: tentativa não concluída neste ambiente; deixou instalação parcial (~804 KB), removida antes do pacote.
- Typecheck React/Vite completo e build Vite: não declarados.

## Validação do artefato Linux
O ZIP Linux final foi extraído em diretório limpo e validado novamente: `VERSION 1.20.5`, `START.sh 755`, nenhum diretório proibido, gate V1.20.5 `77/77`, preflight PASS e regressão completa `1818/1818` com status 0.

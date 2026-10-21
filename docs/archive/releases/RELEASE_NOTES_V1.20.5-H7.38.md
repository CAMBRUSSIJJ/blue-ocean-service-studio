# V1.20.5-H7.38 — Service Operations Bridge

## Objetivo
Conectar o Service Graph à execução operacional por vínculos explícitos e rastreáveis, sem acoplar o Blue Ocean a um único CRM e sem declarar integrações externas como ativas antes de autenticação/conector real.

## O que entrou
- Nova perspectiva **Operação** no Service Workspace; agora são 16 perspectivas conectadas.
- Mapeamentos canônicos: **Touchpoint → Atividade**, **Journey → Fluxo operacional**, **Canal → Comunicação**, **Blueprint → Processo**, **Iniciativa → Execução** e **Métrica → Fonte de dados**.
- Providers previstos: Blue Ocean, RealTalent CRM, Webhook, Operação manual e Outro sistema.
- Direções: Design → Operação, Operação → Design e Bidirecional.
- Modos de sincronização: somente referência, manual, agendada e por evento.
- Estados do vínculo: rascunho, ativo, pausado, erro e arquivado.
- Referência externa obrigatória para ativar RealTalent CRM, Webhook ou Outro sistema.
- Histórico de execução com resultado simulado, sucesso, parcial ou falha.
- Simulação é local e **não chama sistema externo**.
- Alvos removidos ficam marcados como ausentes sem apagar o histórico; quando retornam, o vínculo recupera a presença e atualiza o label.
- Cobertura operacional por camada e health score determinísticos.

## Regra arquitetural
A H7.38 registra contratos e telemetria operacional. Criar, ativar, simular ou registrar uma execução **não modifica automaticamente** Journey, Touchpoint, Canal, Blueprint, Iniciativa ou Métrica. Integração online com RealTalent CRM/Webhook continua dependente de conector e autenticação reais.

## QA
- H7.38 Service Operations Bridge: **197/197 PASS**
- H7.37 Service Governance: **211/211 PASS**
- H7.36 Metrics & Service Outcomes: **203/203 PASS**
- Suíte acumulada: **4295 OK / 0 FAIL**
- `syntax:check`: PASS
- TypeScript strict core H7.38 (`model.ts + service-operations-bridge.ts`, Bundler): PASS
- `lock:verify`: PASS
- `source:authority`: PASS
- Foundation: **12/12 PASS**
- Project Foundation: **46/46 PASS**
- `preflight-linux.sh`: PASS

## Limitações declaradas
`npm ci` não concluiu dentro do limite controlado e terminou com código 137 após timeout; qualquer `node_modules` parcial foi removido. Por isso React typecheck completo, build Vite e validação visual/browser não são declarados como PASS nesta release. A presença do provider `RealTalent CRM` representa o contrato de integração, não uma conexão de rede ativa.

# V1.20.5-H7.37 — Service Governance

## Objetivo
Transformar ownership, revisão e aprovação em uma camada explícita do Service Graph, sem alterar automaticamente Journey, Blueprint, Canal, Métrica ou Iniciativa.

## O que entrou
- Nova perspectiva **Governança** no Service Workspace; agora são 15 perspectivas conectadas.
- Registro de governança para Journey, Blueprint, Canal, Métrica e Iniciativa.
- Papéis explícitos: **Owner**, **Accountable** e **Revisores**.
- Cadências: mensal, trimestral, semestral, anual e personalizada.
- Próxima revisão, última revisão e detecção determinística de revisão vencida.
- Fluxo de aprovação: não exigida, pendente, aprovada ou rejeitada.
- Histórico de revisões com revisor, resultado, nota e próxima revisão calculada.
- Cobertura de ownership por tipo de objeto e **Governance Score** determinístico.
- Alvos removidos ficam inativos em vez de apagar o histórico de governança.
- Renomear um alvo atualiza o label no registro sem perder ownership ou histórico.

## Regra arquitetural
A governança é uma camada separada. Aprovar, rejeitar ou revisar um item **não modifica automaticamente** o conteúdo do artefato governado.

## QA
- H7.37 Service Governance: **211/211 PASS**
- H7.36 Metrics & Service Outcomes: **203/203 PASS**
- H7.35 Improvement Portfolio: **176/176 PASS**
- H7.34 Problems, Opportunities & Prioritization: **175/175 PASS**
- H7.33 Current × Future Service: **134/134 PASS**
- Suíte acumulada: **4098 OK / 0 FAIL**
- `syntax:check`: PASS
- TypeScript strict core H7.37 (`model.ts + service-governance.ts`, Bundler): PASS
- `lock:verify`: PASS
- `source:authority`: PASS
- Foundation: 12/12 PASS
- Project Foundation: 46/46 PASS
- `preflight-linux.sh`: PASS

## Limitações declaradas
`npm ci` não concluiu e o processo precisou ser encerrado. Qualquer `node_modules` parcial foi removido. Por isso React typecheck completo, build Vite e validação visual/browser não são declarados como PASS nesta release.

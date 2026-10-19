# V1.20.5-H7.18 — Animated Ocean Branding & Navigation Icons

## Objetivo
Preservar a composição visual aprovada da H7.17, adicionar movimento sutil às ondas e substituir os ícones genéricos da navegação/Home por uma linguagem visual Blue Ocean consistente.

## Mudanças
- Ondas do Login mantêm exatamente a composição H7.17 e recebem apenas deriva horizontal lenta.
- Ondas do workspace mantêm o asset H7.17 e recebem corrente animada de baixa amplitude.
- Ondas inferiores da sidebar passam a se mover em velocidades diferentes, sem alterar o desenho dos paths.
- `prefers-reduced-motion` desliga todas as animações H7.18.
- Sidebar inteira migra para glyphs Blue Ocean: Dashboard, Journey, Blueprint, Whiteboard, Hierarquias, Personas, Necessidades, Jobs, Dores, Hipóteses, Problemas, Evidências, Portfólio, Métricas, Pesquisa, Templates, Arquivo, Colaboração e Configurações.
- Cada ícone da sidebar recebe cor e superfície semântica próprias, mantendo estado ativo coerente.
- Design System ganha `BlueOceanUtilityIcon` para navegação e utilidades, sem depender de pictogramas genéricos nas superfícies principais.
- Cards de Recentes recebem assinatura de artefato, corrente e glyph do tipo Journey/Blueprint/Whiteboard.
- Título `Recentes de <serviço>` é simplificado para `Recentes`.
- Nome do serviço passa a ser exibido como contexto compacto ao lado do título.
- Ações de criação, Favoritos, Aprender, filtros e exportação passam a consumir glyphs da linguagem Blue Ocean.

## Compatibilidade
- H7.17 Ocean Surface preservada.
- H7.16 Object Language preservada.
- H7.15 Ocean Workspace Home preservada.
- Contratos antigos de Dashboard são mantidos apenas semanticamente para regressão; a UI visível usa a linguagem H7.18.
- Nenhuma mudança de schema ou Service Graph.
- `package.json.version` permanece `1.20.5`.

## QA
- H7.18 Animated Ocean Branding & Navigation Icons: 38/38 PASS.
- H7.17 Ocean Surface: 30/30 PASS.
- H7.16 Object Language: 40/40 PASS.
- H7.15 Ocean Workspace Home: 30/30 PASS.
- `npm run qa`: 1966 OK / 0 FAIL.
- `npm run syntax:check`: PASS.
- `npm run lock:verify`: PASS.
- `npm run source:authority`: PASS.
- `npm run foundation:smoke`: 12/12 PASS.
- `./preflight-linux.sh`: PASS.

## Typecheck/build
O pacote final não inclui `node_modules`. A tentativa de `npm run typecheck` neste ambiente para na resolução de React/JSX e módulos dependentes; portanto `typecheck` e `build` completos não são declarados como PASS.

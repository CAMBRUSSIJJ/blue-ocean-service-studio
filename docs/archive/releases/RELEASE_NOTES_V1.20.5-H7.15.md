# V1.20.5-H7.15 — Ocean Workspace Home

## Base
V1.20.5-H7.14 — Service Depth & Adaptive Home.

## Objetivo
Aproximar a Home do ritmo visual da referência fornecida pelo usuário — três ações principais, Recentes como faixa dominante, Favoritos simples e Aprender em uma única linha — sem copiar a marca de terceiros e sem perder a inteligência construída nas H7.12–H7.14.

## Mudanças
- Home reduzida a quatro superfícies visuais principais: ações rápidas, Recentes, Favoritos e Aprender.
- `Nova jornada`, `Nova persona` e `Nova métrica` preservadas, agora em cartões compactos com assinatura Blue Ocean.
- Profundidade/Service Depth condensada em um selo compacto `BLUE OCEAN`, em vez de ocupar um painel completo.
- Corrente, Sinais do Serviço e continuidade permanecem semanticamente disponíveis, mas deixam de competir como widgets visuais separados.
- Recentes vira o principal painel da Home, com cards compactos, miniaturas próprias e `Ver todos os recentes` funcional.
- Favoritos vazio passa a ser apenas uma mensagem simples; sem container pesado.
- Aprender passa a usar seis cards em uma faixa desktop, com a recomendação contextual dentro da própria linha.
- Sidebar ganha reforço de marca no logo, item ativo, service switcher e ondas, sem alterar sua arquitetura.
- Novo diálogo de todos os recentes.

## Branding
A estrutura visual é inspirada na densidade e hierarquia da referência, mas a expressão é própria:
- Ocean Blue / Deep Ocean;
- ondas e horizonte discretos;
- thumbnails semânticos para Journey, Blueprint e Whiteboard;
- ações com azul, violeta e teal;
- recomendação contextual com linguagem Blue Ocean.

## Preservado
- H7.12 Brand Experience.
- H7.13 Blue Ocean Identity System.
- H7.14 Service Depth & Adaptive Home.
- cálculo determinístico de profundidade;
- lógica `Começar` × `Continuar`;
- validação de problemas antes do Blueprint;
- arquitetura da sidebar;
- Context Library, Journey Maps 2.0, Service Blueprints 2.0 e Whiteboard 2.0.

## QA
- H7.15 Ocean Workspace Home: 30/30 PASS.
- H7.14 Adaptive Home: 30/30 PASS.
- H7.13 Ocean Identity: 26/26 PASS.
- H7.12 Brand Experience: 25/25 PASS.
- `npm run qa`: PASS.
- `npm run syntax:check`: PASS.
- `npm run lock:verify`: PASS.
- `npm run source:authority`: PASS.
- `npm run foundation:smoke`: 12/12 PASS.
- `./preflight-linux.sh`: PASS.

## Limitação de ambiente
`npm ci` não concluiu dentro do limite disponível. Sem uma instalação completa de dependências, `npm run typecheck` e `npm run build` completos não são declarados como PASS. A tentativa de typecheck sem `node_modules` falha na resolução de React/JSX e demais dependências, portanto não é tratada como diagnóstico válido do source H7.15.

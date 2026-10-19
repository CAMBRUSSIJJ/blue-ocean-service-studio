# V1.20.5-H7.17 — Ocean Surface & Background System

## Objetivo
Corrigir os fundos fragmentados observados no Login e na Home e consolidar uma superfície visual contínua baseada em oceano, profundidade, corrente e espuma.

## Problemas de entrada
1. Login: o raster de ondas atravessava a composição como faixas desconectadas e o lado direito ficava visualmente separado do restante da tela.
2. Home: Recentes possuía anel decorativo e meia-onda isolada, criando manchas em vez de um fundo coerente.
3. Fundo geral: a Home ainda parecia uma página branca com cards sobrepostos, em vez de um workspace Blue Ocean.

## Mudanças
- Novo `Ocean Surface System` com tokens H7.17.
- Novo asset vetorial `blue-ocean-surface-dark-h717.svg` para autenticação.
- Novo asset vetorial `blue-ocean-surface-light-h717.svg` para workspace.
- O raster animado legado do Login continua no DOM por compatibilidade, mas é neutralizado visualmente na H7.17.
- Login passa a ter um gradiente Deep Ocean contínuo, ondas vetoriais integradas e contraste reforçado no texto.
- Card de autenticação permanece claro e legível sobre a superfície oceânica.
- Home passa a usar fundo global azul/espuma com ondas no rodapé da página inteira.
- Recentes deixa de possuir anel solto e meia-onda interna.
- Recentes vira uma shelf translúcida integrada ao fundo.
- Quick Actions, Depth Chip, Recentes e Aprender recebem superfícies translúcidas leves em vez de blocos brancos isolados.
- Sidebar wave passa a compartilhar a mesma paleta da superfície principal.

## Compatibilidade
- H7.16 Object Language preservada.
- H7.15 Ocean Workspace Home preservada.
- H7.14 Service Depth preservada.
- Nenhuma mudança de schema, Service Graph ou migração de dados.
- `package.json.version` permanece `1.20.5`.

## QA
- H7.17 Ocean Surface & Background System: 30/30 PASS.
- H7.16 Blue Ocean Object Language: 40/40 PASS.
- `npm run qa`: PASS / 1928 OK / 0 FAIL.
- `npm run syntax:check`: PASS.
- `npm run lock:verify`: PASS.
- `npm run source:authority`: PASS.
- `npm run foundation:smoke`: 12/12 PASS.
- `./preflight-linux.sh`: PASS.

## Limitação do ambiente
`node_modules` não está presente no pacote-fonte final. `npm run typecheck` e `npm run build` completos não são declarados como PASS nesta geração.

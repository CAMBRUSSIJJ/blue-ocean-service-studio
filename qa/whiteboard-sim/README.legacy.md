# Kit de simulação do Whiteboard — BLUE OCEAN Service Studio

Executa o `whiteboard-core.js` REAL dentro de um navegador simulado (jsdom), operando o quadro como um usuário:
teclado, duplo clique, arrastar, laço, conexões, Ctrl+Z, zoom/pan, importação/exportação, conflito entre abas, quota de imagens.

## Instalação
    npm init -y && npm i jsdom esbuild fake-indexeddb
    python3 build-sim.py /caminho/para/Blue-Ocean-Service-Studio-V1.18.9-Linux-Source-Launcher
    ./run-all.sh

## Fases
1. Partida a frio e criação do quadro  2. Brainstorm (teclado/inspector)  3. Estrutura (frames, grupo, conexões, histórico, export)
4. Navegação, limites do canvas, persistência, conflito entre abas  5. Escala 50→2000 objetos  6. Templates, atalhos, celular, segurança

## Limites (leia antes de comparar números)
- jsdom não calcula layout nem pinta: tempos de render são limite inferior da parte de DOM/JS, não FPS real.
- Foco, remoção de nós e contagem de re-renders são fiéis ao código; o comportamento de pinça/toque real exige dispositivo.
- Cada fase imprime [PASS]/[FAIL]/[WARN]/[INFO] e grava rN.json. Use como regressão depois de cada correção.

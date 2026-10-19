# BLUE OCEAN — Whiteboard Sim Kit 2.0

## Objetivo

Transformar o `whiteboard-sim-kit` em uma infraestrutura de QA utilizável como gate do Whiteboard Core e do Service Builder Assistant da V1.19.0.

## Implementado

- Build instrumentado fora do source original (`.generated/`).
- `SIM_OUTPUT_DIR` portátil; nenhum caminho `/home/claude/...` hardcoded.
- Classificação de resultados em `assertion`, `known_issue`, `diagnostic` e `benchmark`.
- Agregador `summarize.cjs` com exit code de CI.
- Runner F0–F7 com detecção de crash/timeout.
- Teclado enviado ao `document.activeElement`, não sempre ao `body`.
- Fixture de Serviço usa `createServiceGraph()` do domínio real.
- F0 valida runtime, domínio e workspace vazio.
- F7 cobre Service Builder Assistant dentro do Whiteboard: definição, limites, Persona, Jornada, duas etapas, experiência, operação, evidência, problema, métrica, melhoria, revisão e persistência.
- `static-contracts.cjs` permite validar contratos centrais sem jsdom/esbuild instalados.
- Integração opcional em `qa/whiteboard-sim/` dentro do pacote V1.19.0.

## Validações executadas neste ambiente

- Todos os arquivos `.cjs`: `node --check` aprovado.
- `build-sim.py`: `py_compile` aprovado.
- `run-all.sh`: `bash -n` aprovado.
- Contratos estáticos V1.19.0: **16/16**.
- Smoke Service Builder Assistant existente: **51/51**.
- Smoke Creation Architecture Reset: **83/83**.
- Agregador: teste sintético PASS aprovado; teste sintético com FAIL retornou exit code 1 corretamente.
- SHA256 do `whiteboard-core.js` após tentativa de instrumentação = SHA256 do arquivo do ZIP original: o source original não foi alterado.

## Limitação ambiental

A execução F0–F7 em jsdom não pôde ser concluída aqui porque `jsdom`, `fake-indexeddb` e `esbuild` não estão instalados e o npm registry respondeu `EAI_AGAIN`. O kit falha de forma explícita e rápida quando essas dependências estão ausentes.

Não foi declarado que o gate dinâmico completo passou.

## Known issues monitorados

- canvas físico fixo / coordenadas negativas;
- reload ao sair de Whiteboard livre;
- foco/a11y de objetos do canvas;
- atalhos globais com controles focados;
- conflito entre abas;
- imagens base64 no Service Graph/histórico;
- undo por snapshot de grafo;
- conexões sem tipo semântico;
- fluxo visual Home React → Criar serviço ainda depende de futuro Playwright/Chromium.

## Próximo gate recomendado

Adicionar um **Real Browser Gate** com Playwright/Chromium para cobrir Home, CSS, layout, drag real, foco real, screenshots, responsividade e fluxo `Home → Criar serviço → Whiteboard vazio → Assistente`.

# Whiteboard Sim Kit 2.1 — integração de QA

A V1.19.1 inclui o Sim Kit em `qa/whiteboard-sim/` como gate comportamental complementar aos smoke tests históricos.

## Mudanças desde o 2.0
- F6 não depende mais do texto exato do botão de template.
- F7 usa a API pública `serviceBuilderAssistant.setMode()`.
- criação do primeiro quadro reconhece o Service Graph persistido após criação explícita do Serviço.
- known issues corrigidos mudam automaticamente para `RESOLVED`.
- contratos e sintaxe continuam executáveis sem jsdom através de `static-contracts.cjs` e `npm run check:scripts`.

## Execução completa
```bash
cd qa/whiteboard-sim
npm install
cd ../..
./run-whiteboard-sim-qa.sh
```

## Execução sem dependências adicionais
```bash
node qa/whiteboard-sim/static-contracts.cjs .
node scripts/v1191-whiteboard-core-reliability-smoke.mjs
```

O gate dinâmico deve ser executado em um ambiente com acesso ao registry npm para instalar `jsdom`, `fake-indexeddb` e `esbuild`.

# SOURCE BASELINE — V1.15.4

Baseline: **BLUE OCEAN Service Studio V1.15.4 — Whiteboard Visual Integrity & UX Recovery**.

## Regras de preservação

- Service Graph continua como fonte única de verdade.
- Não renomear IDs/chaves técnicas legadas em massa.
- Não alterar schema/persistência para ajustes visuais.
- Journey, Blueprint, Livre e demais views devem operar sobre os mesmos objetos.
- O Universal Inspector permanece a direção principal de edição contextual.

## Arquivos centrais alterados

- `src/runtime/whiteboard-core.js`
- `src/runtime/whiteboard-core.css`
- `src/runtime/blue-ocean-shell.js`
- `src/runtime/shell.js`
- `src/runtime/precision-studio-shell.js`
- `src/runtime/global-navigation.js`
- `src/App.tsx`
- `scripts/v1154-whiteboard-ux-smoke.mjs`
- `package.json`
- launchers Linux e assets publicados em `dist/`

## Gate para próxima versão

A V1.16.0 não deve começar se houver regressão em:

1. geometria inicial Journey/Blueprint;
2. labels/stages duplicados;
3. branding BLUE OCEAN;
4. Service Graph e referências;
5. persistência/import/export;
6. launcher Linux e pacote Vercel.

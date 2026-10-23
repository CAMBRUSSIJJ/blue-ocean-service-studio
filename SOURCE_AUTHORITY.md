# Código-fonte e artefatos — Blue Ocean Service Studio

A partir da **V1.16.0**, a autoridade do produto é a pasta `src/` junto de `index.html`, `package.json`, `package-lock.json` e `vite.config.ts`.

## Regra

- `src/` é código-fonte canônico.
- `public/v*.js` e `public/v*.css` são gerados por `scripts/prepare-assets.mjs`.
- A matriz integrada é editada em `src/runtime/journey-matrix.html` e
  `src/runtime/journey-matrix.css`, com interações complementares em
  `src/runtime/journey-growth-ui.js`, composição em
  `src/runtime/journey-content-ui.js`, catálogo e tipos avançados em
  `src/runtime/journey-picker-ui.js`, contexto e evidências em
  `src/runtime/journey-context-ui.js` e `src/services/journey-context.js`, validação compartilhada em
  `src/services/journey-content.js`, visualizações em
  `src/runtime/journey-views-ui.js` e `src/services/journey-views.js`, vínculos e filtros de cartões em
  `src/runtime/journey-persona-content-ui.js`, abrangência, seleção e fases em
  `src/runtime/journey-structure-ui.js` e `src/services/journey-structure.js`, sub-jornadas em
  `src/runtime/journey-hierarchy-ui.js` e `src/services/journey-hierarchy.js`, e regras de planejamento em
  `src/services/journey-growth.ts`. O mesmo script gera
  `public/blueprint-reference-original.html` e `public/journey-matrix.css`.
- `dist/` é sempre gerado por `npm run build` e **não deve ser corrigido manualmente**.
- a versão do produto vem de `package.json` e é propagada automaticamente para React, Whiteboard e `app-version.json`.
- qualquer alteração direta no bundle publicado deve ser refeita no source antes de uma release.

## Build oficial

```bash
npm ci
npm run release:verify
```

O build grava `dist/build-manifest.json` com versão, build ID, hash do source e hash do lockfile.

## Verificações e pré-requisitos

Para verificar o código-fonte com as dependências instaladas:

```bash
npm run source:verify
```

`source:verify` inclui TypeScript e suítes que importam dependências da aplicação.
Ele não é um gate independente de instalação. O `typecheck` completo e o
`vite build` também exigem as dependências do `package-lock.json`.

As verificações atuais estão no [guia de testes](docs/testes.md).
Notas de versão, hashes e baselines antigos foram preservados no
[arquivo histórico](docs/archive/README.md); eles não substituem a validação do commit atual.

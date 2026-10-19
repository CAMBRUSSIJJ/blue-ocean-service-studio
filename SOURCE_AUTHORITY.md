# Source Authority — BLUE OCEAN Service Studio

A partir da **V1.16.0**, a autoridade do produto é a pasta `src/` junto de `index.html`, `package.json`, `package-lock.json` e `vite.config.ts`.

## Regra

- `src/` é código-fonte canônico.
- `public/v*.js` e `public/v*.css` são gerados por `scripts/prepare-assets.mjs`.
- `dist/` é sempre gerado por `npm run build` e **não deve ser corrigido manualmente**.
- a versão do produto vem de `package.json` e é propagada automaticamente para React, Whiteboard e `app-version.json`.
- qualquer alteração direta no bundle publicado deve ser refeita no source antes de uma release.

## Build oficial

```bash
npm ci
npm run release:verify
```

O build grava `dist/build-manifest.json` com versão, build ID, hash do source e hash do lockfile.

## Gate offline

Sem acesso ao registro npm, ainda é possível validar a estrutura e os contratos que não exigem dependências instaladas:

```bash
npm run source:verify
```

O `typecheck` completo e o `vite build` exigem as dependências do `package-lock.json`.

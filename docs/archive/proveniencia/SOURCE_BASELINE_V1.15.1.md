# Source Baseline — V1.15.1

Baseline: V1.15.0 Global Navigation.

Escopo deste patch: Build Pipeline Recovery. Nenhuma feature de produto foi adicionada.

Gate oficial em ambiente com acesso ao npm registry:

```bash
npm ci
npm run release:verify
```

Gate offline de diagnóstico:

```bash
node scripts/v1151-offline-source-check.mjs
```

O gate offline não substitui o build Vite; ele existe para separar falhas de código/source de indisponibilidade externa do registry.

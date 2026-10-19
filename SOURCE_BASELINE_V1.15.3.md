# SOURCE BASELINE — V1.15.3

Baseline anterior: **V1.15.2 — Precision Studio Shell**.

Esta baseline consolida branding e visual sem alterar schemas do Service Graph, IDs, storage, migrations ou contratos funcionais.

## Fonte de verdade visual

- `src/design-system/tokens.css`
- `src/runtime/blue-ocean-shell.js`
- `src/runtime/precision-studio-shell.css`
- `src/runtime/precision-studio-shell.js`

Módulos históricos `v1102-*` continuam existindo por compatibilidade funcional, mas seus estilos fonte foram migrados para consumir os tokens BLUE OCEAN.

## Compatibilidade

Não remover sem migration explícita:
- `window.RealTalentRuntime` (alias técnico legado)
- formatos `realtalent.*`
- chaves de storage `realtalent-*`
- IDs `rt*` usados por módulos e dados existentes

Para código novo, usar `window.BlueOceanRuntime`.

## Gate visual obrigatório

Execute:

```bash
npm run branding:smoke
npm run precision:smoke
npm run qa
npm run dist:verify
```

A release deve falhar se a paleta estrutural histórica reaparecer ou se a sidebar voltar a possuir grupos/estados ativos duplicados.

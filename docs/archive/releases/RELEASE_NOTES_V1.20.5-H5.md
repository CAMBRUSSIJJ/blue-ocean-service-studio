# V1.20.5-H5 — CSS Import Order Hotfix

## Problema corrigido
O build da H4 concluía, porém o PostCSS emitia:

`@import must precede all other statements (besides @charset or empty @layer)`

A causa era `@import './runtime/workspace-library-h3.css';` estar depois de regras CSS em `src/style.css`.

## Correção
O import da Workspace IA foi movido para o bloco inicial de imports, antes de `@tailwind` e antes de qualquer seletor CSS.

Ordem canônica:

```css
@import './design-system/index.css';
...
@import './runtime/service-project-home.css';
@import './runtime/workspace-library-h3.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Proteção contra regressão
Novo gate:

`npm run v1205h5:css-import-order-smoke`

O gate exige que:
- o CSS H3 continue importado;
- todos os `@import` permaneçam no bloco inicial;
- nenhum `@import` apareça depois de `@tailwind` ou de regras CSS.

## Compatibilidade
- versão funcional permanece `1.20.5`;
- H1/H2/H3/H4 preservados;
- nenhuma regra de negócio foi alterada;
- nenhuma tela ou dado foi removido.

# Arquitetura V1.8.9 — Master UX Polish

A V1.8.9 preserva a arquitetura funcional e os contratos de persistência da V1.8.8. A evolução ocorre principalmente na camada de experiência.

## Camadas

1. **React shell** — navegação principal, backup e Plano de Ação.
2. **Global shell V1.8.9** — Homes de Blueprint, decoração global e integração visual com o shell React.
3. **Journey Home V1.8.9** — biblioteca de jornadas, templates, filtros, favoritos e configuração.
4. **Whiteboard runtime V1.8.9-compatible** — mesma base funcional consolidada na V1.8.8, preservando chaves/migrações existentes.
5. **V1.8.9 UI layer** — tokens, responsividade e normalização de controles entre todos os módulos.

## Assets executáveis

- `dist/v189-shell.js`
- `dist/v189-shell.css`
- `dist/v189-journey-home.js`
- `dist/v189-whiteboard.js`
- `dist/v189-whiteboard.css`
- `dist/v189-ui.css`

O `dist/index.html` carrega estes assets diretamente; por isso o usuário final não precisa instalar Node.

## Compatibilidade de dados

As chaves históricas e migrações do Whiteboard não foram renomeadas. Isso é intencional: mudar a versão visual não deve criar um novo silo de `localStorage` nem impedir a recuperação de dados existentes na porta 4173.

## Princípio de UI

A versão usa `#04342C` como cor estrutural, `#1D9E75` como acento, superfícies claras/bege e cores semânticas apenas quando carregam significado. Em telas pequenas, a navegação global migra para uma barra inferior; os editores mantêm o canvas como superfície prioritária.

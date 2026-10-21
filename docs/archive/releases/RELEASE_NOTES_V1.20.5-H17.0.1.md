# Blue Ocean Service Studio V1.20.5-H17.0.1

## Sidebar Icon Typecheck Hotfix

A H17 tinha uma referência `<ChevronsUpDown />` em `src/App.tsx` sem importar esse símbolo, o que causava TS2304 no `npm run typecheck` e impedia a abertura pelo launcher.

Esta correção importa o ícone pela fachada `src/design-system/icons.ts`, mantendo aparência, fluxo de navegação, arquitetura de experiência única e todos os dados inalterados.

Foi adicionado o smoke `v1205h1701:icon-typecheck-smoke` à cadeia `qa` e ao preflight Linux. O launcher identifica a versão H17.0.1.

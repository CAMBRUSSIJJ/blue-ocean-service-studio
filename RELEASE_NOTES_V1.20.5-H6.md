# BLUE OCEAN Service Studio — V1.20.5-H6 Routing & Layer Recovery

## Motivo
O vídeo de runtime mostrou que o breadcrumb/sidebar mudavam de módulo, porém a Dashboard continuava visível por cima da view selecionada. Também apareciam um `Workspace` duplicado e controles globais legados.

## Causa comprovada
A aplicação React H3/H5 já possuía renderização condicional exclusiva, porém `src/runtime/workspace-home.js` ainda criava uma segunda Home em `document.body` (`#bo-v114-workspace-home`), injetava um botão `Workspace` e podia injetar `+ Criar`. A navegação React usava `setActiveTab()` diretamente, portanto os runtimes que dependem de `rt-navigation` não eram sincronizados.

## Corrigido
- Dashboard React passa a declarar `data-bo-workspace-home-native="1"`.
- O runtime Workspace detecta `data-bo-precision-sidebar-native="1"` e entra em modo compatível, sem criar Home visual própria.
- Removida injeção de `Workspace`, `+ Criar` e menu legado no shell React nativo.
- Navegação core e páginas de biblioteca passam por `rt-navigation`.
- Coordenador React oculta explicitamente superfícies runtime antigas ao entrar em uma view core.
- `blue-ocean-shell.js` não insere grupos/heading na sidebar React nativa.
- CSS adiciona um fail-safe para impedir a Home runtime antiga de aparecer sobre a Dashboard React.
- `main` expõe `data-bo-active-view` para auditoria de Browser Truth.

## Gates
- H6 Routing & Layer Recovery: 28/28 PASS.
- QA regressivo: 1331 OK / 0 FAIL.
- lock verify: PASS.
- source authority: PASS.
- source foundation: 12/12 PASS.
- preflight Linux: PASS.

## Browser Truth
Foi adicionado `scripts/v1205h6-browser-routing.py`, que percorre `home → whiteboards → journey → context → home` e exige:
- uma única view React ativa;
- Dashboard presente somente em `home`;
- nenhuma Home/Journey/Blueprint library legada visível;
- nenhum `Workspace` ou `+ Criar` legado injetado.

O gate pós-correção não foi executado neste ambiente porque `npm ci` não conseguiu obter `zod@4.6.5`; isso permanece explicitamente `NOT_RUN`, não PASS.

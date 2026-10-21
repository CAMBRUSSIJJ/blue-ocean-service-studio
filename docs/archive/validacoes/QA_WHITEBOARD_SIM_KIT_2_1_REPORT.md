# BLUE OCEAN — Whiteboard Sim Kit 2.1 / V1.19.1

## Baseline que motivou a correção
O Sim Kit 2.0 executado pelo usuário reportou 31 assertions aprovadas, 3 falhas bloqueantes, 8 known issues abertos e ausência de resultado em F6/F7.

## Falhas bloqueantes atacadas
- 2.4 foco/cursor no Inspector;
- 2.5 drag de post-it;
- 3.6 conexão por handle.

## Known issues atacados
- placement de post-its;
- atalhos sobre controles;
- foco após toolbar;
- operação básica por teclado/ARIA;
- `aria-live`;
- canvas positivo fixo;
- conflito entre abas sem proteção persistente;
- saída do Whiteboard livre via reload.

## Crashes F6/F7
- F6: o harness procurava `Template` por igualdade textual; a UI usa `Usar template`.
- F7: o harness chamava `assistant.setMode`, enquanto a API antiga expunha somente `mode`; além disso, o Whiteboard Core podia reter em memória o workspace vazio depois que o Serviço era persistido externamente.

Ambos foram corrigidos na V1.19.1/Sim Kit 2.1.

## Estado validado neste ambiente
- regressão completa: 903 OK / 0 FAIL;
- reliability contracts: 42/42;
- Sim Kit static contracts: 16/16;
- scripts do Sim Kit: sintaxe OK;
- preflight Linux: OK.

O gate dinâmico jsdom não foi executado porque a instalação das dependências não concluiu neste ambiente. O gate Playwright source-only foi preparado, mas o Chromium local bloqueia localhost por política (`ERR_BLOCKED_BY_ADMINISTRATOR`).

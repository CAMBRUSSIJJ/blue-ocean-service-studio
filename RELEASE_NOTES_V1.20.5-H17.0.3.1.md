# Blue Ocean Service Studio V1.20.5-H17.0.3.1

**Guided Target Typecheck Hotfix**

Resolve TS2367 em `src/views/BlueprintWorkspaceView.tsx` na comparação `understandNextTarget === 'research'`.
O próximo passo de Entender na H17.0.3 utiliza `audience`, `ecology`, `proposition` ou `journey`, nunca `research`.
Foi retirada uma comparação impossível dentro de um botão legado; nenhuma ação principal foi removida.
A experiência única permanece a mesma; criação de Persona, Jornada e Métricas preservada.

## Verificação
`node scripts/v1205h17031-guidance-typecheck-smoke.mjs`; `npm run qa`; `./preflight-linux.sh`.
O launcher fará `npm run typecheck` e `npm run build` após a instalação de dependências.

# BLUE OCEAN Service Studio — V1.17.7-H1

Hotfix de TypeScript sobre a V1.17.7.

## Corrigido
- Remove o import default `React` não utilizado de `src/views/DesignSystemView.tsx` (TS6133).
- Remove o ícone `Gauge` não utilizado de `src/views/WorkspaceHome.tsx` (TS6133).

## Melhorado
- Adiciona o gate `hotfix:h1:smoke` à bateria `npm run qa` para impedir a reintrodução desses imports ociosos.
- Mantém `npm run typecheck` como barreira obrigatória de `source:verify` e `release:verify`.

## Preservado
- Sem alteração de schema, Service Graph, IDs, storage, migrations, UX ou persistência.

## Limitação do ambiente de geração
- O registry npm não concluiu `npm ci` no ambiente de geração. O typecheck integral deve ser executado após `npm ci` em ambiente com registry acessível.

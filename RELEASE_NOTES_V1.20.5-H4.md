# V1.20.5-H4 — Typecheck Cleanup

## Objetivo
Corrigir os três erros TypeScript restantes após a migração de Workspace IA / Blueprint da H3, sem alterar comportamento funcional.

## Corrigido
- `src/App.tsx`: removido `Plus` do import de ícones porque não era mais utilizado.
- `src/views/WhiteboardsView.tsx`: `ArrowRight` agora é importado explicitamente para o CTA `Abrir`.
- `src/views/WorkspaceLibraryView.tsx`: removido `contextEntityDescription`, que ficou obsoleto após a nova biblioteca tabular.

## Proteção contra regressão
Novo gate `scripts/v1205h4-typecheck-cleanup-smoke.mjs`, com 7 verificações.

## Compatibilidade
- versão funcional permanece `1.20.5`;
- H4 é um hotfix de compilação;
- nenhuma regra do Service Graph ou navegação foi alterada.

## Limitação do ambiente de empacotamento
A instalação de dependências completa (`npm ci`) não concluiu dentro do limite deste ambiente. Portanto full typecheck/build devem ser reexecutados no ambiente Linux do usuário.

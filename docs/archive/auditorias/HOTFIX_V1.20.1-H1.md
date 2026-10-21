# V1.20.1-H1 — WorkspaceHome Typecheck Hotfix

Hotfix sem mudança funcional sobre V1.20.1.

## Corrigido
- Remove `jobs` e `pains` não utilizados.
- Remove `designCount`, `validationCount` e `improvementCount` não utilizados.
- Tipagem explícita `GraphEntity` para a entidade criada por `createDiscoveryEntity()` antes do acesso a `updatedAt`.
- Preserva `type: discoveryCreate` para compatibilidade com o contrato de UX Truth pré-Journey.

## Escopo
- `VERSION` e `package.json.version` permanecem `1.20.1`.
- O sufixo `H1` identifica somente o hotfix de compilação.
- Nenhuma regra de negócio, schema ou UX foi alterada.

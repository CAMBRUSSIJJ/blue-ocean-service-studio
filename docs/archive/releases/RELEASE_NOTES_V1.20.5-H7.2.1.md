# V1.20.5-H7.2.1 — Typecheck Cleanup

Hotfix mínimo sobre H7.2 para os diagnósticos reais enviados pelo `tsc --noEmit`.

## Corrigido

- `NeedsView.tsx`: removida constante `blankDraft` sem uso.
- `PersonasView.tsx`: removidos `Link2`, `GraphEntity` e `blankDraft` sem uso.
- `WorkspaceLibraryView.tsx`: removida comparação impossível `page === 'personas'` no renderer genérico, já que Personas é delegada para `PersonasView` antes desse trecho.

## Preservado

- Personas 2.0.
- Necessidades 2.0.
- Relações canônicas no Service Graph.
- Routing H6.
- Sidebar e Wave H7.0.x.

## QA

- H7.2.1 smoke: 7/7 PASS.
- Regressão `npm run qa`: 1421 OK / 0 FAIL.
- Preflight Linux: PASS.

## Gate externo necessário

Rodar no Linux:

```bash
npm ci
npm run typecheck
npm run build
```

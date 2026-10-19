# V1.20.5-H7.23-H1 — Journey Typecheck Cleanup

## Corrigido

- Remove `collapsedRows` do destructuring de `JourneyView.tsx`, onde não era mais lido após a H7.23.
- Preserva `collapsedRows` no `useStudioController`, pois ele continua sendo a fonte de verdade de `rowVisible`.
- Nenhuma mudança de UX, dados ou comportamento do Journey Editor.

## Erro corrigido

```text
src/views/JourneyView.tsx:40:69 - error TS6133: 'collapsedRows' is declared but its value is never read.
```

## Validação

O smoke H7.23-H1 verifica que a referência morta saiu da view e que a lógica de linhas colapsadas continua no controller.

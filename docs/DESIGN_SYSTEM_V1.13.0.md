# BLUE OCEAN Design System V1.13.0

## Objetivo
Uma única linguagem visual para toda a plataforma sem substituir runtimes funcionais.

## Camadas
1. `src/design-system/tokens.css` — cores, tipografia, spacing, radius, shadows, controles e layout.
2. `src/design-system/components.css` — componentes semânticos permanentes `bo-*`.
3. `src/design-system/legacy-compat.css` — bridge temporário para módulos históricos continuarem funcionais enquanto migram para componentes semânticos.
4. `src/components/ui/index.tsx` — primitives React para novas telas e refactors progressivos.

## Componentes disponíveis
`Button`, `IconButton`, `Input`, `Select`, `Textarea`, `Card`, `StatusBadge`, `EmptyState` e classes CSS para `PageHeader`, `Toolbar`, `Tabs`, `Dialog`, `Drawer`, `Inspector`, `Table`, `Skeleton`.

## Regras
- novas telas não devem criar paleta própria;
- estados semânticos usam success/warning/danger/info;
- azul é interação, navy é hierarquia/estrutura;
- turquesa é acento limitado, não cor de todos os controles;
- foco de teclado sempre visível;
- respeitar `prefers-reduced-motion`;
- preservar contratos DOM/handlers de runtimes legados até migração controlada.

## Compatibilidade
Os identificadores `rt*`, `RealTalentRuntime`, chaves `realtalent-*` e contratos de persistência permanecem intocados. A V1.13.0 é uma evolução visual/estrutural, não uma migração de dados.

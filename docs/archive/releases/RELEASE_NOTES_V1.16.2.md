# BLUE OCEAN Service Studio V1.16.2 — Design System v4 & Board Token Convergence

## Adicionado
- Design Tokens v4 com escala tipográfica 11/12/13/14/16/20/28, tokens de ícone, overlay e camadas.
- Facade único de ícones baseado em Lucide (`src/design-system/icons.ts`).
- Primitives React `Chip`, `Field`, `Tabs`, `Tab` e `Skeleton`.
- Página interna de QA visual em `?design-system=1`.
- Gate `design:v4:smoke`.

## Melhorado
- Whiteboard passou a consumir tokens semânticos BLUE OCEAN para canvas, superfície, bordas, texto e foco.
- Tipografia mínima de 11 px permanece como regra de produto.
- Componentes permanentes receberam estados/hints/chips/tooltips e utilitários de layout.
- Imports React de ícones foram centralizados no Design System.

## Corrigido
- Removida a paleta estrutural Slate/blue paralela do CSS do Whiteboard.
- Removidos `!important` de propriedades puramente visuais em camadas de compatibilidade; permanecem apenas os necessários para geometria/visibilidade legada.
- Custom properties `--rt-*` deixaram de carregar `!important`.

## Removido
- Tokens tipográficos de 10 px.
- Dependência direta de `lucide-react` nos componentes/views de produto (agora passa pela facade do Design System).

## Preservado
- Service Graph Schema V3, IDs `rt*`, chaves legadas, persistência e migrações.
- V1.16.1 Inspector, Readiness e toolbar contextual.

## Pendente
- Eliminar os `!important` restantes ligados à geometria do overlay legado requer convergir o Whiteboard para módulo React do app (F0.4).
- Substituir todos os glifos textuais remanescentes do runtime por ícones vetoriais pode ser feito sem pressa na V1.16.3/1.17.

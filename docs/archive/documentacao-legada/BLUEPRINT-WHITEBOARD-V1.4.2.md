# Blueprint Whiteboard V1.4.2

## Objetivo

Transformar o Blueprint de formulário rígido em ambiente visual de modelagem, mantendo o Service Graph como fonte de verdade.

## Modos

- **Whiteboard:** modelagem livre, objetos, frames, conexões e Inspector contextual.
- **Blueprint estruturado:** visão clássica de Evidências → Ações do Cliente → Frontstage → Backstage → Processos de Suporte.

## Ferramentas do Whiteboard

- Seleção simples e múltipla.
- Pan e zoom.
- Post-it, texto, forma e frame.
- Evidência, Frontstage, Backstage, Processo e Sistema como objetos semânticos.
- Etapa, Touchpoint, Problema e Oportunidade como objetos inteligentes ligados ao Service Graph.
- Drag, resize, duplicar, excluir, copiar/colar, alinhamento e distribuição horizontal.
- Conexões com legenda, linha contínua/tracejada e direção.
- Inspector lateral contextual.
- Trazer Jornada para o quadro.
- Criar faixas tradicionais de Service Blueprint dentro do canvas livre.

## Princípio de arquitetura

O Service Graph contém os objetos do serviço. O Whiteboard contém a representação visual. Um objeto inteligente referencia o ID da entidade no Service Graph; mover um card não duplica nem altera a entidade de negócio.

## Próxima evolução sugerida

V1.4.3 — Templates & Smart Layout: snap/grid, auto-layout, agrupamento persistente, minimapa, múltiplos quadros e conversão assistida entre Whiteboard, Blueprint, Fluxo e Journey.

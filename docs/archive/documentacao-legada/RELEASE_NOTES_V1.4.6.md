# Release Notes — V1.4.6 Whiteboard Connections Engine

## Objetivo

Transformar a conexão de objetos de uma ação auxiliar em um motor de modelagem visual reutilizável pelo Blueprint, Journey, Fluxo e futuros mapas do Service Studio.

## Entregue

- Quatro handles por objeto: top/right/bottom/left.
- Drag-to-connect com preview visual.
- Detecção do lado de destino.
- Quick Create ao soltar a conexão em espaço vazio.
- Tipos de rota: curve, straight e orthogonal.
- Persistência de `fromHandle`, `toHandle`, `route` e `waypoint`.
- Reconexão de origem/destino por endpoint.
- Reroute manual com waypoint.
- Label clicável e editável no Inspector.
- Linha solid/dashed e direção end/both/none preservadas.
- Migração automática de edges legados.

## Compatibilidade

Projetos V1.4.5, V1.4.4 e V1.4.3 continuam usando o mesmo Service Graph. Conexões antigas recebem defaults não destrutivos no carregamento/salvamento.

# Presentation & Workshop — V1.9.4

## Princípio
Camadas e cenários são metadados de leitura do mesmo Service Graph. Eles não criam cópias independentes do serviço.

## Layers
`experience`, `research`, `friction`, `improvement`, `operation`, `measurement`.

A API `serviceLayers.itemVisible()` participa do pipeline `itemPassesActiveView()` do Whiteboard, portanto a visibilidade afeta canvas, conexões e exportação respeitando filtros.

## Scenarios
`service.scenarios` contém os metadados dos cenários. `service.scenarioState` controla `all`, `single` e `compare`. Cada entidade pode usar `scenarioIds`; registros legados continuam compatíveis via `experienceState` (`current`, `future`, `both`).

## Runtime
API registrada: `RealTalentRuntime.api('serviceLayers')`.

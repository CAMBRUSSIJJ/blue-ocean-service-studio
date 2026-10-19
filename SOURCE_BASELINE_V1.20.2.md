# Source Baseline — V1.20.2

## Baseline
A V1.20.2 foi construída sobre **Blue-Ocean-Service-Studio-V1.20.1-H1-Source**.

## Motivação
A mudança foi priorizada após revisão do fluxo real em gravação de tela. O problema principal observado era a competição entre:
- fluxo por fases (Entender → Definir → Desenhar → Validar → Melhorar);
- fluxo por ferramentas/objetos (Whiteboards, Journeys, Personas, Problemas, Pesquisa etc.);
- editores extensos embutidos na Service Home.

## Decisão
Introduzir uma camada de navegação de conhecimento do serviço — **Service Context Library** — sem criar armazenamento paralelo.

## Fonte de verdade
- Service Graph continua canônico.
- Service Project continua responsável pelo ciclo e pela Definition.
- Context Library navega/edita Graph Entities existentes.
- Whiteboard representa os mesmos objetos por Smart Objects.

## Compatibilidade
- `schemaVersion = 3`.
- `ServiceProjectState.version = 1`.
- Nenhuma coleção duplicada de Persona/Need/Job/Pain/Hypothesis/Problem/Evidence foi adicionada.

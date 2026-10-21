# V1.19.6 — Service Project Foundation

## Objetivo
Transformar o Service Project em uma estrutura canônica persistida, sem duplicar os objetos do Service Graph e sem mudar o schema principal V3.

## Adicionado
- `ServiceProjectState` persistido em `service.project`.
- Fases canônicas: Discovery, Definition, Design, Validation e Improvement.
- Definition foundation: promessa, outcome, escopo, início/fim e princípios.
- `service-project.ts` com factory, normalização, transição de fase e relatório derivado.
- Migração transparente de projetos V3 antigos que ainda não possuem `service.project`.
- Normalização equivalente no runtime JS/Data Bridge.
- Validação de ownership e de fase na camada de integridade.
- Home passa a ler progresso das cinco fases a partir do Service Project report.

## Regra de arquitetura
O Service Project NÃO mantém listas duplicadas de Personas, Necessidades, Problemas ou Evidências. Esses objetos permanecem no Service Graph; o projeto mantém estado de ciclo e definição, enquanto os relatórios derivam o progresso a partir das coleções canônicas.

## Compatibilidade
- `schemaVersion` permanece 3.
- Projetos existentes recebem `service.project` automaticamente ao carregar.
- Workspace ainda não inicializado continua sem Service Project até um serviço ser criado.

## Fora de escopo desta versão
- Editor completo da fase Definir (V1.20.1 no roadmap).
- Persona Studio completo.
- Problem & Evidence Studio completo.
- Redesign final da Service Home (V1.19.7).

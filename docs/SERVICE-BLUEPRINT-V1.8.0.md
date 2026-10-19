# Service Blueprint 1.0 — V1.8.0

## Princípio arquitetural

`Etapa` é uma entidade compartilhada entre Journey e Blueprint. A visualização Blueprint adiciona apenas a camada operacional e seu layout.

## Matriz

- Coluna = Etapa
- Lane = camada operacional
- Cell = Etapa × camada

Camadas: Evidências, Cliente, Frontstage, Backstage, Processos e Sistemas.

## Linhas do serviço

1. Linha de interação — Cliente ↔ Frontstage.
2. Linha de visibilidade — Frontstage ↔ Backstage.
3. Linha de interação interna — Backstage ↔ Processos/Sistemas.

## Blueprint Studio

- responsável e status;
- visibilidade das lanes;
- cobertura operacional por etapa;
- adição contextual de objetos;
- etapas compartilhadas com o Journey Studio;
- owner/SLA no Inspector de objetos operacionais;
- entrada/saída em Processos.

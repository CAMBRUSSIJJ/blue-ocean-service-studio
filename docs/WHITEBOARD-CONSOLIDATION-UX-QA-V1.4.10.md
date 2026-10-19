# V1.4.10 — Whiteboard Consolidation & UX QA

## Decisões arquiteturais congeladas

1. **Entity** vive no Service Graph.
2. **Instance** é a ocorrência visual de uma entidade ou objeto livre em um quadro.
3. **View Layout** guarda posição, tamanho, ordem e parent visual por visualização.
4. Trocar Livre / Fluxo / Journey / Blueprint não duplica a entidade.
5. Blueprint é uma matriz bidimensional: Etapas nas colunas e camadas do serviço nas linhas.
6. Containment manual por Frame/Section/Swimlane é responsabilidade da view Livre; views semânticas organizam por schema.

## Blueprint Matrix

Linhas padrão:
- Evidências
- Ações do cliente
- Frontstage
- Backstage
- Processos
- Sistemas

Cada objeto pode guardar `blueprintStageId` e `blueprintLane` para definir sua célula.

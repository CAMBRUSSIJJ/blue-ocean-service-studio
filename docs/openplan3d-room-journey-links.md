# Blue Ocean — salas físicas vinculadas à jornada (prévia)

## Objetivo
Associar ambientes desenhados no OpenPlan3D a etapas existentes das jornadas,
sem converter, sobrescrever ou mover a geometria e sem alterar a simulação 3D
operacional anteriormente integrada.

## Fluxo
1. Em **Ambientes físicos → Editor CAD**, desenhe uma sala com paredes fechadas.
2. O motor OpenPlan3D reconhece a sala e transmite **somente os dados de
   visualização** (pavimento, paredes da fronteira, nome, área e seleção).
3. No painel **Ambiente e jornada**, escolha a sala reconhecida ou clique nela
   na planta 2D. Selecione uma etapa real da jornada.
4. Preencha atividade, responsável, recursos, tempo estimado, capacidade e
   problema/necessidade. Clique **Salvar vínculo**.
5. O Blue Ocean persiste o vínculo no `ServiceGraph.service.cadRoomLinks`,
   de modo independente de `service.cadPlans` e `service.spatialDesign`.
6. **Abrir jornada relacionada** leva à jornada original, sem criar uma cópia.

## Contratos
- `cadRoomKey(floorId, wallIds)`: chave por pavimento e IDs ordenados das
  paredes do perímetro. IDs efêmeros da detecção nativa do OpenPlan3D **não
  são usados como chave persistente**.
- Identidade, mapa, pavimento, paredes existentes e etapa da jornada passam
  por validação antes da transação. Para planta geral, aceita qualquer etapa de
  uma jornada do serviço; para mapa específico, apenas etapas daquele mapa.
- O vínculo é editável e pode ser removido sem excluir a sala ou os dados CAD.
- Mudanças na composição das paredes podem mudar a identidade da sala;
  o vínculo anterior não é descartado automaticamente: poderá precisar de
  reassociação explícita. A interface não deve inventar uma associação nova.
- Não há simulação de movimento, sincronização automática de mobiliário ou
  cálculo operacional por IA nesta fase.
- A ponte recebe eventos `room-context` do iframe com verificação da origem
  e sessão, limite de 120 salas por pavimento e dados limitados por campo.
- A própria ferramenta CAD conserva o controle de paredes, móveis, portas,
  zoom, seleção, persistência e navegação 2D/3D.

## Validação
- Testar `npm run openplan:smoke`, TypeScript, build e QA do repositório.
- No navegador, selecionar uma sala, salvar vínculo, editar os campos,
  alternar 2D/3D, fechar e reabrir o projeto; depois desvincular e confirmar
  que a geometria permanece intacta.
- Conferir também vários mapas, várias salas no mesmo pavimento,
  outros pavimentos, edição de paredes de uma sala vinculada, backups e
  portabilidade do grafo.
- **Não publicar em Production** antes de validar o fluxo com uma planta real
  no Firefox do computador de uso.

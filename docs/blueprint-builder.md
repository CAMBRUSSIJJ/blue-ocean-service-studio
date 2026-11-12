# Blueprint: cartões e criação contextual

O editor incorpora a referência visual `service_blueprint_builder.tsx` no documento existente de Jornada/Blueprint. A Home, o cabeçalho global e a sidebar H7.65 continuam iguais.

- Cartões com tipografia e bordas suaves; controles aparecem por seleção, foco ou interação.
- A célula destaca seu destino ao passar o ponteiro. O botão de adicionar aparece também por foco e permanece visível no toque.
- Adicionar abre diretamente o nome do cartão, na etapa e faixa escolhidas; Enter confirma e Esc ou clique fora cancelam.
- Mais opções contém descrição e tipos compatíveis com a faixa; trocar o tipo mantém o texto digitado.
- A célula aceita novos cartões mesmo quando já contém itens, com espaço reservado para o botão.
- O painel Faixas usa ícones de visibilidade e permanece aberto durante sua edição; esconder uma faixa preserva seus cartões.
- Linha de frente, bastidores e sistemas/apoio continuam separados, com linhas de interação, visibilidade e interação interna.

Os dados continuam no Service Graph existente, com o mesmo histórico, IDs, conexões, salvamento e exportação. Nenhum conteúdo de demonstração do arquivo de referência foi incorporado.

## Verificar

- `npm run blueprint:canvas:test`
- `npm run journey:cards:test`
- `npm run blueprint:connections:test`
- `npm run blueprint:builder:browser`
- `npm run blueprint:canvas:browser`

Os testes de navegador usam o build real e salvam capturas em `artifacts/blueprint-builder` e `artifacts/blueprint-canvas`. A suíte completa ainda possui o bloqueio de QA legado documentado em `salas-production.md`.

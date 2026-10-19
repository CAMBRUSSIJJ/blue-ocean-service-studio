# Whiteboard Editing Productivity — V1.5.0

## Princípio
O Whiteboard passa de um editor funcional para uma ferramenta de edição repetitiva e previsível.

## Histórico
O histórico mantém até 80 estados por sessão/quadro e ignora mudanças que não alteram conteúdo estrutural.

## Clipboard
A seleção é serializada como um subgrafo visual: items, edges internas, parent relationships e group relationships. Ao colar, IDs são regenerados e Smart Objects preservam a referência à entidade do Service Graph.

## Command Palette
Ctrl/Cmd+K permite executar criação, edição, navegação e troca de view sem procurar botões.

## Menu contextual
Botão direito adapta as ações a canvas, item e conexão.

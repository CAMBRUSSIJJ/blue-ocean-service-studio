# Whiteboard V1.4.8 — Infinite Canvas & Navigation

## Princípio

Navegação não deve competir com edição. O usuário pode percorrer um quadro grande sem trocar permanentemente de modo e sem perder o contexto estrutural.

## Modelo de viewport

A viewport possui:

- `pan.x` / `pan.y`;
- `zoom`;
- board ativo;
- seleção atual.

A navegação é independente da posição persistida dos objetos.

## Zoom no cursor

Ao alterar zoom, o ponto do mundo localizado sob o cursor é preservado visualmente. Isso evita o comportamento de zoom que "foge" do usuário.

## Outline

O Outline não é o painel de Camadas. Camadas serve para ordem, visibilidade e bloqueio. Navegação serve para **encontrar e chegar até um objeto**.

A árvore usa as relações de container já existentes na V1.4.7.

## Histórico

O histórico da viewport é intencionalmente separado do futuro Undo/Redo de edição. Voltar na navegação não desfaz conteúdo; apenas retorna a uma posição visual anterior.

Essa separação será importante na V1.5.0, quando o histórico de edição ganhar seu próprio motor robusto.

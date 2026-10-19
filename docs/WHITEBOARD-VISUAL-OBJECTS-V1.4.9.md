# RealTalent Service Studio — V1.4.9 Visual Objects

A V1.4.9 fecha a camada de objetos visuais básicos do Whiteboard antes da etapa de produtividade do roadmap.

## Objetos visuais

- Texto com variantes Título, Subtítulo, Corpo e Legenda; alinhamento, negrito e itálico.
- Post-it com estado concluído, tags e três tamanhos.
- Card com título, descrição, badge e status.
- Formas: retângulo, arredondado, círculo e losango.
- Imagem com upload, compressão local, resize e legenda.
- Link com título, URL e domínio.
- Arquivo como referência visual com nome, tipo e tamanho.
- Ícones/símbolos com seletor visual.

## Entrada de conteúdo

- Drag & drop de imagens e arquivos no canvas.
- Drag & drop de URL para criar Link.
- Paste de imagem diretamente no quadro.
- Paste de URL para criar Link.
- Paste de texto para criar objeto Texto.

## Arquitetura

Os novos objetos permanecem no mesmo `board.items` do motor existente. Cada objeto livre recebe `visualKind`, mantendo `kind`, `semantic`, `x/y`, `width/height`, `z`, containers, conexões e persistência já existentes. Essa separação prepara a V1.5.3, em que uma instância visual poderá apontar para uma entidade do Service Graph sem confundir dados semânticos e apresentação.

## Compatibilidade

Projetos V1.4.8 e anteriores são normalizados ao carregar. Objetos antigos `note`, `text` e blocos operacionais continuam válidos e recebem uma interpretação visual compatível sem migração destrutiva.

## Limites deliberados

Arquivos comuns são salvos como referência/metadados no projeto local; não são embutidos integralmente para evitar esgotar o `localStorage`. Imagens são redimensionadas/comprimidas antes de persistir.

# Release Notes — V1.4.8 Infinite Canvas & Navigation

## Objetivo

Transformar a navegação do Whiteboard em uma camada reutilizável e previsível antes de ampliar os tipos de objetos visuais.

## Entregas

### Infinite Canvas
- Space+drag como navegação temporária.
- Hand tool contínua.
- Wheel/trackpad para pan.
- Shift+wheel para pan horizontal.
- Zoom centrado no cursor.
- Zoom 15%–300%.

### Viewport shortcuts
- Ctrl/Cmd+0: Fit All.
- Ctrl/Cmd+1: 100% mantendo o centro visual.
- Ctrl/Cmd+2: Fit Selection.
- F: Fit All.

### Minimap
- Escala baseada no conteúdo + viewport.
- Viewport visível dentro do minimapa.
- Clique e drag para navegação.
- Containers representados de forma distinta.
- Preferência por quadro para mostrar/ocultar o mapa.

### Outline & Find
- Painel Navegação dedicado.
- Árvore hierárquica por containers.
- Busca por conteúdo e tipo.
- Ctrl/Cmd+F e `/`.
- Focus object com expansão dos ancestrais.

### Breadcrumbs
- Caminho do quadro até o objeto atual.
- Navegação clicável entre níveis.

### Navigation history
- Voltar e avançar no histórico da viewport.
- Alt+Left / Alt+Right.
- Estado inclui board, pan, zoom e seleção.

## Compatibilidade

A V1.4.8 migra preferências a partir da V1.4.7 e mantém o mesmo Service Graph e o mesmo armazenamento dos whiteboards.

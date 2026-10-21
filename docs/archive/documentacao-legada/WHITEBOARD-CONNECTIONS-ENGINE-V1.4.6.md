# Whiteboard Connections Engine V1.4.6

## Modelo da conexão

Cada edge agora possui:

- `fromId` / `toId`
- `fromHandle` / `toHandle`
- `route`: `curve`, `straight` ou `orthogonal`
- `waypoint`: desvio manual opcional
- `style`: `solid` ou `dashed`
- `arrow`: `end`, `both` ou `none`
- `label`

## Fluxos principais

### Drag-to-connect
Arraste qualquer handle azul de um card e solte sobre outro objeto.

### Quick Create
Se a conexão for solta no vazio, o menu de criação rápida oferece Processo, Sistema, Frontstage, Backstage, Pessoa e Post-it. O objeto é criado na posição do drop e já recebe a edge.

### Reconnect
Ao selecionar uma conexão, os dois endpoints ficam visíveis. Arraste uma ponta para outro card para trocar origem ou destino.

### Reroute
O handle violeta permite gravar um waypoint manual. Em curva ele atua como ponto de controle; em reta cria um desvio; em ortogonal define o eixo de passagem.

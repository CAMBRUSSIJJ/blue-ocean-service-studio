# Release Notes — V1.4.5 Whiteboard Interaction Core

## Objetivo

Consolidar a manipulação do Whiteboard antes da expansão para Connections Engine, Frames & Structure e demais módulos do Service Studio.

## Novidades

### Seleção
- Lasso selection no espaço vazio do canvas.
- Ctrl/Cmd/Shift preserva seleção existente durante o laço.
- Ctrl/Cmd/Shift + clique adiciona ou remove objetos da seleção.
- Ctrl/Cmd + A seleciona os objetos visíveis do quadro.

### Camadas
- Novo painel **Camadas** na toolbar.
- Ordem visual persistente por objeto.
- Avançar, recuar, trazer à frente e enviar ao fundo.
- Mostrar/ocultar objeto.
- Bloquear/desbloquear objeto.

### Manipulação
- Objetos bloqueados podem ser selecionados e inspecionados, mas não podem ser movidos, redimensionados ou excluídos diretamente.
- Delete preserva objetos bloqueados dentro de uma seleção múltipla.
- Setas movem a seleção em 1 px; Shift + setas move em 10 px.

### Alinhamento
- Esquerda, centro horizontal e direita.
- Topo, centro vertical e base.
- Distribuição horizontal e vertical.
- A toolbar contextual da seleção múltipla foi ampliada.

### Compatibilidade
- Migração automática das preferências V1.4.4 e V1.4.3 para a chave V1.4.5.
- Service Graph e whiteboards existentes continuam na mesma chave de dados.

## Próxima etapa prevista

V1.4.6 — Connections Engine: conectores por handles em quatro lados, linhas reta/ortogonal/curva, reroute, reconnect e quick-create no final da conexão.

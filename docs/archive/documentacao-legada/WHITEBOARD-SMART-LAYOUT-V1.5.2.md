# Whiteboard Smart Layout — V1.5.2

## Objetivo

Organizar automaticamente objetos do Whiteboard sem converter o quadro em uma ferramenta rígida e sem perder o trabalho manual do usuário.

## Layouts

### Grade
Distribui objetos em uma malha balanceada.

### Linha
Organiza todos os objetos horizontalmente.

### Coluna
Empilha verticalmente.

### Fluxo
Usa conexões existentes para determinar a ordem sempre que possível. Ciclos e objetos desconectados são preservados com fallback estável.

### Árvore
Usa as conexões para calcular níveis de hierarquia. Objetos sem relação recebem níveis de fallback.

### Journey
Usa Etapas do Service Graph como colunas e tipos de objeto como lanes.

### Swimlane
Agrupa por camadas do serviço: Evidência, Cliente, Frontstage, Backstage, Processo e Sistema.

### Radial
Distribui a seleção ao redor de um centro comum.

## Escopo

- Seleção atual;
- Quadro inteiro.

Containers são tratados como limites estruturais. Objetos de pais diferentes são organizados dentro do próprio container em vez de serem reparentados.

## Espaçamento

- Compacto;
- Equilibrado;
- Amplo.

## Segurança do layout

Antes de aplicar um layout, a versão salva um snapshot contendo:

- posição;
- tamanho;
- parentId;
- containers ancestrais que possam ser redimensionados;
- view ativa;
- conjunto original de objetos-alvo.

`Restaurar layout anterior` reaplica esse snapshot sem recriar entidades ou conexões.

## Integrações de UX

- Toolbar: Smart Layout;
- `Shift + L`;
- Command Palette;
- menu contextual do canvas;
- menu contextual da seleção;
- Inspector do quadro.

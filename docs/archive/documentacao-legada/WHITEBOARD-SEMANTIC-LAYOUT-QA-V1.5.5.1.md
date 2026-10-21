# V1.5.5.1 — Whiteboard Semantic & Layout QA

## Objetivo

Fechar inconsistências observadas no uso real da V1.5.5 antes de criar Import / Export.

## Contratos

### Visual Type
Como a instância é desenhada: Card, Post-it, Texto, Shape, Imagem etc.

### Semantic Type
O que a instância significa no serviço: Etapa, Ponto de contato, Evidência, Ação do cliente, Frontstage, Backstage, Processo, Sistema, Problema, Insight, Oportunidade etc.

### Regra
Mudar aparência não muda significado. Mudar View não duplica entidades.

## Flow Layout

1. localizar componentes conectados;
2. calcular níveis por direção das edges;
3. distribuir cada componente sem colisão;
4. separar objetos sem conexão;
5. rotear as edges de acordo com a orientação horizontal/vertical;
6. preservar as relações reais — a View não inventa edges.

## Semantic Zoom

- >= 80%: conteúdo completo;
- 50–79%: conteúdo compacto;
- 30–49%: identificação mínima;
- < 30%: leitura estrutural, removendo detalhes secundários.

## Templates

Templates operacionais e de Blueprint não geram mais somente Cards livres. Eles podem materializar entidades no Service Graph e inserir instâncias visuais vinculadas.

# V1.5.4 — Whiteboard Visualizations Engine

## Objetivo

Formalizar Livre, Fluxo, Journey e Blueprint como quatro projeções visuais sobre o mesmo conjunto de entidades e instâncias.

## Regras

1. **View não é dado**: trocar de View não duplica entidades.
2. **View não inventa relações**: o modo Fluxo nunca cria conexões automaticamente.
3. **Layout é local à View**: `meta.viewLayouts[boardId][view]` guarda posição, tamanho, z-order e parent.
4. **Conteúdo é canônico**: títulos, descrições e propriedades de Smart Objects continuam no Service Graph.
5. **Instância é compartilhada pelas Views**: uma instância pode assumir posições diferentes em cada View sem virar uma cópia.

## Livre

- posição manual;
- frames/sections/containers livres;
- canvas de workshop e exploração.

## Fluxo

- lê `board.edges` existentes;
- calcula níveis topológicos;
- posiciona objetos por nível e ramificação;
- fallback sem conexões usa ordem de Etapas/posição existente;
- horizontal ou vertical;
- não cria edges como efeito colateral da troca de View.

## Journey

Colunas: Etapas da jornada.

Informação derivada da Etapa:
- ação do cliente.

Lanes:
- Touchpoints;
- Evidências;
- Problemas;
- Oportunidades;
- Outros objetos.

## Blueprint

Colunas: Etapas.

Lanes:
- Evidências;
- Ações do cliente;
- Frontstage;
- Backstage;
- Processos;
- Sistemas.

Separadores:
- Linha de interação;
- Linha de visibilidade;
- Linha de interação interna.

## Visualizations Engine

O modal central mostra:
- número de entidades;
- número de instâncias;
- as quatro Views;
- existência e tamanho do layout salvo de cada View;
- abrir View;
- reorganizar View sem alterar dados.

# Whiteboard Frames & Structure — V1.4.7

## Objetivo

Transformar os antigos frames gráficos em primitives estruturais reutilizáveis pelo futuro Journey, Blueprint, Process Map e demais visualizações do Service Studio.

## Modelo estrutural

Todo container continua sendo um item do Whiteboard (`shape: frame`), mas passa a possuir propriedades semânticas adicionais:

- `containerType`: `frame`, `section` ou `swimlane`;
- `padding`;
- `autoResize`;
- `collapsed`;
- `expandedHeight` quando necessário.

A relação pai-filho continua persistida no metadata do Whiteboard, agora aceitando também containers como filhos de outros containers.

## Hierarquia

A V1.4.7 suporta:

```text
Section
├── Frame
│   ├── Processo
│   └── Sistema
└── Swimlane
    ├── Frontstage
    └── Backstage
```

Ciclos são impedidos: um container nunca pode se tornar filho de um descendente seu.

## Movimento

Mover um container move toda a sua subárvore. Um filho bloqueado não pode ser movido diretamente, mas acompanha o container-pai para preservar a estrutura espacial.

## Collapse / Expand

Ao recolher um container:

- apenas o cabeçalho permanece visível;
- descendentes deixam de ser renderizados;
- edges associadas aos descendentes deixam de aparecer;
- minimapa e Fit ignoram os descendentes ocultos estruturalmente;
- nenhum dado é apagado.

Ao expandir, o tamanho anterior é restaurado.

## Auto-resize

Auto-resize trabalha de forma não destrutiva:

- um filho próximo à borda pode expandir o container;
- o container não encolhe automaticamente a cada movimento;
- `Ajustar ao conteúdo` realiza o fit explícito e pode reduzir largura/altura;
- mover um filho muito para fora desanexa o objeto do container.

## Layers

O painel Camadas passa de uma lista plana para uma árvore. Ele mostra:

- profundidade hierárquica;
- Frame / Section / Swimlane;
- collapse / expand;
- visibilidade;
- lock;
- z-order.

## Exclusão

Um container selecionado oferece duas ações:

1. **Excluir container (preservar conteúdo)**: remove somente o container e promove seus filhos para o pai anterior ou para a raiz.
2. **Excluir container + conteúdo**: remove toda a subárvore e edges que dependem dela.

## Duplicação

Duplicar um container duplica sua subárvore, mantém a estrutura relativa e copia edges cujas duas pontas pertençam à árvore duplicada.

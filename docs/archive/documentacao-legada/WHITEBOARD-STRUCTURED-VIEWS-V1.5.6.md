# Whiteboard Structured Views — V1.5.6

## 1. Grid estruturado
Cada visualização estruturada passa a expor três primitives:
- Column: normalmente uma Etapa.
- Lane: uma dimensão de experiência/operação.
- Cell: interseção Column × Lane, com os IDs das instâncias que pertencem àquele contexto.

## 2. Jornada
Lanes base:
- Pontos de contato
- Evidências
- Problemas
- Oportunidades
- Outros objetos

## 3. Blueprint
Lanes base:
- Evidências
- Ações do cliente
- Ação visível / Frontstage
- Ação de bastidor / Backstage
- Processos
- Sistemas

## 4. Filtros
Os filtros são transitórios e pertencem à leitura da View. Não alteram entidades nem relações.
Critérios suportados:
- busca textual;
- tipo semântico;
- etapa;
- origem (vinculado/livre);
- responsável;
- tags.

## 5. Saved Views
Uma visão salva persiste:
- nome;
- tipo de visualização;
- filtros;
- visibilidade;
- zoom e pan.

## 6. Linked Object
Objeto visual que referencia:
- Whiteboard;
- Journey;
- entidade do Service Graph.

O card funciona como navegação entre níveis do modelo sem duplicar dados.

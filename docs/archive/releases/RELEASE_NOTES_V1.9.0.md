# V1.9.0 — Visual Architecture Reset

A V1.9.0 consolida a arquitetura visual do editor antes da próxima expansão funcional.

## Editor Shell 2.0
- header reduzido a contexto, visualização e ações essenciais;
- ferramentas secundárias agrupadas em `Ferramentas`;
- paleta de comandos acessível diretamente pelo header;
- build V1.9.0 visível no editor.

## Creation Rail
- barra esquerda compacta inspirada em ferramentas de canvas profissionais;
- Selecionar, Adicionar, Texto, Post-it, Conexão, Frame, Buscar e Camadas;
- navegação por mão continua disponível via Espaço/pan, sem ocupar um botão permanente.

## Context Toolbar
- selecionar um card não abre mais o Inspector automaticamente;
- toolbar contextual aparece perto do objeto;
- Smart Objects oferecem `Próximo`, além de Conectar, Duplicar, Propriedades e Mais ações;
- duplo clique continua abrindo edição profunda.

## Inspector sob demanda
- Inspector mantém Essencial, Relações, Aparência e Avançado;
- quando fechado, um handle discreto permite abri-lo;
- o canvas continua dominante durante seleção e navegação.

## Cards 2.0
- superfície neutra para Smart Cards;
- cor semântica passa a ser acento lateral, não fundo completo;
- ações internas redundantes ficam ocultas;
- handles aparecem somente em hover/seleção;
- hierarquia de tipo, título e contexto mais calma.

## Journey Grid 2.0
- matriz de Jornada/Blueprint recebe cabeçalhos e lanes mais limpos;
- células e divisórias usam contraste mais baixo;
- etapas continuam estruturadas e semanticamente ligadas ao Service Graph.

## Diálogos unificados
- removidos `window.prompt` e `window.confirm` do Whiteboard runtime;
- salvar visualização, criar entidade, link, restauração, importação, arquivamento e reparo usam diálogos do Design System.

## Preservado
Service Graph, Journey Management, Guided Builder, Smart Flow, Stage Flow Builder, continuidade entre etapas, Current × Future, Emotion Curve, evidências, personas, Journey Hierarchy, Blueprint Health, Whiteboard Core, persistência, recuperação, Import/Export e templates.

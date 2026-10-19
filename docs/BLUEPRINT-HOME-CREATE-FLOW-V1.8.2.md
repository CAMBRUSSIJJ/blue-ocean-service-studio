# Blueprint Home + Create Flow — V1.8.2

## Princípio

O Blueprint possui três níveis de experiência:

1. **Global Shell** — navegação entre módulos.
2. **Blueprint Home** — localizar, continuar, criar e gerenciar Blueprints.
3. **Blueprint Editor** — modelar o serviço no Whiteboard Core.

A Home não é um novo motor de dados. Cada card aponta para um Whiteboard/Blueprint existente e mantém relações com Serviço e Jornada por IDs.

## Registro de Blueprint

Cada board possui um registro auxiliar em `meta.blueprintHome.records[boardId]` contendo:

- `boardId`;
- `name`;
- `serviceId`;
- `journeyId`;
- `owner`;
- `status`;
- `favorite`;
- `createdAt`;
- `updatedAt`;
- `lastOpenedAt`;
- `startMode`;
- `templateId` quando aplicável.

Os objetos do serviço continuam no Service Graph.

## Criação

### A partir da Jornada

Mantém as Etapas compartilhadas e, na primeira abertura, organiza no Blueprint os objetos de experiência já disponíveis no Graph.

### Em branco

Usa a matriz estrutural de Blueprint e as Etapas existentes, mas não materializa automaticamente todos os objetos da Jornada.

### Template

Quatro perfis iniciais:

- Service Blueprint essencial;
- atendimento;
- delivery;
- digital.

Todos geram Smart Objects reais no Service Graph.

### Duplicar existente

Clona board, grupos, hierarquia, layouts e Structured Views, removendo Saved Views duplicadas para evitar referências inesperadas.

## Navegação

`Blueprints` abre a Home. Ao abrir um card, o Whiteboard assume o board selecionado e ativa a View Blueprint. O botão de voltar do editor fecha a sessão e reabre a Blueprint Home sem reload completo do aplicativo.

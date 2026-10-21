# Roadmap do Whiteboard até o Core 1.0

- V1.4.5 — Interaction Core — entregue.
- V1.4.6 — Connections Engine — entregue.
- V1.4.7 — Frames & Structure — entregue.
- V1.4.8 — Infinite Canvas & Navigation — entregue.
- V1.4.9 — Visual Objects — entregue.
- **V1.5.0 — Editing Productivity — entregue nesta versão.**
- V1.5.1 — Template Engine — entregue.
- **V1.5.2 — Smart Layout — entregue nesta versão.**
- **V1.5.3 — Smart Objects / Service Graph — entregue.**
- V1.5.4 — Visualizations Engine — entregue.
- **V1.5.5 — Persistence & Reliability — entregue nesta versão.**
- V1.5.6 — Structured Views Foundation — entregue.
- V1.5.7 — Journey Primitives — entregue.
- V1.5.8 — Import / Export Engine — entregue.
- V1.5.9 — Performance & UX Polish — entregue.
- V1.6.0 — Whiteboard Core 1.0.

Enquanto este roadmap não for concluído, novas grandes áreas funcionais do Service Studio permanecem congeladas para evitar duplicação de motores de interação.

## V1.4.9 — entregue

- texto rico: título, subtítulo, corpo, listas e alinhamento;
- post-it com tamanhos, tags e checklist opcional;
- shapes: retângulo, círculo, capsule e diamond;
- card visual reutilizável;
- imagem por upload/paste com resize e caption;
- link preview;
- arquivo/documento;
- ícones essenciais;
- objetos visuais preparados para a futura conversão Free Object → Smart Object.

## Status V1.4.9

- [x] Visual Objects — Texto
- [x] Visual Objects — Post-it
- [x] Visual Objects — Card
- [x] Visual Objects — Shapes
- [x] Visual Objects — Imagem
- [x] Visual Objects — Link
- [x] Visual Objects — Arquivo
- [x] Visual Objects — Ícone
- [x] Paste / drag & drop básico
- [x] V1.5.0 — Editing Productivity


## V1.4.10 — Consolidation & UX QA — CONCLUÍDA
- Entity × Instance × View Layout
- Blueprint matriz Etapas × Camadas
- layout independente por view
- consolidação responsiva e de painéis
- feedback estrutural de containers

Próxima: **V1.5.4 — Visualizations Engine**.


## V1.5.0 — Editing Productivity — CONCLUÍDA
- Undo / Redo estrutural
- histórico navegável de edição
- clipboard completo com containers, grupos e conexões
- Cut / Copy / Paste / Duplicate
- menu de contexto
- Command Palette (Ctrl/Cmd+K)
- atalhos consolidados

Próxima: **V1.5.4 — Visualizations Engine**.


## V1.5.1 — Template Engine — CONCLUÍDA
- biblioteca pesquisável e categorizada
- templates parciais e de quadro inteiro
- salvar seleção/quadro como template
- variáveis de contexto
- preservação de containers, grupos e conexões

## V1.5.2 — Smart Layout — CONCLUÍDA
- Grade, Linha, Coluna, Fluxo, Árvore, Journey, Swimlane e Radial
- aplicação por seleção ou quadro inteiro
- três densidades de espaçamento
- Flow/Tree orientados por relações
- hierarquia de containers preservada
- snapshot e restauração segura
- integração com Command Palette, contexto e Shift+L

Próxima: **V1.5.4 — Visualizations Engine**.


## V1.5.3 — Smart Objects / Service Graph — CONCLUÍDA
- Entity → Instance → View Layout formalizado
- navegador do Service Graph
- edição canônica sincronizada entre instâncias
- Evidence / Process / System / Person / Insight como entidades
- conversão Free → Smart e detach Smart → Free
- backlinks / uso em quadros
- referências ausentes + reconexão
- duplicar instância separado de duplicar entidade

Próxima: **V1.5.4 — Visualizations Engine**.

## V1.5.4 — Visualizations Engine — CONCLUÍDA

- quatro Views sobre o mesmo Service Graph;
- Livre = manual;
- Fluxo = relações;
- Journey = Etapas × Experiência;
- Blueprint = Etapas × Operação;
- layout independente por View;
- Flow sem criação automática de edges;
- Journey Matrix estruturada;
- Visualizations Engine para navegar/reorganizar Views.

**Próxima:** V1.5.5 — Persistence & Reliability.


## V1.5.5 — Persistence & Reliability — CONCLUÍDA

- autosave revisionado e consistente entre Graph/meta;
- mirror durável em IndexedDB;
- checkpoints rotativos;
- recovery automático;
- session heartbeat;
- Recovery Center;
- migrations formais.

**Próxima:** V1.5.6 — Import / Export.

## V1.5.5.1 — Semantic & Layout QA — CONCLUÍDA

Consolidação inserida antes de Import / Export após análise da gravação V1.5.5.

- Flow sem overlaps;
- componentes conectados;
- Visual Type × Semantic Type;
- Templates semânticos;
- semantic zoom;
- UX de seleção/histórico/terminologia consolidada.

**Próxima:** V1.5.6 — Import / Export Engine.


## Revisão após benchmark de Journey Management
- [x] V1.5.6 — Structured Views Foundation: Column / Lane / Cell, Linked Objects, Saved Views, Rich Filters e View Visibility.
- [x] V1.5.7 — Journey Primitives: Persona, Canal, Emotion, Emotion Curve, filtros por Persona e relações de experiência.
- [x] V1.5.8 — Import / Export Engine.
- [x] V1.5.9 — Performance & UX Polish.
- [x] V1.6.0 — Whiteboard Core 1.0 — **ENTREGUE / BASELINE ESTÁVEL**.


## V1.5.7 — Journey Primitives — CONCLUÍDA
- Persona como entidade do Service Graph;
- Canal como entidade e relação do Touchpoint;
- Emoção por Etapa × Persona;
- Emotion Curve na Journey View;
- 6 lanes / Structured Grid atualizado;
- filtros e Saved Views preparados para Persona;
- criação de nova Persona gera emoções neutras por etapa;
- UI/Inspector para emoção, canal e relações de persona.

**Próxima:** V1.6.0 — Whiteboard Core 1.0.


## V1.5.8 — Import / Export Engine — CONCLUÍDA
- backup completo e importação segura;
- SVG, PNG, PDF, JSON e CSV;
- exportação por quadro, seleção ou container.

## V1.5.9 — Performance & UX Polish — CONCLUÍDA
- viewport culling;
- semantic zoom otimizado;
- render por frame;
- stress test até 5.000 objetos;
- responsividade, acessibilidade e polish final.

**Próxima:** V1.6.0 — Whiteboard Core 1.0.


## V1.6.0 — Whiteboard Core 1.0 — CONCLUÍDA
- auditoria integrada dos contratos do Core;
- painel de saúde do Whiteboard;
- diagnóstico exportável;
- reparo estrutural seguro com checkpoint;
- preflight/release gate Linux;
- baseline estabilizada para reutilização por Journey, Blueprint, Process e futuros módulos.

**Whiteboard Core 1.0: roadmap concluído.**

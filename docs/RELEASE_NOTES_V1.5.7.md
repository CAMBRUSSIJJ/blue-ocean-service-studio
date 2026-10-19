# RealTalent Service Studio V1.5.7 — Whiteboard Journey Primitives

## Objetivo
Completar as primitives de experiência da Jornada sem abrir novos módulos do Service Studio.

## Entregas
- Persona como entidade reutilizável do Service Graph.
- Canal como entidade reutilizável e relação explícita do Touchpoint.
- Emoção como entidade ligada a Etapa + Persona.
- Emotion Curve por persona na Journey View.
- Journey agora possui 6 lanes estruturadas, incluindo Emoção.
- Persona ativa por Journey View, com seletor no topo e Inspector.
- Filtros por Persona preservados em Saved Views.
- Relação de Persona em Etapa, Touchpoint, Emoção, Evidência, Problema, Oportunidade e Ação do Cliente.
- Cards de Touchpoint exibem o Canal como badge contextual.
- Biblioteca ganha categoria Experiência: Persona, Emoção e Canal.
- Service Graph Browser ganha filtro Experiência.
- Migração automática: canais são extraídos dos Touchpoints existentes; uma Persona principal e emoções por etapa são criadas quando necessário.

## Contrato arquitetural
Persona, Canal e Emoção são entidades do Service Graph. A View Jornada apenas as representa. Alterar a emoção em uma instância altera a entidade; posição e layout continuam locais à View.

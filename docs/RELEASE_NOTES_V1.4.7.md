# Release Notes — V1.4.7 Whiteboard Frames & Structure

## Foco

Consolidar containers e hierarquia do Whiteboard antes de avançar para Infinite Canvas & Navigation.

## Entregue

- Frame, Section e Swimlane.
- Nested containers.
- Prevenção de ciclos de hierarquia.
- Movimento recursivo de descendentes.
- Collapse/expand persistente.
- Auto-resize com tolerância de borda.
- Fit explícito ao conteúdo.
- Padding configurável.
- Layers em árvore hierárquica.
- Blueprint lanes migradas para Swimlanes.
- Templates de descoberta usando Sections.
- Duplicação de subárvores e edges internas.
- Exclusão preservando filhos ou removendo subárvore.
- Migração não destrutiva de frames legados.

## Compatibilidade

A V1.4.7 usa o mesmo `realtalent-service-studio-v2-service-graph`. O metadata da V1.4.6 é lido como fallback e migrado para a chave V1.4.7 no primeiro salvamento.

Frames antigos recebem defaults conservadores (`containerType: frame`, `padding: 24`, `autoResize: false`, `collapsed: false`), enquanto as faixas clássicas de Blueprint são reconhecidas como Swimlanes.

## Próxima versão

V1.4.8 — Infinite Canvas & Navigation.

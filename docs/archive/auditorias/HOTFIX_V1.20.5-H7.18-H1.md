# V1.20.5-H7.18-H1 — Journey Cover System

## Adicionado
- Capa padrão Blue Ocean para todas as Journeys.
- Upload de capa personalizada em PNG/JPG/WebP.
- Otimização automática da imagem antes de persistir no Service Graph.
- Ação **Usar padrão** para remover a personalização.
- Dashboard/Recentes/Favoritos/Todos os recentes passam a renderizar a capa canônica da Journey.

## Regras
- Journey sem `coverImage` usa sempre `/journey-cover-blue-ocean-h718h1.svg`.
- Upload SVG não é aceito.
- Entrada máxima: 6 MB; saída otimizada em WebP.
- A capa não altera etapas, contexto, relações ou Blueprint.

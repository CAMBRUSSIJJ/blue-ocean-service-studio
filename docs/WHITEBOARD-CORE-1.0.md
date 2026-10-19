# Whiteboard Core 1.0 — Contratos de arquitetura

## Modelo
`Service Graph → Entity → Instance → View Layout`

- **Entity**: conteúdo canônico do serviço.
- **Instance**: representação visual de uma entidade em um quadro.
- **View Layout**: posição e representação específica de Livre, Fluxo, Jornada ou Blueprint.

## Primitives estabilizadas
- objetos visuais;
- Smart Objects;
- conexões;
- Frame / Section / Swimlane;
- grupos, layers, lock e visibility;
- Column / Lane / Cell;
- Saved Views e filtros;
- Linked Objects;
- Persona / Canal / Emoção;
- templates e Smart Layout.

## Confiabilidade
- autosave revisionado;
- IndexedDB `latest-good`;
- checkpoints rotativos;
- session heartbeat;
- recovery;
- backup portátil.

## Portabilidade
- JSON de projeto;
- fragmentos JSON;
- CSV de entidades;
- SVG;
- PNG;
- PDF.

## Performance
- viewport culling;
- culling de conexões;
- semantic zoom;
- render agrupado por frame;
- minimapa com densidade limitada.

## Release gate
O painel `Core 1.0` executa os contratos runtime. O script `qa-core.sh` executa os contratos estáticos do pacote.

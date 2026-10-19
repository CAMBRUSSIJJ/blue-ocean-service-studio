# Release Notes — V1.5.5.1

## Whiteboard Semantic & Layout QA

Patch de consolidação antes de V1.5.6.

### P0 corrigidos

- shell `Blueprint / Whiteboard` substituído por `Service Whiteboard`;
- Flow Layout reorganizado por componentes conectados;
- objetos isolados separados de fluxos conectados;
- prevenção de colisão/overlap nos layouts automáticos;
- routing do Flow integrado à direção do layout;
- templates estruturados geram Smart Objects semânticos;
- Visual Type separado de Semantic Type.

### P1 corrigidos

- semantic zoom;
- histórico com rótulos mais descritivos;
- seleção múltipla sem controles duplicados entre toolbar e Inspector;
- lock/unlock contextual;
- `Views` removido da barra superior;
- `Exibição` renomeado para `Canvas`;
- direção de conexões mais legível e hover de relação;
- terminologia guiada para Journey/Touchpoint/Frontstage/Backstage;
- Service Graph Browser com filtros por domínio.

### Compatibilidade

- abre dados da V1.5.5;
- preserva `persistenceRevision`, IndexedDB recovery e checkpoints;
- meta da V1.5.5 é usada como fallback de migração;
- o novo meta key é `realtalent-service-studio-v1551-whiteboard-meta`.

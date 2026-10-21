# SOURCE BASELINE — V1.18.5

Base: V1.18.4 Attention Engine.

Autoridade de fonte permanece em `src/`.

Mudanças desta baseline:
- `src/services/continue-engine.ts` passa a derivar a continuidade de trabalho de forma determinística.
- `src/services/workspace-preferences.ts` passa a ser a fonte das preferências pessoais da Home por usuário/workspace.
- Favoritos, pins e contexto recente guardam referências; os objetos reais continuam vindo do Service Graph.
- IndexedDB é o armazenamento durável das preferências, com fallback em localStorage, timeout de abertura e política “newest state wins”.
- Eventos globais de abertura/favorito integram Journey e Blueprint à Home sem acoplamento direto.
- `WorkspaceHome.tsx` apresenta Continue/Favorites/Pins e não mantém uma lista local paralela de recentes.
- Service Health e Attention Engine permanecem independentes e inalterados em seus papéis.
- Nenhuma alteração em Service Graph Schema V3, IDs, migrations, storage do projeto ou backups.

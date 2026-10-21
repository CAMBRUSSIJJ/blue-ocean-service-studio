# BLUE OCEAN Service Studio — V1.18.5
## Continue + Favorites + Pins

### Adicionado
- `src/services/continue-engine.ts` como fonte determinística da seção **Continuar**.
- `src/services/workspace-preferences.ts` para preferências pessoais separadas do Service Graph.
- Persistência por `userId + workspaceId` em IndexedDB, com fallback síncrono em `localStorage`.
- Favoritos explícitos para Jornada, Blueprint e Pesquisa resolvidos por referência.
- Itens fixados na Home com ordem persistente e controles de subir/descer.
- Rastreamento global por eventos `bo-workspace-context` e `bo-workspace-preference`.
- CSS dedicado `workspace-preferences.css` e gate `workspace-preferences:smoke`.

### Melhorado
- **Continuar** passa a responder “onde eu estava trabalhando” usando atividade rastreada e timestamps reais.
- A prioridade de continuidade distingue `edited`, `created`, `commented`, `opened` e `navigated` como desempate determinístico.
- Histórico recente deduplica o mesmo objeto e mantém no máximo 50 contextos por usuário/workspace.
- Favoritos deixam de depender da lista de recentes.
- Pins deixam de ser ordenados por recência: a ordem é deliberada pelo usuário.
- Aberturas reais de Jornada e Blueprint alimentam a continuidade mesmo quando ocorrem fora da Home.
- Favoritos legados de Jornada/Blueprint são migrados para a nova preferência sem alterar o Service Graph.

### Confiabilidade
- Leitura do IndexedDB possui timeout e tratamento de estado bloqueado.
- Entre cache local e IndexedDB, vence o estado com `updatedAt` mais recente.
- Eventos globais de preferência são serializados por workspace para evitar sobrescritas concorrentes.
- A Home usa updates funcionais de estado para evitar perda de cliques rápidos em favorito/pin.
- Referências a objetos excluídos são podadas com segurança e não quebram a Home.

### Corrigido
- Gates históricos da Home foram atualizados para aceitar a arquitetura nova sem exigir `Recentes` local ou versão exatamente `1.18.4`.
- O preflight Linux agora verifica os serviços e o CSS da V1.18.5.
- README e README-LINUX foram sincronizados com a release atual.

### Removido
- O conceito local de `recentItems` dentro de `WorkspaceHome.tsx`.
- A mistura conceitual entre recência, favorito e item fixado.
- Nenhuma funcionalidade de produto, objeto do Service Graph ou dado do usuário foi removido.

### Compatibilidade
- Service Graph Schema V3 preservado.
- Nenhuma migration do Service Graph.
- IDs, storage do projeto, backups, Journey, Blueprint, Whiteboard e autenticação preservados.
- Preferências armazenam referências (`targetType`, `targetId` e metadados de navegação), não cópias dos objetos de domínio.
- V1.18.5 continua sem IA para decidir continuidade, favoritos ou pins.

### Limitações / pendente
- A Home mostra até 5 itens de continuidade, 6 favoritos e 6 fixados; não existe ainda uma Central de Histórico dedicada.
- Favoritos/pins cobrem inicialmente os alvos resolvidos pela Home atual; expansão para todos os tipos do produto fica preparada pelo contrato.
- Sincronização de preferências entre dispositivos ainda não existe; esta release é local-first.
- O `npm ci` do ambiente de empacotamento voltou a receber `EAI_AGAIN` do registry. Por isso, o typecheck React/Vite completo e o build de produção não são declarados como aprovados neste ambiente.

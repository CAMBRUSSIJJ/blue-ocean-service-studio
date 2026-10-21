# BLUE OCEAN Service Studio — V1.20.5-H7.29
## Channels + Touchpoints + Continuity

Data: 2026-10-13

### Objetivo
Separar definitivamente **Canal** de **Touchpoint**, tornar os canais entidades canônicas do serviço e revelar onde a experiência quebra quando uma Journey muda de canal.

### Adicionado
- `ServiceChannel`, `ServiceChannelKind`, `ChannelHandoffAssessment`, `ChannelContinuityDimension` e `ChannelContinuityRating` no domínio.
- `Touchpoint.channelId` como vínculo canônico, preservando `Touchpoint.channel` como label legado retrocompatível.
- Nove categorias de canal: Digital, Mensageria, Telefone, E-mail, Presencial, Físico, Parceiro, Sistema e Outro.
- Materialização determinística dos canais livres existentes em entidades canônicas.
- Nova perspectiva **Canais** no Service Workspace, elevando a leitura integrada para sete perspectivas.
- Três superfícies de trabalho:
  - **Mapa omnichannel** — matriz Journey × Canal por etapa.
  - **Canais & touchpoints** — gestão de canais e classificação dos touchpoints.
  - **Handoffs** — análise de continuidade entre canais.
- Cinco dimensões de continuidade:
  - Contexto preservado.
  - Identidade preservada.
  - Responsabilidade clara.
  - Expectativa consistente.
  - Status visível.
- Score determinístico de continuidade e cobertura de avaliação.
- Diagnósticos para touchpoints sem classificação, trocas de canal não avaliadas e dimensões que falham.
- Journey Inspector passa a usar seletor de canal canônico e explicita que **Touchpoint é a interação; Canal é por onde ela acontece**.
- Proteção contra exclusão de canal ainda utilizado por touchpoints ou avaliações de handoff.
- Renomear canal mantém o label legado dos touchpoints sincronizado.

### Compatibilidade
- Touchpoints antigos com apenas `channel: string` são materializados de forma idempotente e recebem `channelId` sem migração destrutiva.
- Journey, stages e Blueprint não são alterados pela análise omnichannel.
- `updateTouchpointChannel` legado permanece disponível, agora resolvendo/criando o canal canônico correspondente.
- H7.28 Semantic Zoom e Custom Layers permanecem intactos.
- Journey → Blueprint → Whiteboard continua preservado.

### QA
- H7.29: **129/129 PASS**
- Suíte acumulada: **2739 OK / 0 FAIL**
- `syntax:check`: PASS
- `lock:verify`: PASS
- `source:authority`: PASS
- `foundation:smoke`: 12/12 PASS
- `project-foundation:smoke`: 46/46 PASS
- `preflight-linux.sh`: PASS
- Core TypeScript não-React H7.29: PASS

### Limitações conhecidas
`npm ci` não concluiu dentro da janela de execução disponível deste ambiente. Por isso o typecheck React completo e o build Vite não são declarados como PASS nesta release. Browser/runtime visual também não foi executado nesta sessão.

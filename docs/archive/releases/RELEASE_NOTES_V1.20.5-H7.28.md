# BLUE OCEAN Service Studio — V1.20.5-H7.28
## Blueprint Semantic Zoom + Custom Layers

Data: 2026-10-13

### Objetivo
Permitir que o Service Blueprint alterne entre panorama e detalhe por significado — não apenas por zoom visual — e adaptar sua arquitetura de lanes ao tipo real de serviço sem abandonar a estrutura canônica existente.

### Adicionado
- **Zoom semântico** persistido por Blueprint:
  - **Estratégico** — Ações do cliente + Frontstage + Backstage.
  - **Journey** — acrescenta Evidências à relação experiência/entrega.
  - **Operacional** — mostra Evidências, Cliente, Frontstage, Backstage, Processos e Sistemas.
- `BlueprintSettings`, `BlueprintSemanticZoom`, `BlueprintLaneConfig` e `BlueprintLaneRole` no modelo.
- Validação de `blueprintSettings` no schema com compatibilidade retroativa para boards antigos.
- Gerenciador de camadas dentro do Blueprint estruturado.
- Lanes customizadas com nome, descrição, cor, obrigatoriedade e visibilidade por zoom.
- Presets de lanes para **Padrão**, **Saúde**, **Hospitalidade** e **SaaS**.
- Preset SaaS com Interface, Customer Success, Automação e Dados/Infraestrutura.
- Preset Saúde com Família/Acompanhante, Equipe clínica e Regulação/Compliance.
- Preset Hospitalidade com Digital, Housekeeping/Operação local e Parceiros.
- Proteção contra remoção de lane customizada que ainda contém objetos.
- Blueprint Health passa a considerar apenas lanes marcadas como obrigatórias; lanes opcionais não criam gaps artificiais.
- O resumo de gaps mostra as lacunas do nível semântico atual, enquanto o Health continua avaliando a estrutura completa.

### Compatibilidade
- Blueprints H7.10–H7.27 sem `blueprintSettings` recebem defaults em memória e continuam funcionando sem migração destrutiva.
- As seis lanes centrais permanecem canônicas e não podem ser excluídas.
- `WhiteboardItem.blueprintLane` continua aceitando o placement legado e também as novas chaves customizadas.
- Journey → Blueprint continua idempotente e preserva os settings H7.28.
- H7.27 continua protegendo o Blueprint contra mutação implícita de cenários What-if.

### QA
- H7.28: **93/93 PASS**
- Suíte acumulada: **2610 OK / 0 FAIL**
- `syntax:check`: PASS
- `lock:verify`: PASS
- `source:authority`: PASS
- `foundation:smoke`: 12/12 PASS
- `project-foundation:smoke`: 46/46 PASS
- `preflight-linux.sh`: PASS
- Core TypeScript não-React H7.28: PASS

### Limitações conhecidas
`npm ci` não concluiu dentro da janela de execução disponível deste ambiente. Por isso o typecheck React completo e o build Vite não são declarados como PASS nesta release. Browser/runtime visual também não foi executado nesta sessão.

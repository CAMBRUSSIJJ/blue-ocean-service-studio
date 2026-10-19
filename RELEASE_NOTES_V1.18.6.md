# BLUE OCEAN Service Studio — V1.18.6
## Service Architecture Preview

### Adicionado
- `src/services/service-architecture-engine.ts` como fonte determinística da arquitetura estrutural do serviço.
- Cinco camadas explícitas: **Experiência, Serviço, Operação, Melhoria e Resultados**.
- Score de **Cobertura estrutural 0–100**, separado de Service Health e Attention Engine.
- Inventário estrutural de Jornadas, etapas, touchpoints, Blueprints, processos, sistemas, oportunidades, iniciativas, métricas e benefícios.
- Preview do fluxo principal da Jornada diretamente na Home.
- Detecção de gaps estruturais com prioridade e ação contextual.
- Nova Central **Service Architecture** com mapa por camadas, Jornadas, inventário e gaps.
- CSS dedicado `service-architecture.css` e gate `architecture:smoke`.

### Melhorado
- A Home agora responde também **“como este serviço está estruturado?”**, sem exigir que o usuário abra vários módulos para entender o Service Graph.
- Cada camada possui ação contextual para Jornada, Blueprint, Plano de Ação ou Inteligência.
- A Jornada principal é selecionada deterministicamente priorizando Jornada não arquivada, maior quantidade de etapas, cobertura e nome.
- A visualização estrutural usa somente objetos/relações existentes no Service Graph; não há números hardcoded nem conteúdo gerado por IA.
- A seção de personalização da Home permite mostrar/ocultar **Arquitetura do serviço**.

### Separação conceitual
- `Service Health` = condição/consistência geral do serviço.
- `Attention Engine` = o que exige ação agora.
- `Service Architecture` = como os objetos e camadas do serviço estão conectados.
- `Continue/Favorites/Pins` = contexto e preferências pessoais de navegação.

### Cobertura estrutural
A fórmula desta release é determinística:
- Experiência: 25%
- Serviço: 20%
- Operação: 20%
- Melhoria: 20%
- Resultados: 15%

Cada camada é calculada por presença, cobertura e vínculos reais do grafo. A fórmula é exibida na Central de Arquitetura.

### Corrigido
- O gate histórico V1.18.5 agora aceita releases posteriores mantendo todos os 50 checks funcionais.
- Preflight Linux passa a verificar o engine e o CSS da V1.18.6.
- Pipeline de assets publica `v1186-service-architecture.css` após as camadas visuais anteriores.

### Não alterado
- Service Graph Schema V3.
- IDs, migrations, IndexedDB do projeto, backups e contratos de persistência.
- Journey, Blueprint, Whiteboard, login/autenticação.
- Health Engine, Attention Engine e Workspace Preferences.
- A Home não edita o Service Graph pela visualização de arquitetura.

### Limitações / pendente
- O Service Graph atual representa um serviço por workspace/grafo; portanto esta release **não adiciona um seletor multi-serviço artificial**. Isso só deve entrar quando o domínio suportar múltiplos serviços de forma canônica.
- O preview é de leitura/navegação; drag-and-drop, edição visual da arquitetura e diagramador completo ficam fora da V1.18.6.
- O fluxo principal mostra até 7 etapas no preview compacto; a Central mostra as Jornadas com até 6 etapas resumidas por linha.
- O `npm ci` do ambiente de empacotamento voltou a receber `EAI_AGAIN` do npm registry. Por isso o typecheck React/Vite completo e o build de produção não são declarados como aprovados neste ambiente.

# BLUE OCEAN Service Studio — V1.18.7
## Dashboard Parity

### Objetivo
Reconstruir a Home e o shell principal com alta fidelidade ao modelo visual fornecido pelo usuário, mantendo identidade, dados e arquitetura do BLUE OCEAN Service Studio.

### Adicionado
- Nova camada visual `src/runtime/dashboard-parity.css`.
- Dashboard simplificado com três ações rápidas: **Nova jornada**, **Nova persona** e **Nova métrica**.
- Faixa **Recentes** com até cinco itens derivados primeiro do Continue Engine e acesso ao histórico completo.
- Área **Favoritos** separada de Recentes.
- Área **Aprender** com seis destinos úteis do produto.
- Ação **Nova persona** conectada ao Service Graph canônico.
- Header mínimo do Dashboard com acesso à **Service Architecture**, **Central de Atenção** e avatar da conta.
- Gate `dashboard-parity:smoke` com 53 contratos.

### Melhorado
- Sidebar passa a usar superfície branca e geometria compacta de 232 px no desktop.
- Header do Dashboard passa a 48 px e remove excesso de informação contextual.
- A Home deixa de exibir simultaneamente todos os diagnósticos avançados.
- Service Health, Attention e Service Architecture passam a ser superfícies focadas, preservando todo o detalhamento anterior sem sobrecarregar o Dashboard.
- Recentes mantém rastreamento real de contexto e não vira uma lista estática.
- Favoritos e Pins continuam persistidos por usuário/workspace; Pins permanecem funcionais sem criar uma seção duplicada na Home.
- Breakpoints foram ajustados para desktop, tablet e mobile; ações rápidas viram uma coluna no celular.

### Preservado
- Service Graph Schema V3 e IDs.
- IndexedDB, backups, migrations e contratos de persistência.
- Service Health Engine.
- Attention Engine.
- Continue Engine.
- Favorites + Pins.
- Service Architecture Engine.
- Journey, Blueprint, Whiteboard, Pesquisa, Inteligência e demais módulos existentes.
- Login e autenticação local-first.

### Segurança arquitetural
- A Home React não cria um segundo Service Graph.
- Preferências continuam delegadas ao serviço de workspace preferences.
- Persona é criada por transação no grafo existente.
- O Dashboard não edita objetos estruturais por meio dos previews diagnósticos.

### Fidelidade à referência
A composição reproduz o modelo visual solicitado em termos de:
- sidebar branca compacta;
- header horizontal mínimo;
- três CTAs de criação no topo;
- painel neutro de Recentes com cards compactos;
- Favoritos logo abaixo;
- área de aprendizado no rodapé visual;
- espaçamento, densidade e proporções equivalentes.

Não foram incorporados marca, logotipo, domínio, imagens, código ou conteúdo proprietário do produto usado como referência. Os previews dos cards são desenhos CSS próprios do BLUE OCEAN.

### QA
- `dashboard-parity:smoke`: **53/53**.
- `architecture:smoke`: **51/51**.
- `workspace-preferences:smoke`: **50/50**.
- `attention:smoke`: **32/32**.
- `health:smoke`: **26/26**.
- Regressão completa V1.12 → V1.18.7: **610 checks OK / 0 FAIL**.
- Demo: **79 objetos, 0 referências quebradas, 5 etapas, 7 evidências, 7 iniciativas**.
- `tsc --noEmit --noCheck`: aprovado.
- Engines principais: strict TypeScript 5.8.3 isolado aprovado.
- Source Authority, Source Foundation, lock verify e preflight Linux: aprovados.

### Limitação do ambiente de empacotamento
O registry npm não disponibilizou todos os tarballs necessários (`EAI_AGAIN`/`ENOTCACHED`). Por isso esta release **não declara `npm run build` React/Vite nem o typecheck completo dependente de `node_modules` como aprovados neste ambiente**.

O `node_modules` parcial foi removido e nenhum `dist` antigo foi incluído. Os pacotes são source-first para evitar distribuir uma build de versão anterior como se fosse V1.18.7.

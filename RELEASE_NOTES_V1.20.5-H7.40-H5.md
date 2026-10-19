# BLUE OCEAN Service Studio — V1.20.5-H7.40-H5
## Service Workspace Simplification

A H7.40-H5 reduz a carga cognitiva da **Visão geral do Serviço** sem remover nenhuma capacidade do Blue Ocean.

### O que mudou

- **Continue de onde parou** agora aparece antes do mapa do serviço.
- O topo mostra apenas seis indicadores essenciais: **Maturidade, Prioridades, Iniciativas, Resultados, Governança e Operação**.
- Os demais indicadores ficam recolhidos em **Ver todos os indicadores**.
- A Visão geral deixa de mostrar 16 cards estreitos e passa a trabalhar com cinco fases:
  - **Entender** — Pesquisa, Ecologia, Proposição
  - **Projetar** — Journey, Canais, Blueprint, Whiteboard
  - **Validar** — Protótipos, Aprendizados, Decisões
  - **Melhorar** — Atual × Futuro, Prioridades, Iniciativas, Resultados
  - **Operar** — Governança, Operação, Cockpit, Prontidão
- A subnavegação redundante de **Visão geral** deixa de aparecer quando não existem outras perspectivas naquele nível.
- O texto técnico “Um serviço, dezoito perspectivas conectadas” deixa de ocupar a superfície comercial e os detalhes de arquitetura ficam colapsáveis.
- Os cards de fase usam layout flex com rodapé em fluxo normal, eliminando a sobreposição entre descrição e CTA.
- O grid passa a responder em **5 / 3 / 2 / 1 colunas** conforme a largura da tela.
- As cores dos ícones passam a representar as cinco fases, em vez de parecerem aleatórias.

### Compatibilidade

Os contratos históricos H7.22–H7.40 continuam preservados no source para regressão, mas não são usados para recolocar a interface antiga.

### QA

- H7.40-H5: **32/32 PASS**
- Chromium H7.40-H5: **11/11 PASS**
- Suíte acumulada: **4632 OK / 0 FAIL**
- `syntax:check`: PASS
- `lock:verify`: PASS
- `source:authority`: PASS
- Foundation: **12/12 PASS**
- Project Foundation: **46/46 PASS**
- `preflight-linux.sh`: PASS

### Limitação conhecida

O `npm ci` continuou travando neste ambiente e precisou ser encerrado. O `node_modules` parcial foi removido. Por isso o typecheck React completo e o build Vite de produção **não são declarados como PASS nesta execução**.

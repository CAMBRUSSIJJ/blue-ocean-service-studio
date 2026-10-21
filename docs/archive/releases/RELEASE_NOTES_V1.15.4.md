# BLUE OCEAN Service Studio — V1.15.4

## Whiteboard Visual Integrity & UX Recovery

Esta versão corrige a integridade visual do Whiteboard/Journey/Blueprint sem alterar schema, IDs, Service Graph ou persistência.

### Correções principais

- reconciliação automática de coordenadas salvas quando a geometria atual de Journey/Blueprint mudou;
- stages estruturados deixam de ser desenhados como Smart Objects duplicados;
- sticky headers/lanes só aparecem quando o conteúdo original realmente sai da viewport;
- tour automático do Blueprint foi adiado e o coach flutuante passa a ser opt-in;
- um único ponto de entrada para **Montar serviço** durante o trabalho normal;
- CTAs visíveis em células/lanes vazias;
- piso tipográfico de 11 px no Whiteboard;
- menu Ferramentas reorganizado em **Editar / Analisar / Gerenciar**;
- isolamento responsivo do editor no mobile;
- Inspector/painéis passam a ocupar a tela de forma controlada no mobile;
- marca BLUE OCEAN aplicada no shell;
- versão visível do Whiteboard atualizada para V1.15.4;
- eyebrow legado `MODELAR` removido do Blueprint;
- cores estruturais do Whiteboard migradas para os tokens BLUE OCEAN;
- nomenclatura de progresso clarificada: progresso do guia, completude estrutural e fluxo deixam de aparentar ser o mesmo indicador.

### Compatibilidade

- nenhuma migration de dados;
- IDs e chaves históricas preservados;
- layouts antigos continuam carregando e podem ser reconciliados automaticamente;
- `RealTalentRuntime`/IDs `rt*` permanecem apenas como contratos técnicos de compatibilidade.

### QA

Passaram no gate local:

- V1.12 Stability: 12/12
- V1.13 Design System: 10/10
- V1.14 Workspace Home: 14/14
- V1.15 Global Navigation: 17/17
- V1.15.3 Precision Studio: 17/17
- V1.15.3 Branding: 14/14
- V1.15.4 Whiteboard UX: 13/13
- Demo smoke: 79 objetos / 0 referências quebradas
- `dist` validation: OK
- `whiteboard-core.js` syntax: OK
- `#2563EB` no Whiteboard: 0 ocorrências
- declarações `font-size` abaixo de 11 px no Whiteboard: 0

### Dívida técnica conhecida

O CSS histórico do Whiteboard ainda contém muitos `!important`. Não foi feita remoção em massa nesta versão porque isso teria alto risco de regressão visual. A redução de especificidade deve ocorrer de forma incremental após validação visual da V1.15.4.

### Build React

O bundle React principal validado da V1.15.3 foi preservado e sincronizado com os runtimes V1.15.4. Os runtimes, CSS e assets publicados são V1.15.4. Não houve rebuild React completo neste ambiente.

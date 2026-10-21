# V1.20.5-H7.40-H15.3 — Design do Serviço UX Refinement

## Objetivo

Tornar a aba **Design do serviço** mais clara como cockpit de evolução do serviço, sem duplicar as ferramentas que já existem em cada capacidade.

## Mudanças

- Cabeçalho passa a se identificar explicitamente como **Design do serviço**.
- Estruturação continua baseada em 16 capacidades, mas o percentual deixa de dominar visualmente o hero.
- O bloco de próximo passo fica mais compacto e explica que a recomendação deriva do estado atual do serviço.
- O caminho por fases permanece livre e clicável: **Entender, Projetar, Validar, Melhorar e Operar**.
- A fase selecionada vira o foco do painel, sem o CTA redundante “Abrir fase”.
- Estados operacionais passam a conduzir ações consistentes: **Criar**, **Continuar**, **Ver** e **Revisar** quando houver atenção.
- Canais passam a ser descritos como meios de interação e exibem contagem de touchpoints separadamente.
- Whiteboard é apresentado como apoio opcional de exploração.
- “Como esta fase se conecta” é promovido para um bloco visível e contextual por fase.
- “Continue de onde parou” permanece como mecanismo de retomada dos artefatos recentes.

## Compatibilidade

- Nenhuma entidade nova.
- Nenhuma mudança destrutiva de persistência.
- Sidebar, Project Shell, Service Model Index e Usage & Relations permanecem intactos.
- O smoke H15.2 foi ajustado para validar presença histórica de metadata/changelog, sem exigir que H15.2 continue sendo a release atual.

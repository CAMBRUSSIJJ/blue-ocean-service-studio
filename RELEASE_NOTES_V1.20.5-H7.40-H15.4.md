# Blue Ocean Service Studio — V1.20.5-H7.40-H15.4

## Design do Serviço Visual Polish

Esta entrega refina visualmente a aba **Design do serviço** sem alterar o modelo de dados ou a navegação global.

### Principais mudanças
- Stepper do Caminho do serviço redesenhado com estados visuais, fase ativa em superfície própria e linha de progresso.
- Fase em foco com indicador próprio de capacidades estruturadas.
- Capabilities deixam de parecer tabela e passam a usar superfícies individuais com hierarquia, hover e CTAs consistentes.
- Mapa "Como esta fase se conecta" ganha leitura gráfica e ramo de apoio para Whiteboard/Prontidão.
- Preserva Entender → Projetar → Validar → Melhorar → Operar e acessibilidade por tablist/aria-selected.
- Corrige as 15 ocorrências TS2783 de `action` declarada antes de `...stateOf(...)`.

### QA executado no source
- H15.4 Visual Polish: 40/40 PASS
- H15.3 UX Refinement: 45/45 PASS
- H15.2 Usage & Relations: 75/75 PASS
- H15 Service Model Index: 36/36 PASS
- H14 Interaction & Accessibility: 35/35 PASS
- H11 Service-first Navigation: 20/20 PASS
- H7.37 Service Governance: 211/211 PASS
- H7.1 Personas 2.0: 14/14 OK
- syntax:check: PASS
- lock:verify: PASS
- source:authority: PASS

O `typecheck` completo não foi certificado no ambiente de empacotamento porque as dependências React/@types não estão instaladas nesse ambiente. O launcher executa a validação no ambiente local com as dependências instaladas/preparadas.

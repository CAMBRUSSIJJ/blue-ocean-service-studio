# Blue Ocean Service Studio — V1.20.5-H7.40-H15.5

## Discovery UX & Guided Actions

Esta versão simplifica a navegação do projeto e aprofunda a experiência da fase **Entender** dentro de Design do serviço.

### UX
- Remove **Design do serviço** e **Pesquisa** da barra contextual superior do projeto; os destinos permanecem na navegação lateral canônica.
- Transforma Pesquisa, Ecologia e Proposição em cards guiados, com estado, dados reais, explicação e próximo passo.
- Pesquisa passa a mostrar projeto, observações, evidências e maturidade derivada do Research Studio.
- Ecologia passa a explicar atores e relações por meio de linguagem mais direta e exemplo visual.
- Proposição passa a evidenciar necessidades, evidências e a cadeia Necessidades → Valor entregue → Resultado.
- A fase Entender ganha recomendação contextual e mapa visual Pesquisa → Ecologia → Proposição.

### Compatibilidade
- H15.4 Visual Polish preservada.
- H15.3 UX Refinement preservada.
- H15.2 Usage & Relations e H15 Service Model preservados.
- Nenhuma migração destrutiva de dados.

### QA executado no pacote fonte
- H15.5 Discovery UX & Guided Actions: 48/48 PASS.
- H15.4 Design do Serviço Visual Polish: 40/40 PASS.
- H15.3 Design do Serviço UX Refinement: 45/45 PASS.
- H14 Interaction & Accessibility Polish: 35/35 PASS.
- H13 Persistent Global Sidebar: 25/25 PASS.
- H7 Guided Service Workspace: 36/36 PASS.
- Research Studio H7.26: 64/64 OK.
- Service Proposition H7.27: 85/85 OK.
- `tsc --noEmit --noCheck`: PASS.
- `preflight-linux.sh`: PASS.

O typecheck completo depende das dependências React/@types instaladas pelo launcher na máquina de destino.

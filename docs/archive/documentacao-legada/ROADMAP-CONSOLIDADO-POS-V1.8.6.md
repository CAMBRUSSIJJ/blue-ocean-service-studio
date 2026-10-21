Sim. Considerando o estado atual até a **V1.8.6 — Blueprint Health + Gaps**, eu faria uma revisão do roadmap inteiro antes de continuar adicionando módulos. O projeto chegou a um ponto em que o risco maior já não é “faltar funcionalidade”; é **virar uma coleção muito grande de ferramentas boas, mas sem uma arquitetura de experiência única**.

Minha leitura é que o RealTalent Service Studio já tem uma direção de produto bastante clara:

> **não ser um Miro especializado, nem somente um Journey Mapper, nem somente um Blueprint Tool.**
>
> Ser um **sistema operacional visual do serviço**, no qual Journey, Blueprint, Whiteboard, processos, problemas, métricas e melhorias são diferentes formas de trabalhar sobre o mesmo **Service Graph**.

A V1.8.6 reforça muito essa direção porque introduz algo especialmente importante: o sistema já começa a **entender semanticamente o que o usuário desenhou**, em vez de apenas armazenar caixas em uma tela.

---

# 1. Onde o Service Studio está hoje

Eu dividiria a plataforma atual em quatro níveis de maturidade.

| Área | Estado atual | Leitura |
|---|---|---|
| Arquitetura Service Graph | 🟢 Boa fundação | É a decisão mais importante do produto |
| Blueprint | 🟢 Mais maduro | Hoje é a referência de UX da plataforma |
| Guided / Professional | 🟢 Conceito muito forte | Resolve um problema real de usuários não especialistas |
| Blueprint Health | 🟢 Excelente direção | Começa a transformar mapa em sistema inteligente |
| Inspector | 🟢 Fundamental | Deve virar padrão universal |
| Journey | 🟡 Funcional, porém atrás do Blueprint | Precisa receber a mesma arquitetura de experiência |
| Whiteboard | 🟡 Fundacional | Precisa virar ferramenta profissional antes da expansão |
| Service Canvas | 🟡 Conceito correto | Ainda precisa encontrar sua função exata dentro do ecossistema |
| Evidence / Research | 🟠 Estrutura prevista | Precisa virar primeira classe no Graph |
| Improvement | 🟠 Estrutura prevista | Ainda não forma um ciclo operacional completo |
| Process / Operations | 🟠 Próxima camada | Muito importante para diferenciação |
| Metrics | 🟠 Planejado | Fundamental para sair de “mapa” e virar gestão |
| Current × Future | 🟠 Planejado | Diferencial estratégico importante |
| Collaboration | 🔴 Ainda não deve ser prioridade | Depende de arquitetura estável |
| Cloud | 🔴 Posterior | Não deveria vir antes do domínio estabilizar |
| IA | 🔴 Prematuro como foco principal | Primeiro o Graph precisa ser confiável |
| Integrações | 🔴 Posterior | Dependem de modelo e API internos consolidados |

O Blueprint, portanto, não deve ser visto apenas como um módulo que ficou bom.

Ele deve funcionar como **laboratório da arquitetura de interação da plataforma inteira**.

---

# 2. O que a V1.8.6 mostrou de mais importante

A principal inovação da V1.8.6 nem é o número `23/100`.

É esta mudança conceitual:

```text
desenhar
   ↓
estruturar
   ↓
o sistema entende
   ↓
o sistema verifica
   ↓
o sistema explica
   ↓
o sistema leva à correção
```

Isso é muito diferente de:

```text
criar mapa
↓
exportar mapa
```

E é justamente a fronteira entre uma ferramenta de diagramas e aquilo que estamos tentando construir.

Eu expandiria essa arquitetura para seis conceitos diferentes:

| Indicador | Pergunta |
|---|---|
| Coverage | Está preenchido? |
| Health | Está estruturalmente coerente? |
| Evidence | Temos evidência para acreditar nisso? |
| Risk | O que pode comprometer o serviço? |
| Impact | Se isso mudar/falhar, o que mais será afetado? |
| Maturity | Até que ponto essa área do serviço está gerenciada? |

Não misture esses seis scores.

Essa separação será extremamente importante mais adiante.

---

# 3. O mercado mudou bastante

Uma coisa importante apareceu na pesquisa atual: os concorrentes estão avançando justamente na direção que definimos para o RealTalent.

A diferença é que cada um está vindo de uma origem diferente.

## Miro

Miro continua extremamente forte em canvas, colaboração, templates e manipulação visual, mas agora também aproxima Journey de execução: possui journeys com tarefas, responsáveis, Kanban, artefatos sincronizados, documentos, diagramas e outros formatos conectados. Também está usando IA para sintetizar pesquisa e construir service blueprints. [Miro](https://miro.com/products/customer-journeys/?utm_source=chatgpt.com)

Isso significa que a antiga estratégia de dizer:

> “Miro é somente um whiteboard.”

já não é suficiente.

Ainda existe uma diferença fundamental: a RealTalent pode construir um **modelo semântico de serviço**, enquanto ferramentas generalistas continuam tendo sua força principal na flexibilidade visual.

---

# 4. FigJam

FigJam continua sendo uma excelente referência para o que eu chamaria de **baixo atrito de interação**.

Tem canvas infinito, connectors, templates, ferramentas colaborativas e IA capaz de gerar estruturas, organizar stickies e sintetizar conteúdo. [Figma](https://www.figma.com/figjam/ai/?utm_source=chatgpt.com)

Para o RealTalent eu copiaria a filosofia, não o produto:

```text
clicar pouco
feedback instantâneo
objetos leves
interação óbvia
canvas prazeroso
```

O Whiteboard do Service Studio tem que chegar nesse nível antes de receber dezenas de objetos especializados.

---

# 5. Mural

O maior aprendizado do Mural não está em Service Design.

Está em **facilitação de workshops**.

A plataforma oferece recursos como timer, votação, modo privado, controle do facilitador, summon, outline e esconder/revelar conteúdo. [Mural](https://www.mural.co/pricing?utm_source=chatgpt.com)

Isso é relevante para uma fase futura do RealTalent porque Service Design normalmente é construído com várias pessoas.

Imagine:

```text
Workshop
    ↓
Modo privado
    ↓
cada participante cria insights
    ↓
agrupar
    ↓
votar
    ↓
transformar selecionados em
Problem / Opportunity / Evidence
    ↓
Service Graph
```

Aí o workshop deixa de terminar em post-its.

---

# 6. Custellence

Custellence continua sendo uma referência interessante para **simplicidade estrutural**.

Sua estrutura de lanes, sub-lanes, cards e expansão/recolhimento permite manter mapas complexos relativamente compreensíveis. A própria documentação atual continua trabalhando com criação progressiva de lanes, cards e sub-lanes. [Custellence Help Center](https://help.custellence.com/en/articles/2401576-create-a-journey-map-the-basics?utm_source=chatgpt.com)

É particularmente relevante para a decisão que já tomamos:

> **não mostrar tudo ao mesmo tempo.**

Esse princípio precisa permanecer no Journey e no Blueprint.

---

# 7. UXPressia

Aqui o concorrente já chega muito mais próximo da área da RealTalent.

UXPressia trabalha com journeys, personas e service blueprints e está avançando em integração entre operação, customer experience, métricas, insights, tarefas e IA. Sua página atual de Blueprint fala explicitamente em conectar customer journey, operação, dados de CX, métricas de negócio, detectar gaps/dependências e transformar oportunidades em ações. [Uxpressia](https://uxpressia.com/service-blueprint?utm_source=chatgpt.com)

Também possui uma visão hierárquica de iniciativas, incluindo níveis como **Ecosystem → Strategic → Tactical**. [UXPressia Ajuda](https://help.uxpressia.com/en/articles/6220402-design-view-overview?utm_source=chatgpt.com)

Isso revela uma lacuna importante no nosso produto:

**hierarquia precisa virar uma função central**, não apenas uma ideia futura.

---

# 8. Smaply

Smaply se tornou um benchmark ainda mais relevante.

Hoje conecta Journey Mapping, Service Blueprint, Research Hub, Portfolio/Prioritization, Metrics, Personas e Journey Management em um ecossistema único. O Blueprint pode conter processos backstage, sistemas e handoffs e permanecer associado à journey. [Smaply](https://www.smaply.com/tools/service-blueprints?utm_source=chatgpt.com)

Além disso, o Research Hub transforma pesquisa em evidência estruturada e alimenta prioridades, journeys e análises. [Smaply](https://www.smaply.com/tools/research-hub?utm_source=chatgpt.com)

O Portfolio permite ligar:

```text
evidência
→ pain point
→ oportunidade
→ solução
→ priorização
→ acompanhamento
```

inclusive usando critérios como impacto, alcance e custo. [Smaply](https://www.smaply.com/tools/portfolio?utm_source=chatgpt.com)

Esse é um benchmark extremamente importante para o futuro **Improvement Studio**.

---

# 9. TheyDo

Arquitetonicamente, este é provavelmente o benchmark mais próximo da visão do Service Graph.

TheyDo utiliza um **Journey Graph** no qual Journey, Insight, Opportunity, Solution, Metric, Goal e Persona se relacionam. [TheyDo](https://www.theydo.com/help-center/building-blocks/intro-to-building-blocks/what-are-building-blocks?utm_source=chatgpt.com)

Uma Solution pode ser reutilizada entre journeys, e Insights podem sustentar Opportunities, que por sua vez se ligam a Solutions e Goals. [TheyDo](https://www.theydo.com/help-center/building-blocks/opportunities/how-to-connect-opportunities-to-other-building-blocks?utm_source=chatgpt.com)

Em 2026 eles também avançaram fortemente em IA. O Agent trabalha sobre o contexto estruturado do workspace e possui modo de edição no qual mudanças são propostas ao usuário antes de serem aplicadas. [TheyDo](https://www.theydo.com/help-center/ai-in-theydo/theydo-agent/what-is-the-theydo-agent?utm_source=chatgpt.com)

Isso confirma uma decisão nossa que eu **não mudaria**:

> IA deve ficar em cima de objetos e relações confiáveis.

Não usar IA para esconder um modelo de dados ruim.

---

# 10. Comparação estrutural

Minha leitura consolidada fica assim:

| Dimensão | Miro/FigJam | Smaply | UXPressia | TheyDo | RealTalent alvo |
|---|---|---|---|---|---|
| Whiteboard livre | Muito forte | Limitado | Limitado | Limitado | **Muito forte** |
| Journey | Forte | Muito forte | Muito forte | Muito forte | **Muito forte** |
| Blueprint | Forte | Muito forte | Muito forte | Médio | **Muito forte** |
| Modelo semântico | Médio | Forte | Forte | **Muito forte** | **Muito forte** |
| Research/Evidence | Médio | **Muito forte** | Forte | Muito forte | **Muito forte** |
| Improvement | Médio | Forte | Forte | **Muito forte** | **Muito forte** |
| Processos operacionais | Médio | Médio | Forte | Médio | **Muito forte** |
| Custos/capacidade | Baixo | Médio | Médio | Médio | **Diferencial possível** |
| Health determinístico | Baixo | Parcial | Parcial | Parcial | **Diferencial possível** |
| Current × Future | Flexível | Estruturável | Estruturável | Estruturável | **Nativo** |
| Guided learning | Médio | Forte | Forte | Médio | **Muito forte** |
| Workshop | **Muito forte** | Médio | Forte | Médio | Futuro |
| Collaboration | **Muito forte** | Forte | Forte | Forte | Futuro |
| IA contextual | Forte | Forte | Forte | **Muito forte** | Futuro |
| Operação do serviço | Médio | Médio | Forte | Médio | **Grande oportunidade** |

Essa última coluna é propositalmente **estado-alvo**, não o que a V1.8.6 já entrega.

---

# 11. Onde está a verdadeira oportunidade

Eu não tentaria disputar:

```text
RealTalent vs Miro
```

nem:

```text
RealTalent vs Smaply
```

O posicionamento deveria ser mais parecido com:

```text
Miro
   liberdade visual

+

Smaply / UXPressia
   service design estruturado

+

TheyDo
   objetos conectados / journey graph

+

ferramenta de processos
   operação

+

sistema de melhoria
   problema → solução → resultado

             ↓

     REALTALENT SERVICE STUDIO
```

E tudo isso com uma característica que deve permanecer central:

> **Simple outside. Structured inside.**

---

# 12. A arquitetura final que eu seguiria

Eu estruturaria a plataforma em quatro camadas.

### Camada 1 — Service Core

```text
SERVICE
│
├ Customer
├ Persona
├ Need
├ Job
│
├ Journey
├ Stage
├ Customer Action
├ Touchpoint
├ Channel
├ Emotion
│
├ Frontstage
├ Backstage
├ Process
├ Activity
├ System
├ Resource
├ Role
│
├ Evidence
├ Insight
├ Problem
├ Friction
├ Risk
├ Opportunity
│
├ Solution
├ Experiment
├ Initiative
├ Task
│
├ KPI
├ Target
├ Result
│
└ Current / Future
```

Esse é o patrimônio real da plataforma.

---

# 13. Camada 2 — Views

O usuário não deveria pensar em bancos separados.

Ele deveria simplesmente escolher:

```text
Journey
Blueprint
Whiteboard
Canvas
Process
Ecosystem
Improvement
Experiments
Action Plan
Metrics
Current × Future
```

Um mesmo:

```text
Process #183
```

pode aparecer em Blueprint, Process, Whiteboard e Current × Future sem virar quatro processos diferentes.

Essa é uma das regras que eu congelaria definitivamente na V1.9.

---

# 14. Camada 3 — Intelligence

Aqui entram:

```text
Coverage
Health
Evidence Confidence
Risk
Dependency
Impact
Capacity
Experience
Economics
Scenario
Maturity
```

O Health da V1.8.6 é o primeiro exemplar dessa arquitetura.

---

# 15. Camada 4 — Action

Depois da análise:

```text
Problem
   ↓
Opportunity
   ↓
Solution
   ↓
Experiment
   ↓
Initiative
   ↓
Task
   ↓
Metric
   ↓
Result
   ↓
Learning
```

Esse ciclo é o que impedirá a plataforma de terminar em “bonitos mapas”.

---

# 16. O maior problema que precisamos evitar

Não gostaria que a sidebar terminasse assim:

```text
Dashboard
Service Canvas
Journey
Blueprint
Whiteboard
Process
Touchpoints
Customers
Personas
Evidence
Research
Insights
Problems
Opportunities
Solutions
Experiments
Tasks
Metrics
Operations
Economics
Current Future
AI
Reports
...
```

Isso destruiria o princípio de simplicidade.

A arquitetura de navegação deveria girar em torno do **Serviço**.

Exemplo:

```text
SERVICE
Hamburgueria Central

Overview

DESENHAR
Journey
Blueprint
Whiteboards
Canvas

ENTENDER
Customers
Ecosystem
Processes
Evidence

MELHORAR
Problems
Opportunities
Solutions
Experiments

EXECUTAR
Initiatives
Tasks

MEDIR
Metrics
Health

Mais ▾
```

E conforme o produto amadurecer, nem todas essas opções precisam aparecer para todo usuário.

---

# 17. Uma Home do Serviço será necessária

Hoje estamos fazendo Blueprint Home e Journey Home.

Mas eventualmente precisamos subir um nível.

A entrada principal deveria ser:

```text
Hamburgueria Central
Service Home

Saúde                72
Cobertura             68%
Evidências            41%
Riscos                 4
Melhorias abertas      7

Continuar trabalhando

Journey
Última edição hoje

Blueprint
3 gaps críticos

Whiteboard
Workshop Discovery

Melhorias
2 experimentos ativos

────────────────────────

Próxima ação
Completar operação da etapa Pagamento
```

Isso transformaria o produto inteiro em um único sistema.

---

# 18. Novo roadmap consolidado

Agora eu mudaria o roadmap anterior para refletir o que já aprendemos.

## FASE A — terminar a experiência fundamental

### V1.8.7 — Journey Home

Aplicar o modelo validado no Blueprint:

```text
Journey Home
New Journey
Templates
Recent
Draft
Last edited
Owners
Status
```

E parar de jogar o usuário diretamente no editor.

**Gate:** alguém deve entender onde está e como começar antes de entrar no canvas.

---

### V1.8.8 — Journey Editor Standardization

Trazer ao Journey o padrão do Blueprint:

```text
Header
navigation
tabs
Inspector
toolbar contextual
empty states
Quick Add
Focus
filtros
views
zoom
```

Também padronizar:

```text
Stage
Customer Action
Touchpoint
Channel
Emotion
Evidence
Problem
Opportunity
Metric
```

**Gate:** Blueprint e Journey precisam parecer partes do mesmo produto.

---

### V1.8.9 — Journey Guided / Professional

Replicar o conceito que já funciona no Blueprint.

Guiado:

```text
O que o cliente está tentando fazer?
Onde ele interage conosco?
Como ele se sente?
Existe alguma dificuldade?
```

Profissional:

```text
Customer Action
Touchpoint
Channel
Emotion
Pain Point
Evidence
KPI
```

Mesma informação.

Linguagem diferente.

---

### V1.8.10 — Journey Health

Aplicar o conceito de Health à Journey.

Exemplos:

```text
! Etapa sem ação do cliente

△ Touchpoint sem canal

△ Pain point sem evidência

○ Etapa sem emoção

△ KPI sem origem

! Etapa sem conexão com a seguinte
```

E novamente:

```text
Diagnóstico
↓
Corrigir
↓
objeto correto
↓
Inspector
```

---

# 19. FASE B — congelamento arquitetural

## V1.9.0 — Product Architecture Freeze

Esta versão é fundamental.

Não acrescentaria funções visíveis importantes.

Fecharia:

```text
taxonomia
IDs
relations
view model
object model
Inspector contract
selection model
history
undo/redo
nomenclature
Current/Future rules
Health framework
permissions hooks
event model
```

**Gate:**

> nenhum conceito estrutural importante pode continuar indefinido.

Sem isso, cada módulo novo aumenta dívida técnica.

---

# 20. FASE C — Whiteboard-first

Aqui eu manteria a decisão que já havíamos tomado: **antes de ampliar brutalmente a plataforma, tornar o Whiteboard realmente bom**.

## V1.9.1 — Whiteboard Interaction Core

```text
pan
zoom
selection
marquee
multi-select
drag
resize
rotate
duplicate
copy/paste
undo/redo
delete
keyboard
context menu
```

---

## V1.9.2 — Alignment & Layout

```text
align
distribute
snap
grid
guides
group
ungroup
lock
order
layers
```

---

## V1.9.4 — Connectors

Setas:

```text
reta
curva
90°
tracejada
pontilhada
espessura
seta início
seta fim
labels
```

E smart routing.

---

## V1.9.4 — Frames

```text
Frame
Section
Area
Fit to content
Move children
Lock children
Frame navigation
```

Depois:

```text
Frames → apresentação
```

---

## V1.9.5 — Whiteboard Navigation

```text
mini-map
zoom controls
fit selection
fit board
breadcrumbs
outline
object search
```

---

## V1.9.6 — Multiple Whiteboards

Um Service pode possuir:

```text
Discovery
Workshop cliente
Processo atual
Ideação
Planejamento
Arquitetura
...
```

Sem criar múltiplos Services.

---

## V1.9.7 — Whiteboard Templates

Não apenas “colar um desenho”.

Template deve conter:

```text
estrutura
instruções
objetos
perguntas
frames
relações
```

---

# 21. FASE D — Smart Whiteboard

## V2.0 — Smart Objects

Agora entram objetos estruturados no quadro:

```text
Persona
Need
Journey
Stage
Touchpoint
Evidence
Insight
Problem
Opportunity
Solution
Metric
Task
Process
System
```

Visualmente continuam simples.

Mas pertencem ao Graph.

---

## V2.1 — Object Conversion

Uma das funções que considero mais importantes de toda a plataforma.

```text
Post-it
   ↓

Convert to...

Insight
Problem
Opportunity
Task
Evidence
Touchpoint
```

E:

```text
seleção
↓
Create Journey

seleção
↓
Create Process

seleção
↓
Create Blueprint
```

O Whiteboard vira a **porta de entrada informal para o Service Graph**.

---

# 22. FASE E — Hierarquia

## V2.2 — Service Hierarchy

Precisamos parar de pensar somente em mapas individuais.

Adicionar:

```text
Service
 └ Journey
     └ Stage
         └ Subjourney
             └ Touchpoint
```

E também:

```text
Portfolio
 └ Service
     └ Journey
         └ Process
```

---

## V2.3 — Drill-down

Clique:

```text
Pagamento
```

e entre em:

```text
Journey detalhada de Pagamento
```

ou:

```text
Processo de Pagamento
```

Sem congestionar o mapa principal.

---

# 23. FASE F — Service Canvas de verdade

Somente aqui eu faria a grande revisão do Service Canvas.

Ele não deveria competir com Whiteboard, Journey e Blueprint.

Sua função deveria ser:

> **visão sistêmica resumida do serviço.**

Algo como:

```text
SERVIÇO
Oferta
Promessa

CLIENTE
Segmentos
Necessidades

EXPERIÊNCIA
Journeys
Touchpoints críticos

ENTREGA
Processos
Pessoas
Sistemas

NEGÓCIO
Preço
Custo
Capacidade

CONTROLE
KPIs
Problemas
Oportunidades
```

E cada card é um link para objetos reais.

---

# 24. FASE G — Evidence & Research

Esse virou um ponto em que o mercado está avançando rapidamente.

## V2.5 — Evidence Layer

Toda afirmação importante pode possuir:

```text
Fonte
Tipo
Data
Origem
Autor
Confiança
Validade
Arquivo
Link
```

---

## V2.6 — Research Repository

```text
Entrevista
Survey
Review
Ticket
Transcript
Observation
Document
Image
Recording
```

---

## V2.7 — Insight Extraction

Manual primeiro:

```text
Evidence
   ↓
Insight
```

Depois IA.

---

# 25. FASE H — Improvement Graph

## V3.0 — Problems & Frictions

```text
Problem
Friction
Cause
Effect
Evidence
Severity
Owner
```

---

## V3.1 — Opportunities

```text
Opportunity
Impact
Reach
Confidence
Effort
Evidence
Journeys affected
Processes affected
```

---

## V3.2 — Solutions

```text
Opportunity
    ↓
Solutions
```

Uma Solution pode resolver várias Opportunities.

Uma Opportunity pode afetar várias Journeys.

Aqui começamos a alcançar o modelo vivo que ferramentas como TheyDo já utilizam. [TheyDo](https://www.theydo.com/help-center/building-blocks/intro-to-building-blocks/what-are-building-blocks?utm_source=chatgpt.com)

---

## V3.3 — Experiment Studio

```text
Hypothesis
Change
Expected result
Metric
Baseline
Target
Start
End
Result
Learning
```

---

# 26. FASE I — Operations

Aqui está uma das maiores oportunidades de diferenciação.

## V3.5 — Process Studio

```text
Input
Activities
Decision
Output
Role
System
SLA
Queue
Handoff
```

---

## V3.6 — Operational Ownership

Todo objeto operacional relevante deve poder ter:

```text
Responsible
Accountable
Team
Department
```

---

## V3.7 — Handoffs

Modelar:

```text
Marketing
    ↓
Vendas
    ↓
Operação
    ↓
Financeiro
```

Incluindo:

```text
entrada
saída
informação transferida
SLA
critério de aceite
```

---

# 27. FASE J — Metrics

## V4.0 — Metrics Studio

Um KPI não deveria ser apenas:

```text
NPS 72
```

Precisa possuir:

```text
Nome
Descrição
Formula
Unidade
Fonte
Frequência
Baseline
Target
Owner
Histórico
Objects measured
```

---

# 28. FASE K — Service Intelligence

Depois disso o Health cresce muito.

## V4.1 — Unified Health Framework

```text
Journey Health
Blueprint Health
Process Health
Service Health
```

Mas com explicabilidade.

Nunca:

```text
AI says 53
```

Sempre:

```text
53

Por quê?

- 3 etapas sem owner
- 2 processos incompletos
- 4 gaps críticos
- 62% dos pain points possuem evidência
```

---

## V4.2 — Dependency Intelligence

```text
Touchpoint
    ↓ depends on
Process
    ↓ uses
System
    ↓ owned by
Team
```

Se System falhar:

```text
Impacta
4 processos
7 touchpoints
2 journeys
```

---

## V4.3 — Risk

```text
Probability
Impact
Detection
Mitigation
Owner
```

---

## V4.4 — Capacity

```text
Demand
Capacity
Utilization
Queue
Wait
Cycle time
Bottleneck
```

---

## V4.5 — Experience Intelligence

Cruzar:

```text
Poor emotion
+
Pain point
+
Slow process
+
Low KPI
+
Evidence
```

Esse é o momento em que o software começa realmente a explicar o serviço.

---

# 29. FASE L — Economics

## V4.6 — Service Economics

```text
Revenue
Price
Cost
Margin
Demand
Capacity
Cost per delivery
Cost per stage
Cost per process
```

Isso é uma área onde a RealTalent pode ir além da maioria das ferramentas de Journey Mapping.

---

# 30. FASE M — Current × Future

## V5.0 — Current State

Snapshot estruturado:

```text
CURRENT
```

---

## V5.1 — Future State

Clonar semanticamente para:

```text
FUTURE
```

sem perder relacionamento com a origem.

---

## V5.2 — Delta View

Mostrar:

```text
Added
Removed
Changed
Same
```

---

## V5.3 — Transformation Plan

Cada diferença entre Current e Future pode gerar:

```text
Initiative
Task
Owner
Dependency
Metric
```

Isso fecha um ciclo muito importante:

```text
entender presente
↓
projetar futuro
↓
identificar diferença
↓
executar transformação
```

---

# 31. FASE N — IA

Somente aqui eu colocaria IA como grande protagonista.

## V6.0 — AI Interviewer

Pergunta em linguagem normal:

> O que acontece depois que o cliente pede orçamento?

E transforma respostas em estrutura.

---

## V6.1 — AI Modeler

```text
texto
↓
objects
↓
relations
```

Sempre mostrando o que será criado.

---

## V6.2 — AI Auditor

Usa o Health determinístico primeiro.

Depois complementa:

```text
“Existe um possível conflito entre estes processos...”
```

Ou seja:

```text
Rules Engine
+
AI reasoning
```

Nunca IA sozinha.

---

## V6.3 — Service Analyst

Perguntas:

> Onde estão os maiores gargalos?

> Quais problemas possuem mais evidência?

> Quais sistemas possuem maior impacto?

> Quais melhorias podem afetar mais jornadas?

---

## V6.4 — AI Editor

Aqui seguiria um padrão semelhante ao que TheyDo adotou: IA pode propor alterações, mas o usuário revisa antes de gravá-las. [TheyDo](https://www.theydo.com/help-center/ai-in-theydo/theydo-agent/editing-with-the-theydo-agent?utm_source=chatgpt.com)

---

# 32. FASE O — Collaboration

## V7.x

```text
Comments
Threads
@mentions
Presence
Permissions
Approval
Version history
Snapshots
Review
Voting
Workshop
Facilitator
```

---

# 33. FASE P — Cloud

Depois:

```text
organizations
users
memberships
auth
sync
realtime
attachments
audit log
backup
restore
```

Aqui o Service Graph precisa já estar congelado.

---

# 34. FASE Q — Integrações

## V8.x

A ordem que eu utilizaria:

```text
CSV / Excel
Google Sheets

RealTalent CRM

Gmail / Outlook
Calendar

HubSpot
Pipedrive
Salesforce

Webhooks
Public API
```

O CRM próprio pode se tornar particularmente interessante:

```text
Lead
↓
Touchpoint
↓
Journey
↓
Problem
↓
Opportunity
↓
Process
↓
KPI
```

Assim conseguimos utilizar dados reais para alimentar o modelo do serviço.

---

# 35. FASE R — Presentation

## V9.x

Criar modos separados.

### Editor

Tudo disponível.

### Presentation

Sem ferramentas.

### Story

```text
Frame 1
↓
Frame 2
↓
Frame 3
```

### Executive

```text
Health
KPIs
risks
opportunities
initiatives
```

### Share

link controlado.

---

# 36. Finalmente: produto comercial

## V10.x

Somente quando tudo anterior estiver razoavelmente sólido:

```text
Performance
Accessibility
Tablet
Offline
Observability
Security
LGPD
Administration
Billing
Commercial onboarding
Production
```

---

# 37. O fluxo definitivo da plataforma

O que estamos construindo deveria chegar a isto:

```text
                  SERVICE HOME
                       │
       ┌───────────────┼───────────────┐
       ↓               ↓               ↓
   Guided          Structured       Whiteboard
   Builder           Editor           Discovery
       │               │               │
       └───────────────┼───────────────┘
                       ↓
                 SERVICE GRAPH
                       │
     ┌──────────┬──────┼───────┬──────────┐
     ↓          ↓      ↓       ↓          ↓
  Journey   Blueprint Canvas Process  Ecosystem
     │          │      │       │          │
     └──────────┴──────┼───────┴──────────┘
                       ↓
                    HEALTH
                       ↓
                   EVIDENCE
                       ↓
Problem → Opportunity → Solution → Experiment
                       ↓
                   Initiative
                       ↓
                      Task
                       ↓
                     Metric
                       ↓
                     Result
                       ↓
                    Learning
                       ↓
                 SERVICE GRAPH
```

Esse loop é muito mais importante do que adicionar uma décima quinta ferramenta.

---

# 38. O que eu NÃO desenvolveria agora

Há coisas boas no roadmap que eu conscientemente seguraria:

```text
IA avançada
CRM integrations
cloud multi-user
marketplace
billing
mobile completo
automations
dashboards gigantes
economics avançado
simulador
```

Não porque sejam ruins.

Mas porque hoje podemos obter um salto muito maior terminando:

```text
Blueprint
+
Journey
+
Whiteboard
+
Service Graph
+
interaction architecture
```

primeiro.

---

# 39. As próximas versões que eu realmente faria

Se continuássemos o desenvolvimento agora, minha sequência prática seria:

| Ordem | Versão | Objetivo |
|---:|---|---|
| 1 | **V1.8.7** | Journey Home |
| 2 | **V1.8.8** | Journey Editor Standardization |
| 3 | **V1.8.9** | Journey Guided / Professional |
| 4 | **V1.8.10** | Journey Health + Gaps |
| 5 | **V1.9.0** | Product Architecture Freeze |
| 6 | **V1.9.1** | Whiteboard Selection Core |
| 7 | **V1.9.2** | Align / Snap / Group |
| 8 | **V1.9.4** | Connectors |
| 9 | **V1.9.4** | Frames |
| 10 | **V1.9.5** | Navigation / Mini-map |
| 11 | **V1.9.6** | Multiple Whiteboards |
| 12 | **V1.9.7** | Templates |
| 13 | **V2.0** | Smart Objects |
| 14 | **V2.1** | Object Conversion |
| 15 | **V2.2** | Hierarchy |
| 16 | **V2.3** | Drill-down |
| 17 | **V2.4** | Service Canvas 2.0 |
| 18 | **V2.5** | Evidence Layer |
| 19 | **V2.6** | Research Repository |
| 20 | **V3.0+** | Improvement / Operations / Metrics |

Isso também preserva sua decisão anterior de **amadurecer o Whiteboard antes de abrir dezenas de frentes novas**.

---

# 40. Minha conclusão sobre a plataforma

A V1.8.6 representa uma mudança de fase.

Até recentemente estávamos predominantemente tentando responder:

> **“Como desenhamos um serviço?”**

Agora podemos começar a construir a resposta para:

> **“Como o software entende o serviço que foi desenhado?”**

Depois:

> **“O que está errado ou incompleto?”**

Depois:

> **“Por que está acontecendo?”**

Depois:

> **“O que deveríamos mudar?”**

Depois:

> **“A mudança funcionou?”**

É nessa sequência que o RealTalent Service Studio deixa de ser um conjunto de ferramentas de Service Design e pode se transformar realmente no conceito que definimos desde o início:

**um Figma/AutoCAD do serviço por fora, mas um modelo operacional estruturado e vivo por dentro.**

E, comparando com a evolução atual de Miro, Smaply, UXPressia e principalmente TheyDo, eu faria uma correção importante no planejamento: **Research/Evidence, hierarquia e Improvement Graph precisam chegar antes do que pensávamos originalmente**, enquanto IA, integrações e cloud devem continuar depois da estabilização do núcleo. O mercado já está levando Journey Management nessa direção, e é justamente onde a arquitetura do Service Graph pode se tornar a principal força do projeto. [Smaply](https://www.smaply.com/tools/portfolio?utm_source=chatgpt.com)

A próxima implementação, portanto, eu manteria como **V1.8.7 — Journey Home**; mas agora ela passaria a ser a primeira etapa deste **Roadmap Mestre Consolidado pós-V1.8.6**, e não apenas uma melhoria isolada do Journey.
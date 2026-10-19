# RealTalent Service Studio
## Roadmap Mestre — Service Design Workspace

### Visão do produto

O RealTalent Service Studio será uma plataforma para **criar, visualizar, estruturar, analisar, melhorar, executar e medir serviços**.

A proposta não é criar apenas um Journey Mapper e também não é criar somente um Whiteboard.

O produto deve funcionar como um:

> **Figma + AutoCAD + sistema operacional para serviços.**

A pessoa poderá começar de formas diferentes dependendo do problema que deseja resolver.

```text
Criar um serviço
      │
      ├── Guided Builder
      ├── Journey
      ├── Whiteboard
      ├── Service Blueprint
      ├── Service Canvas
      ├── Process Flow
      ├── Ecosystem Map
      └── Template
             │
             ▼
        SERVICE GRAPH
             │
             ▼
Entender → Analisar → Melhorar → Executar → Medir
```

A complexidade do sistema fica escondida por trás de interfaces simples.

---

# 1. Princípio estrutural

O elemento principal não será o Canvas.

Não será o Journey.

Não será o Whiteboard.

Será:

# SERVICE

Um Serviço contém e relaciona todos os demais objetos.

```text
Service
│
├── Customers
├── Personas
├── Needs
├── Jobs
│
├── Journeys
│   ├── Stages
│   ├── Customer Actions
│   ├── Touchpoints
│   ├── Channels
│   ├── Emotions
│   └── Metrics
│
├── Blueprint
│   ├── Frontstage
│   ├── Backstage
│   ├── Processes
│   ├── Systems
│   ├── Resources
│   └── Responsibilities
│
├── Evidence
├── Insights
├── Problems
├── Frictions
├── Opportunities
├── Solutions
├── Experiments
│
├── Tasks
├── Initiatives
│
├── KPIs
├── Goals
└── Results
```

Todas as visualizações devem utilizar esses objetos sempre que possível.

---

# 2. A mudança importante: Views

Em vez de criar módulos completamente separados, criaremos diferentes formas de visualizar o serviço.

## Views principais

| View | Objetivo |
|---|---|
| Journey | Ver a experiência cronologicamente |
| Blueprint | Ver cliente + operação |
| Whiteboard | Pensar livremente |
| Canvas | Entender o serviço de maneira resumida |
| Process | Entender processos |
| Ecosystem | Entender pessoas, parceiros e sistemas |
| Improvement | Problemas e oportunidades |
| Experiment | Testar melhorias |
| Action Plan | Executar |
| Metrics | Medir |
| Current × Future | Comparar transformação |

O mesmo objeto pode aparecer em várias views.

---

# 3. Whiteboard

O Whiteboard deve ser desenvolvido como uma verdadeira ferramenta da plataforma.

Mas não devemos simplesmente recriar o Miro.

Teremos dois tipos de objetos.

## Objetos livres

```text
Texto
Título
Post-it
Forma
Imagem
Documento
Seta
Conector
Linha
Área
Frame
Tabela
Checklist
Ícone
Comentário
Link
```

Funcionam como Whiteboard tradicional.

---

## Objetos inteligentes

Objetos conectados ao Service Graph.

```text
Persona
Need
Stage
Touchpoint
Channel
Emotion
Evidence
Problem
Insight
Opportunity
Solution
Experiment
Metric
Task
Process
System
Responsible
Resource
```

Exemplo:

O usuário coloca no Whiteboard:

```text
[Problema]
Cliente demora para pagar
```

Esse card pode virar um objeto real `Problem`.

Posteriormente ele aparece automaticamente na área:

**Melhorias → Problemas**

Sem necessidade de copiar manualmente.

---

# 4. Free Object × Smart Object

Essa distinção é fundamental.

Um post-it amarelo comum:

```text
"talvez estudar WhatsApp"
```

não precisa virar parte da base estrutural.

Mas o usuário pode selecionar:

**Converter em → Oportunidade**

O sistema transforma o post-it em:

```text
Opportunity
Título:
Melhorar atendimento através do WhatsApp

Origem:
Whiteboard

Relacionada a:
Etapa Atendimento
```

Esse conceito cria uma ponte extremamente interessante entre:

**pensamento livre → estrutura.**

---

# 5. Whiteboard — experiência

O Whiteboard terá:

### Navegação

Pan  
Zoom  
Mini-map  
Fit to content  
Frames  
Foco em seleção

### Seleção

Seleção individual  
Seleção múltipla  
Drag selection  
Ctrl/Shift selection  
Select all

### Organização

Align  
Distribute  
Group  
Ungroup  
Lock  
Unlock  
Bring forward  
Send backward  
Duplicate

### Conectores

Reto  
Curvo  
90°  
Tracejado  
Pontilhado

Com:

seta inicial  
seta final  
espessura  
estilo

### Post-its

Cor diretamente no objeto.

Tamanho.

Tags.

Responsável.

Conversão para objetos inteligentes.

---

# 6. Frames

Os Frames serão extremamente importantes.

Exemplo:

```text
┌──────────────────────────────┐
│     Atendimento atual        │
│                              │
│ Post-it → Problema → Insight │
│                              │
└──────────────────────────────┘
```

Um Frame poderá representar:

Service  
Journey  
Stage  
Workshop  
Área do processo  
Tema

Além disso, poderá ser apresentado em modo apresentação.

---

# 7. Whiteboard → View estruturada

Uma das funções mais diferenciadas pode ser:

# Transformar seleção em estrutura

Exemplo:

O usuário desenha:

```text
Descobre empresa
      ↓
Entra no Instagram
      ↓
Chama no WhatsApp
      ↓
Agenda
      ↓
Compra
```

Seleciona tudo e escolhe:

**Criar Journey**

O sistema propõe:

```text
Stage 1 — Descoberta
Stage 2 — Avaliação
Stage 3 — Contato
Stage 4 — Agendamento
Stage 5 — Compra
```

A pessoa confirma.

Agora existe uma Journey estruturada.

---

# 8. V1.4 — Core Architecture

Primeiro devemos fortalecer a fundação.

### Service Graph 2.0

Criar schemas formais para:

Service  
Journey  
Stage  
Touchpoint  
Problem  
Opportunity  
Task

Preparar arquitetura para os objetos futuros.

### Engenharia

Separar:

```text
/domain
/state
/views
/components
/repositories
/services
```

Reduzir responsabilidade do `App.tsx`.

Adicionar:

schema version  
migration system  
Repository pattern  
autosave  
import/export JSON  
undo history estruturado

### Resultado

Uma fundação que aguenta crescimento sem virar um sistema frágil.

---

# 9. V1.5 — Structured Journey

Transformar Journey em estrutura real.

Criar:

CustomerAction

Ampliar Touchpoint.

Criar:

Channel  
Emotion

Emotion:

```text
Muito negativa
Negativa
Neutra
Positiva
Muito positiva
```

Adicionar Emotion Curve.

---

# 10. Lanes configuráveis

O Journey deixa de ter apenas linhas fixas.

Usuário poderá escolher:

```text
ESSENCIAL

Customer Action
Touchpoint
Emotion

ENTENDER

Need
Expectation
Evidence
Problem
Friction

MELHORAR

Insight
Opportunity
Solution

MEDIR

Metric

CUSTOM

Text
Number
Scale
Boolean
Tags
```

Cada Journey pode ter sua própria configuração.

---

# 11. V1.6 — Universal Inspector

Todo objeto selecionado abre o mesmo Inspector.

Exemplo:

```text
Touchpoint

Nome
Descrição
Canal
Etapa
Responsável
Evidências
Problemas
Métricas
Tags
```

Inspector muda dinamicamente de acordo com o objeto.

Isso evita vários modais diferentes.

---

# 12. V1.7 — Guided Mode

Criar dois modos principais.

## Guided

Para usuário não especialista.

Em vez de conceitos complexos, fazemos perguntas.

```text
O que o cliente está tentando fazer?

Onde isso acontece?

Quem atende o cliente?

O que costuma dar errado?

Como sabemos disso?

O que poderia ser melhorado?
```

---

## Professional

Expõe:

objetos  
relações  
tags  
evidence  
metrics  
responsáveis  
bulk editing  
advanced controls

---

# 13. V1.8 — Evidence Layer

Criar Evidence como objeto.

Tipos:

```text
Customer quote
Interview
Observation
Complaint
Research
Analytics
Photo
Video
Document
Data
External source
```

Estrutura:

```text
Evidence
├── title
├── type
├── source
├── content
├── confidence
├── date
├── attachments
└── relationships
```

Pode estar ligado a:

Stage  
Touchpoint  
Problem  
Insight  
Opportunity

---

# 14. V1.9 — Journey Health

Adicionar análise estrutural determinística.

Exemplo:

```text
Journey Health
78%

✓ Todas as etapas possuem ação
✓ Touchpoints identificados
⚠ 3 problemas sem evidência
⚠ 2 oportunidades sem solução
○ Métricas ainda não definidas
```

Não depende de IA.

---

# 15. V2.0 — Improvement Graph

Estruturar:

```text
Evidence
   ↓
Insight
   ↓
Problem / Friction
   ↓
Opportunity
   ↓
Solution
   ↓
Experiment
   ↓
Initiative / Task
   ↓
Metric
   ↓
Result
```

Esse será um dos principais diferenciais do produto.

---

# 16. V2.1 — Opportunity Workspace

Área dedicada a melhorias.

Visualizações:

List  
Board  
Impact/Effort  
Journey overlay

Filtros:

Journey  
Stage  
Customer  
Touchpoint  
Responsible  
Status

---

# 17. Opportunity Scoring

Permitir critérios simples:

Impacto  
Esforço  
Confiança  
Reach  
Urgência

Mas sem obrigar o usuário.

Modo simples:

```text
Impacto    Alto
Esforço    Baixo
```

Resultado:

**Boa oportunidade para analisar**

Sem criar sistemas de pontuação desnecessariamente complexos.

---

# 18. V2.2 — Solution & Experiment

Opportunity não vira Task diretamente.

Criar:

Solution

e depois:

Experiment.

Exemplo:

```text
Opportunity
Reduzir abandono de agendamento

Solution
Agendamento simplificado

Experiment
Remover etapa de cadastro

Metric
Completion Rate
```

---

# 19. V2.3 — Structured Service Blueprint

Reconstruir completamente o Blueprint atual.

Cada Stage da Journey será uma coluna.

Linhas:

```text
Customer Action
Touchpoint
Evidence
────────────────
Frontstage
────────────────
Backstage
Process
System
Resource
Responsible
```

Assim Journey e Blueprint realmente utilizam a mesma estrutura.

---

# 20. V2.4 — Current × Future

Permitir cenários:

```text
CURRENT
FUTURE
```

Cada objeto pode estar:

Unchanged  
Modified  
New  
Removed

Visualização:

```text
Atual | Futuro | Comparar
```

Diff automático:

```text
3 touchpoints removidos
2 touchpoints criados
1 processo alterado
2 problemas tratados
1 sistema substituído
```

---

# 21. V2.5 — Whiteboard Core

Aqui começamos o Whiteboard propriamente dito.

Implementar:

Infinite Canvas  
Pan/Zoom  
Multi-select  
Shapes  
Text  
Post-it  
Connectors  
Frames  
Groups  
Images  
Layers  
Grid  
Snap

Persistência completa.

---

# 22. V2.6 — Whiteboard Smart Objects

Adicionar Service Objects ao Whiteboard.

Palette:

```text
SERVICE

Persona
Journey
Stage
Touchpoint
Evidence
Problem
Opportunity
Solution
Metric
Task
Process
System
```

Cada objeto abre Universal Inspector.

---

# 23. V2.7 — Whiteboard Conversion

Funções:

```text
Post-it → Problem
Post-it → Insight
Post-it → Opportunity
Post-it → Task

Seleção → Journey

Seleção → Process

Seleção → Service Blueprint

Frame → Workshop
```

Esse será um recurso bastante diferenciador.

---

# 24. V2.8 — Whiteboard Templates

Criar biblioteca.

Categorias:

### Discovery

Stakeholder Map  
Research Wall  
Affinity Mapping  
Interview Synthesis  
Problem Framing

### Customer

Persona  
Empathy Map  
Jobs To Be Done  
Needs Map

### Service

Service Canvas  
Journey Map  
Service Blueprint  
Service Ecosystem  
Touchpoint Map

### Improvement

Problem Tree  
Opportunity Tree  
Impact/Effort  
How Might We  
Solution Mapping

### Operation

Process Map  
Swimlane  
SIPOC  
RACI

### Strategy

Value Proposition  
Business Model  
Service Strategy  
North Star

### Workshop

Brainstorm  
Dot Voting  
Retrospective  
Crazy 8  
Prioritization

---

# 25. V2.9 — Multiple Whiteboards

Um Service poderá conter:

```text
Whiteboards
├── Discovery
├── Workshop cliente
├── Processo atual
├── Ideias
├── Novo atendimento
└── Workshop equipe
```

O usuário pode criar quantos quiser.

---

# 26. V3.0 — Multiple Journeys

Um serviço não precisa possuir somente uma jornada.

Exemplo restaurante:

```text
Service
Restaurante

Journeys
├── Reserva
├── Experiência presencial
├── Delivery
├── Reclamação
└── Fidelização
```

Todos compartilham objetos do mesmo Service Graph.

---

# 27. V3.1 — Journey Hierarchy

Adicionar:

Macro Journey  
Journey  
Subjourney

Exemplo:

```text
Relacionamento com restaurante
│
├── Descoberta
├── Compra
│   ├── Presencial
│   └── Delivery
│
└── Pós-venda
```

---

# 28. V3.2 — Persona & Customer

Criar biblioteca reutilizável de:

Customers  
Segments  
Personas

Persona terá:

Needs  
Jobs  
Expectations  
Behaviors  
Pain points  
Evidence

Journeys poderão usar uma ou mais Personas.

---

# 29. V3.3 — Needs & Jobs

Adicionar:

Need  
Job To Be Done  
Expectation

Relacionáveis a:

Persona  
Journey  
Stage  
Touchpoint

---

# 30. V3.4 — Service Ecosystem

Criar visualização em rede.

Centro:

Service

Ao redor:

Customers  
Employees  
Partners  
Suppliers  
Systems  
Channels  
Regulators  
Platforms

Permitir diferentes layouts:

Radial  
Network  
Layers

---

# 31. V3.5 — Process Designer

Criar processo estruturado.

Elementos:

Start  
Action  
Decision  
Wait  
System  
Person  
End

Conectar com:

Stage  
Backstage  
System  
Responsible

---

# 32. V3.6 — Operations Layer

Adicionar:

People  
Responsible  
Team  
System  
Resource  
Supplier  
Capacity

Isso aproxima Service Design de Service Operations.

---

# 33. V3.7 — Metrics

Criar Metric como objeto.

Tipos:

Customer:

NPS  
CSAT  
CES

Operational:

Time  
Error rate  
Capacity  
SLA

Commercial:

Conversion  
Revenue  
Retention  
Churn

Custom.

---

# 34. V3.8 — Metric Overlay

Permitir sobrepor dados na Journey.

Exemplo:

```text
Descoberta
Conversion 17%

Contato
Response Time 14 min

Compra
Conversion 62%

Pós-venda
CSAT 4.3
```

---

# 35. V3.9 — Service Health

Evoluir Journey Health para Service Health.

Dimensões:

Customer Experience  
Operational Health  
Evidence Coverage  
Problem Density  
Opportunity Coverage  
Measurement Coverage

Não virar apenas uma “nota”.

Mostrar causas.

---

# 36. V4.0 — Service Canvas

Criar visão executiva resumida do Serviço.

Possíveis blocos:

Customer  
Need  
Value Proposition  
Journey  
Touchpoints  
Operation  
People  
Systems  
Problems  
Metrics  
Economics

Tudo puxado do Service Graph.

---

# 37. V4.1 — Service Economics

Adicionar:

Offer  
Price  
Cost  
Margin  
Capacity  
Demand

Objetivo:

ligar experiência com viabilidade econômica.

Exemplo:

```text
Problema:
tempo de espera

Causa:
capacidade insuficiente

Impacto:
- CSAT
- abandono
- receita
```

---

# 38. V4.2 — Service Portfolio

Usuário poderá ter:

```text
Workspace
│
├── Serviço A
├── Serviço B
├── Serviço C
└── Serviço D
```

Portfolio View mostrando:

Health  
Opportunities  
Metrics  
Initiatives  
Status

---

# 39. V4.3 — Presentation Mode

Journey, Blueprint, Whiteboard e outros modos poderão ser apresentados.

Frames podem virar slides.

Funções:

Full-screen  
Next/Previous  
Presenter notes  
Hide editor UI

---

# 40. V4.4 — Export

Exportar:

PDF  
PNG  
SVG  
CSV  
JSON

Também:

Journey Report  
Blueprint Report  
Service Report  
Improvement Report

---

# 41. V4.5 — Collaboration

Criar:

Comments  
Mentions  
Assignments  
Activity history  
Version history

Depois:

Real-time collaboration.

---

# 42. V4.6 — Workshops

Criar modo facilitação.

Timer  
Voting  
Anonymous ideas  
Private writing  
Reveal simultaneously  
Dot voting

Templates de workshops.

---

# 43. V5.0 — Guided Service Builder

Criar serviço através de uma experiência guiada.

Pergunta inicial:

```text
O que você quer fazer?

○ Mapear um serviço existente
○ Criar um novo serviço
○ Resolver um problema
○ Melhorar a experiência
○ Melhorar uma operação
○ Fazer um workshop
○ Começar em branco
```

A escolha define a jornada de criação.

---

# 44. V5.1 — Context Before Tool

O sistema não pergunta:

> “Qual template deseja?”

Primeiro pergunta:

> “O que você está tentando resolver?”

Exemplo:

```text
Clientes reclamam muito
```

O sistema sugere:

```text
1. Mapear jornada
2. Registrar evidências
3. Identificar problemas
4. Criar oportunidades
```

Depois abre as ferramentas adequadas.

---

# 45. V5.2 — Playbooks

Criar Playbooks orientados.

Exemplos:

Improve Customer Experience  
Design New Service  
Reduce Waiting Time  
Improve Onboarding  
Reduce Complaints  
Improve Delivery  
Map Current Service  
Redesign Process

Playbook define:

Steps  
Tools  
Templates  
Outputs

---

# 46. V5.3 — Service Workspace Home

Ao abrir um serviço:

```text
RESTAURANTE DELIVERY

Health
Journeys
Blueprint
Whiteboards

─────────────

Needs attention

3 problems without evidence
2 opportunities waiting decision
1 experiment running

─────────────

Recent activity
```

---

# 47. V5.4 — Command Palette

Adicionar:

`Ctrl + K`

Exemplo:

```text
Create Journey
Create Whiteboard
Add problem
Search touchpoint
Open Blueprint
Create opportunity
```

---

# 48. V5.5 — Global Search

Pesquisar todo o Service Graph.

```text
"pagamento"
```

Resultados:

Stage  
Touchpoint  
Problem  
Evidence  
Opportunity  
Task  
Metric

---

# 49. V6.0 — Integrations

Integrações começam depois da base estrutural.

Possíveis:

Google Drive  
OneDrive  
Slack  
Teams  
Jira  
Linear  
Trello  
Notion

Posteriormente:

CRM  
Customer Support  
Survey  
Analytics

---

# 50. V6.1 — Data Sources

Permitir dados externos em Metrics.

Exemplo:

Google Sheets → métricas  
CRM → conversão  
Survey → CSAT  
Support → reclamações

---

# 51. V6.2 — Research Repository

Criar uma área específica para:

Interviews  
Documents  
Observations  
Survey results  
Customer feedback

Relacionar Evidence ao conteúdo original.

---

# 52. V7.0 — RealTalent Service Assistant

Somente depois do Service Graph estar maduro.

Assistant contextual.

Exemplo:

```text
Estou vendo a etapa Pagamento.

Você possui:
2 touchpoints
3 problemas
1 evidência
0 métricas

Quer analisar essa etapa?
```

---

# 53. V7.1 — AI Analysis

IA poderá detectar:

Possible duplicate objects  
Missing relationships  
Patterns  
Recurring complaints  
Evidence clusters  
Service gaps

Mas sempre mostrando a base utilizada.

---

# 54. V7.2 — AI Service Designer

Usuário pergunta:

```text
Como posso melhorar meu processo de entrega?
```

Assistant analisa:

Journey  
Blueprint  
Problems  
Evidence  
Metrics  
Processes

e sugere hipóteses.

Não modifica nada sem confirmação.

---

# 55. V7.3 — AI Whiteboard

No Whiteboard:

Selecionar vários post-its.

Ação:

```text
Organizar
Agrupar por tema
Transformar em problemas
Criar resumo
Gerar Journey
Encontrar padrões
```

Esse é um dos lugares onde IA realmente será útil.

---

# 56. V7.4 — AI Research Synthesis

A partir de entrevistas, feedback e documentos:

```text
Evidence
    ↓
Themes
    ↓
Insights
    ↓
Problems
```

Mantendo rastreabilidade até a fonte.

---

# 57. V8.0 — Service Intelligence

Criar camada analítica transversal.

Exemplo:

```text
INSIGHT

O touchpoint WhatsApp aparece em
4 jornadas.

Está relacionado a:
7 problemas
3 oportunidades
2 experimentos

Problema recorrente:
tempo de resposta
```

Isso só é possível porque construímos o Service Graph primeiro.

---

# 58. V8.1 — Dependency Map

Mostrar relações entre melhorias.

```text
Novo checkout
    ↓
Depende de
Sistema de pagamento
    ↓
Impacta
Journey Compra
    ↓
Resolve
2 problemas
```

---

# 59. V8.2 — Transformation Roadmap

Transformar melhorias em roadmap.

```text
NOW

WhatsApp
Checkout

NEXT

CRM integration
Automação

LATER

Loyalty
```

Tudo ligado ao Service Graph.

---

# 60. V8.3 — Benefits Realization

Depois da implementação:

```text
Opportunity
↓
Solution
↓
Experiment
↓
Implementation
↓
Metric before
↓
Metric after
↓
Result
```

A plataforma finalmente consegue responder:

> A melhoria funcionou?

---

# Arquitetura geral final

```text
                   SERVICE STUDIO
                         │
                    SERVICE GRAPH
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
   EXPERIENCE        OPERATIONS        IMPROVEMENT
       │                 │                 │
    Journey           Blueprint         Problems
    Persona           Process           Evidence
    Needs             People            Insights
    Touchpoint        Systems           Opportunities
    Emotion           Resources         Solutions
                                       Experiments
                                           │
                                           ▼
                                       EXECUTION
                                           │
                                      Tasks
                                      Roadmap
                                           │
                                           ▼
                                       MEASURE
                                           │
                                       Metrics
                                       Results
```

E por cima:

```text
VIEWS

Journey
Blueprint
Whiteboard
Canvas
Process
Ecosystem
Improvement
Metrics
Roadmap
```

---

# Navegação futura

A sidebar principal poderá evoluir para:

```text
REAL TALENT

SERVIÇO
Overview

DESIGN
Journey
Blueprint
Whiteboards
Canvas
Processes
Ecosystem

UNDERSTAND
Customers
Personas
Research
Evidence

IMPROVE
Problems
Opportunities
Solutions
Experiments

EXECUTE
Initiatives
Tasks
Roadmap

MEASURE
Metrics
Results

LIBRARY
Objects
Templates

Assistant
Settings
```

Essa sidebar não precisa aparecer completa para o iniciante. O Guided Mode pode mostrar somente Overview, Journey, Whiteboard, Blueprint, Improvements e Metrics.

---

# Princípio de UX

> Simple outside. Structured inside.

O usuário vê “+ Problema”. Internamente, o objeto pode ter id, serviceId, stageIds, touchpointIds, evidenceIds, owner, priority, status e datas. A interface só expõe a profundidade necessária naquele contexto.

---

# Os quatro pontos de entrada

1. **Guided:** “Eu não sei Service Design.” O sistema conduz.
2. **Structured:** “Quero criar uma Journey ou Blueprint.” O usuário trabalha em estrutura.
3. **Freeform:** “Quero pensar primeiro.” Abre o Whiteboard.
4. **Template:** “Já sei o que quero criar.” Escolhe um modelo.

---

# Prioridade real de desenvolvimento

As versões são divididas em ondas, não em itens de urgência equivalente.

## ONDA 1 — Fundação (V1.4–V1.9)

Tornar sólidos a Journey e o Service Graph. Resultado: um Journey Editor estruturado.

## ONDA 2 — Serviço estruturado (V2.0–V2.4)

Ligar Experience Design a Improvement. Resultado: Journey + Blueprint + Improvement Graph.

## ONDA 3 — Whiteboard (V2.5–V2.9)

Adicionar liberdade criativa. Resultado: Freeform + Structured trabalhando juntos. É uma onda prioritária.

## ONDA 4 — Service Modeling (V3.0–V3.9)

Modelar o serviço inteiro. Resultado: Experience + Operation + Metrics.

## ONDA 5 — Workspace (V4.0–V5.5)

Transformar ferramentas em uma plataforma. Resultado: Service Operating Workspace.

## ONDA 6 — Connected Platform (V6.x)

Trazer dados externos.

## ONDA 7 — Intelligence (V7.x–V8.x)

Usar o conhecimento estruturado para criar inteligência real.

---

# Visão de produto resultante

O RealTalent permitirá entrar em um serviço e trabalhar em Overview, Journey, Blueprint, Whiteboard, Canvas, Process, Ecosystem, Problems, Opportunities, Experiments e Metrics, sempre sobre o mesmo serviço.

O Whiteboard será a camada de liberdade: o usuário pode começar desenhando sem regras e converter partes do quadro em objetos estruturados quando fizer sentido.

A próxima entrega é **V1.4 — Core Architecture / Service Graph 2.0**. A arquitetura já deve estar preparada para Whiteboard e Smart Objects, que terão editor próprio a partir da V2.5.

---

# Entrega antecipada — V1.4.4 Whiteboard Interaction & UI Refinement

O editor de Whiteboard previsto originalmente para uma onda posterior foi antecipado para validar a experiência central de modelagem visual. A V1.4.4 consolida canvas dominante, drawers contextuais, frames-containers, conexões por handles, seleção múltipla, guias inteligentes e importação assistida da Jornada.

Roadmap Whiteboard ativo: **V1.4.9 — Visual Objects entregue**. Próximo foco: **V1.5.0 — Editing Productivity**, consolidando undo/redo robusto, clipboard, command palette, menu contextual e atalhos antes de templates, Smart Layout e Smart Objects.


---

# Atualização do roadmap ativo — Whiteboard Core

O desenvolvimento de novas grandes áreas permanece congelado até a estabilização do Whiteboard Core.

Status atual:

- V1.4.5 Interaction Core — entregue
- V1.4.6 Connections Engine — entregue
- V1.4.7 Frames & Structure — entregue
- V1.4.8 Infinite Canvas & Navigation — entregue
- V1.4.9 Visual Objects — entregue
- V1.4.10 Consolidation & UX QA — entregue
- V1.5.0 Editing Productivity — entregue
- V1.5.1 Template Engine — entregue
- **V1.5.2 Smart Layout — entregue**
- V1.5.3 Smart Objects / Service Graph — entregue
- V1.5.4 Visualizations Engine — entregue
- V1.5.5 Persistence & Reliability — entregue
- V1.5.6 Import / Export
- V1.5.7 Presentation Mode
- V1.5.8 Performance
- V1.5.9 UX Polish
- V1.6.0 Whiteboard Core 1.0

## Whiteboard V1.5.3 — Smart Objects / Service Graph — entregue

- Entity → Instance → View Layout formalizado;
- navegador do Service Graph integrado ao Whiteboard;
- conteúdo canônico sincronizado entre instâncias;
- Evidence / Process / System / Person / Insight como entidades canônicas;
- Free Object → Smart Object;
- Smart Object → Free Object sem apagar a Entity;
- duplicar instância separado de duplicar entidade;
- backlinks e localização de instâncias em outros quadros;
- referência ausente detectável e reparável;
- migração V1.5.2 → V1.5.3.

Próxima etapa do Whiteboard: **V1.5.4 — Visualizations Engine**.

## Whiteboard V1.5.4 — Visualizations Engine — entregue

- Livre, Fluxo, Journey e Blueprint formalizados como views do mesmo modelo;
- layouts independentes e restauráveis;
- Journey Matrix Etapas × Experiência;
- Blueprint Matrix Etapas × Operação;
- Fluxo orientado por conexões existentes sem criar relações automaticamente;
- Visualizations Engine central;
- migração V1.5.3 → V1.5.4.

Próxima etapa Whiteboard: **V1.5.5 — Persistence & Reliability**.


## V1.5.5 — Persistence & Reliability — CONCLUÍDA

- autosave revisionado e consistente entre Graph/meta;
- mirror durável em IndexedDB;
- checkpoints rotativos;
- recovery automático;
- session heartbeat;
- Recovery Center;
- migrations formais.

**Próxima:** V1.5.6 — Import / Export.

## V1.5.5.1 — Whiteboard Semantic & Layout QA — CONCLUÍDA

Patch de consolidação antes de V1.5.6, priorizando Flow Layout, zero-overlap, routing, Smart Templates, Visual × Semantic Type, semantic zoom e redução de redundâncias de UX.

Próxima etapa Whiteboard: **V1.5.6 — Import / Export Engine**.


## Atualização 2026-09-30 — Whiteboard V1.5.7
O roadmap amplo permanece congelado até Whiteboard Core 1.0.

- V1.5.6 Structured Views Foundation — entregue
- **V1.5.7 Journey Primitives — entregue**
- V1.5.8 Import / Export Engine — próximo
- V1.5.9 Performance & UX Polish — futuro
- V1.6.0 Whiteboard Core 1.0 — gate de estabilização

V1.5.7 adiciona Persona, Canal e Emoção como entidades do Service Graph e uma Emotion Curve por Persona na Journey View.

## V1.5.9 — Whiteboard Performance & UX Polish — CONCLUÍDA
- viewport culling e redução do DOM;
- render coalescing por frame;
- semantic zoom otimizado;
- minimapa escalável;
- responsividade e acessibilidade refinadas;
- stress tests até 5.000 objetos;
- preparação final para Whiteboard Core 1.0.

**Próxima:** V1.6.0 — Whiteboard Core 1.0.


# Marco V1.6.0 — Whiteboard Core 1.0
O motor Whiteboard foi promovido a baseline estável. Novos módulos devem reutilizar seus contratos de Entity → Instance → View, containers, connections, Structured Views, persistência e portabilidade, evitando motores paralelos.


# Pós Whiteboard Core — V1.7.0 Journey Studio 1.0
Primeiro módulo construído sobre a baseline Core 1.0.
- **V1.7.0 Journey Studio 1.0 — entregue nesta release**
- V1.8.0 Service Blueprint 1.0
- V1.9.0 Service Hierarchy + Linked Objects
- V2.0 Personas & Customer Understanding
- V2.1 Metrics in Context
- V2.2 Research & Evidence
- V2.3 Improvement Portfolio

## Ciclo de padronização pós-Blueprint

- [x] **V1.8.1 — Design System + Global Shell**: tokens RealTalent, shell global, editor shell, toolbar e ações padronizadas.
- [x] **V1.8.2 — Blueprint Home + Create Flow**: Home do módulo, recentes, cards/lista, busca, status, templates e criação guiada antes do editor.
- [ ] **V1.8.3 — Blueprint Editor Layout Standardization**.
- [x] **V1.8.4 — Blueprint Grid UX + Cells + Sticky Headers**.
- [x] **V1.8.5 — Guided / Professional + Learning**.
- [ ] **V1.8.5 — Guided / Professional + Learning**.
- [ ] **V1.8.6 — Blueprint Health + Gaps**.
- [ ] **V1.8.7 — Journey Home**.
- [ ] **V1.8.8 — Journey Editor UI Standardization**.
- [ ] **V1.8.9 — Global UX QA + Responsive**.
- [ ] **V1.9.0 — Service Hierarchy + Linked Objects**.

## V1.8.3 — Blueprint Editor Layout Standardization — concluída

- Header contextual Blueprint.
- Blueprint Panel separado do Inspector.
- Estrutura / Contexto / Governança.
- Canvas settings separados.
- Inspector padronizado.
- Side panels mutuamente exclusivos.

### Próximo

V1.8.4 — Blueprint Grid UX + Cells + Sticky Headers.

## Ciclo de padronização Blueprint — atualização V1.8.4

- V1.8.1 — Design System + Global Shell — concluída
- V1.8.2 — Blueprint Home + Create Flow — concluída
- V1.8.3 — Blueprint Editor Layout Standardization — concluída
- V1.8.4 — Blueprint Grid UX + Cells + Sticky Headers — concluída
- V1.8.5 — Guided / Professional + Learning — próxima
- V1.8.6 — Blueprint Health + Gaps
- V1.8.7 — Journey Home no mesmo padrão
- V1.8.8 — Journey Editor UI Standardization
- V1.8.9 — Global UX QA + Responsive


## Ciclo de padronização Blueprint — atualização V1.8.5

- V1.8.1 — Design System + Global Shell — concluída
- V1.8.2 — Blueprint Home + Create Flow — concluída
- V1.8.3 — Blueprint Editor Layout Standardization — concluída
- V1.8.4 — Blueprint Grid UX + Cells + Sticky Headers — concluída
- V1.8.5 — Guided / Professional + Learning — concluída
- Próxima: V1.8.6 — Blueprint Health + Gaps


## V1.8.6 — Blueprint Health + Gaps — concluída
- Health Score determinístico
- Gaps por etapa/lane
- Ownership e governança
- Atalhos de correção
- Marcadores no canvas

Próximo: V1.8.7 — Journey Home no mesmo padrão visual.

# V1.20.5-H7.26 — Research Studio + Insight Pipeline

## Objetivo

Transformar `Pesquisa` de uma coleção de telas/artefatos em um fluxo operacional rastreável dentro do mesmo Service Workspace.

A H7.26 introduz a cadeia canônica:

`Projeto de pesquisa -> Material -> Observação -> Evidência -> Insight -> Necessidade/Hipótese`

O objetivo é impedir que conclusões apareçam desconectadas da fonte e criar uma fundação para Proposição do Serviço, cenários, prototipagem e mensuração nas próximas fases.

## Adicionado

### Research Studio

Nova perspectiva `Pesquisa` dentro do `Service Workspace`, antes de Ecologia e Journey.

O Studio possui cinco superfícies:

- Projetos;
- Campo & materiais;
- Evidências;
- Insights;
- Rastreabilidade.

### Projetos de pesquisa

`ResearchProject` passa a representar uma iniciativa de pesquisa com:

- nome e objetivo;
- método;
- status;
- serviço relacionado;
- datas e rastreabilidade.

Métodos suportados:

- entrevista;
- observação;
- Service Safari;
- shadowing;
- survey/pesquisa;
- atendimento;
- analytics;
- documento;
- workshop;
- experimento;
- outro.

### Material e observações de campo

`ResearchSource` foi ampliado para preservar projeto, método e amostra.

`ResearchObservation` separa quatro tipos de registro:

- O que disseram;
- O que observamos;
- O que medimos;
- Contexto.

Essa separação evita tratar qualquer fala ou nota bruta como insight.

### Observação -> Evidência

Uma observação pode ser promovida para a entidade canônica `evidence`.

A promoção preserva:

- `sourceIds`;
- `observationIds`;
- método;
- data;
- amostra;
- confiança;
- projeto de origem.

Não é criada uma cópia paralela da evidência.

### Evidência -> Insight

Um Insight exige evidências de suporte. O sistema registra os `evidenceIds` que fundamentam a interpretação.

O Research Studio diferencia material bruto, observação, evidência e interpretação para manter a cadeia epistemológica visível.

### Insight -> decisão

Um insight pode ser promovido para:

- Necessidade;
- Hipótese de problema.

A H7.26 deliberadamente **não cria um Problema validado diretamente a partir de um Insight**. Continua valendo a regra H7.6: Problemas precisam nascer de uma hipótese validada com evidência suficiente.

### Rastreabilidade

Nova leitura ponta a ponta permite seguir:

`Projeto -> Material -> Observação -> Evidência -> Insight -> Necessidade/Hipótese/Problema`

O relatório também detecta:

- observações ainda não transformadas em evidência;
- evidências com proveniência incompleta;
- insights sem evidência;
- lacunas no pipeline.

### Readiness

O Service Workspace passa de quatro para cinco perspectivas:

1. Pesquisa;
2. Ecologia;
3. Journey;
4. Blueprint;
5. Whiteboard.

## Arquitetura

A pesquisa continua dentro de `ServiceGraph.research` e as decisões finais continuam em `graph.entities`.

Não foi introduzido armazenamento paralelo em `localStorage` para Projects, Observations, Evidence ou Insights.

A H7.26 expande de forma retrocompatível o antigo `ResearchRepository`, que continua aceitando grafos sem `projects` e `observations` por normalização/defaults.

## Fundamentação de produto

A fase segue três princípios do processo de design de serviços usado como referência para o roadmap:

1. pesquisa precisa gerar insight utilizável, e não apenas documentação;
2. é necessário distinguir o que foi dito, o que foi observado e o que a equipe interpreta como significado;
3. decisões de design precisam conseguir voltar à evidência e à fonte de pesquisa que as sustentam.

## Preservado

- H7.25 Service Ecology + Stakeholder Network;
- H7.24 Journey Library + Sidebar recolhível;
- H7.23 Journey Editor UX 4.0;
- H7.22 Unified Service Blueprint Workspace;
- Journey Maps 2.0;
- Service Blueprints 2.0;
- Whiteboard 2.0;
- Problem validation H7.6;
- IDs e relações canônicas do Service Graph.

## Validação

- H7.26 smoke: 64/64 PASS;
- `npm run qa`: 2432 OK / 0 FAIL;
- `npm run syntax:check`: PASS;
- compilação TypeScript isolada do núcleo H7.26: PASS;
- `npm run lock:verify`: PASS;
- `npm run source:authority`: PASS;
- `npm run foundation:smoke`: 12/12 PASS;
- `./preflight-linux.sh`: PASS.

## Limitação conhecida

Uma tentativa real de `npm ci` não concluiu dentro da janela do ambiente de empacotamento. A instalação parcial foi encerrada e removida. Por isso o typecheck React completo e o build não são declarados como PASS nesta entrega.

## Próxima fase planejada

**H7.27 — Service Proposition + What-if Scenarios**: transformar insights/necessidades/problemas em uma proposição explícita do serviço e permitir comparar cenários alternativos sem alterar o serviço atual até a aprovação.

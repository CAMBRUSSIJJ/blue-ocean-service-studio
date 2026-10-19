# V1.20.5-H7.25 — Service Ecology + Stakeholder Network

## Objetivo

Expandir o Service Workspace além dos artefatos de Journey, Blueprint e Whiteboard, adicionando a visão sistêmica que antecede e contextualiza o desenho detalhado do serviço.

A H7.25 introduz **Ecologia do Serviço** e **Rede de Stakeholders** como estruturas canônicas do mesmo Service Graph. A intenção é permitir que a equipe enxergue pessoas, organizações, sistemas, parceiros e relações antes de descer para a jornada e para a operação.

## Adicionado

- Nova perspectiva `Ecologia` dentro de `Blueprints > Service Workspace`.
- `ServiceEcologyState` no modelo canônico de `Service`.
- `ServiceStakeholder` com:
  - tipo;
  - papel e resumo;
  - objetivos e necessidades;
  - influência;
  - interesse;
  - referências de evidência;
  - proveniência opcional de Persona.
- Tipos de stakeholder:
  - cliente/usuário;
  - funcionário;
  - gestão;
  - parceiro;
  - fornecedor;
  - regulador;
  - comunidade;
  - organização;
  - sistema/ator não humano;
  - outro.
- Relações semânticas explícitas:
  - usa;
  - entrega para;
  - depende de;
  - paga;
  - influencia;
  - regula;
  - suporta;
  - troca informação;
  - gera valor.
- Sincronização de Personas existentes para a Ecologia com rastreabilidade.
- Mapa visual de Ecologia com nós e conexões.
- Painel do stakeholder selecionado.
- Matriz Influência × Interesse com os quadrantes:
  - Co-criar / gerenciar de perto;
  - Manter satisfeito;
  - Manter informado;
  - Monitorar.
- `Ecology Health` determinístico para cobertura, conexões e rastreabilidade por evidência.
- Readiness do Service Workspace atualizado de três para quatro perspectivas: Ecologia, Journey, Blueprint e Whiteboard.

## Arquitetura

A H7.25 não transforma o Whiteboard em fonte paralela de verdade. A ecologia vive no `Service` canônico e pode usar Personas e Evidências existentes por referência.

Journey, Blueprint e Whiteboard continuam independentes e preservados. A Ecologia adiciona o contexto sistêmico acima deles.

## Fundamentação de produto

A fase foi orientada pelo princípio de separar a visão panorâmica do ecossistema do serviço da visão detalhada de sua entrega. Isso evita forçar Journey ou Blueprint a representar atores e dependências que pertencem ao ambiente mais amplo do serviço.

Também reforça o desenho com múltiplos stakeholders — clientes, funcionários, parceiros e outros atores — em vez de reduzir o sistema a uma relação empresa-cliente.

## Preservado

- Journey Library H7.24.
- Sidebar recolhível e preferência persistida.
- Journey Editor UX 4.0.
- Journey Maps 2.0.
- Journey Cover System.
- Service Blueprint 2.0.
- Whiteboard 2.0 e Smart Objects.
- Unified Service Blueprint Workspace H7.22.
- Service Graph e IDs canônicos.

## Validação

- H7.25 smoke: 60/60 PASS.
- `npm run qa`: 2368 OK / 0 FAIL.
- `npm run syntax:check`: PASS.
- compilação TypeScript isolada do núcleo H7.25: PASS.
- `npm run lock:verify`: PASS.
- `npm run source:authority`: PASS.
- `npm run foundation:smoke`: 12/12 PASS.
- `./preflight-linux.sh`: PASS.

## Limitação conhecida

`npm ci` não concluiu dentro da janela deste ambiente. Por esse motivo, o `typecheck` React completo e o build não são declarados como PASS nesta entrega. O pacote final permanece limpo e não inclui `node_modules` ou `dist`.

## Próxima fase planejada

**H7.26 — Research Studio + Insight Pipeline**: organizar pesquisa, entrevistas/observações, evidências e transformação de material bruto em insights acionáveis ligados ao Service Graph.

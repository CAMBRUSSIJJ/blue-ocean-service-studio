# V1.19.9 — Persona Studio

## Objetivo

Aprofundar a primeira peça do Discovery sem transformar **Persona** em um módulo separado.

A Persona agora é trabalhada dentro de:

`Service Home → Entender → Persona Studio`

A regra continua sendo **Context before Tool**: a Persona serve para estruturar o entendimento do serviço e se conecta ao mesmo Service Graph usado por Necessidades, Jobs, Dores, Hipóteses e Evidências.

## Persona Simples

O modo inicial mantém baixa complexidade e permite registrar:

- nome da Persona;
- resumo;
- contexto;
- objetivo principal;
- situação/momento de uso;
- frase representativa opcional.

A frase não é tratada como decoração: a interface orienta usar somente quando existir fala ou evidência real.

## Persona Profissional

Quando o usuário precisa aprofundar o contexto, pode alternar para **Profissional** sem criar outra Persona.

Campos adicionais:

- comportamentos;
- expectativas;
- restrições;
- gatilhos;
- alternativas atuais;
- canais/ambientes.

Os campos de lista aceitam múltiplos itens e são normalizados sem duplicatas.

## Contexto conectado

O Persona Studio resolve e edita relações com:

`Necessidade → Job → Dor → Hipótese → Evidência`

As relações ficam consistentes nos dois sentidos:

- a Persona referencia os objetos selecionados;
- os objetos relacionados passam a referenciar a Persona;
- `personaIds` funciona como índice reverso de compatibilidade;
- remover uma relação no Studio remove também o vínculo reverso.

A contagem global de relações do Discovery foi ajustada para contar o **par lógico uma única vez**, mesmo quando o vínculo está persistido nos dois sentidos.

## Fundação da Persona

O Studio calcula uma fundação determinística de 0–100 baseada em seis critérios:

1. identidade clara;
2. contexto registrado;
3. objetivo principal;
4. necessidade ou Job conectado;
5. dor ou hipótese conectada;
6. evidência conectada.

Isso não é um score de IA e não afirma que a Persona é “verdadeira”. É apenas cobertura estrutural explicável.

No modo Profissional, um segundo indicador considera também profundidade de situação, comportamentos, expectativas, restrições, gatilhos e canais.

## Evidência

A Persona mostra quantas Evidências estão conectadas e resume confiança:

- alta;
- média;
- baixa.

O objetivo é impedir que Personas sejam tratadas como perfis fictícios desconectados da pesquisa.

## Remoção segura

`Remover Persona` usa diálogo próprio da aplicação, sem `window.confirm`.

Ao confirmar:

- a Persona é removida;
- relações com a Persona são limpas;
- Necessidades permanecem;
- Jobs permanecem;
- Dores permanecem;
- Hipóteses permanecem;
- Evidências permanecem.

## Arquitetura

- `schemaVersion` permanece `3`.
- Persona continua sendo `GraphEntity` no Service Graph.
- O enriquecimento usa `profileVersion: 1` dentro da própria entidade.
- Nenhuma coleção de Personas é duplicada em `service.project`.
- Nenhum novo módulo de sidebar foi criado.
- `service.project` continua responsável somente pelo ciclo do projeto e Definition.
- Whiteboard/Journey/Blueprint continuam sendo views/composição sobre conhecimento canônico.

## Arquivos principais

- `src/services/persona-studio.ts`
- `src/services/discovery-workspace.ts`
- `src/views/WorkspaceHome.tsx`
- `src/runtime/service-project-home.css`
- `scripts/v1199-persona-studio-smoke.mjs`
- `scripts/v1199-browser-persona-studio.py`
- `qa/ux-truth/V1.19.9.json`

## QA

- Parser TypeScript (`tsc --noEmit --noCheck`): PASS.
- Typecheck isolado de `model + discovery-workspace + persona-studio`: PASS.
- Persona Studio: **89 OK / 0 FAIL**.
- Discovery Workspace: **51 OK / 0 FAIL**.
- Service Home: **19 OK / 0 FAIL**.
- Regressão completa: **1342 OK / 0 FAIL** considerando todos os gates com contagem explícita.

### Browser Truth

Status: **UNAVAILABLE** neste ambiente.

Playwright Python está instalado, porém o Chromium esperado pelo Playwright não está disponível. Nenhum PASS visual foi inferido.

### Typecheck/build React/Vite

A tentativa de `npm ci --ignore-scripts --no-audit --no-fund` excedeu o limite do ambiente e deixou instalação parcial. A instalação parcial foi removida antes do empacotamento.

Por isso:

- typecheck React/Vite completo: **NÃO DECLARADO**;
- build React/Vite: **NÃO DECLARADO**.

## Próxima etapa

**V1.20.0 — Problem & Evidence Studio**

Fluxo alvo:

`Dor → Hipótese → Evidência → Problema validado`

A próxima versão deve aprofundar qualidade da evidência, status de hipótese, sinais que sustentam/refutam e promoção explícita para problema validado.

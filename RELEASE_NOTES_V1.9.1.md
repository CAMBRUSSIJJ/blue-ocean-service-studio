# RealTalent Service Studio V1.9.1 — Runtime Consolidation

A V1.9.1 consolida a arquitetura técnica da V1.9.0 sem alterar a proposta visual do editor.

## Mudanças principais

- substituição dos vários `window.__rt...` por um único `RealTalentRuntime` com Registry de APIs;
- remoção dos patches contínuos baseados em `MutationObserver` nos runtimes do produto;
- React, Journey Home, Blueprint Home e Whiteboard passam a conversar através do Runtime Registry;
- extração do kernel de persistência (IndexedDB, sessão e utilitários de integridade) para módulo próprio;
- extração da configuração de views/lanes para módulo próprio;
- extração dos templates padrão de Jornada para módulo próprio;
- shell principal passa a ser renderizado corretamente pelo React no código-fonte, com bootstrap idempotente apenas para compatibilidade com o `dist` pré-compilado;
- bundles públicos padronizados em `v191-*`;
- preservação do Service Graph, Journey Management, Guided Builder, Smart Flow, Stage Flow, Current × Future, Emotion Curve, Blueprint Health, recuperação e Import/Export.

## Compatibilidade

Os dados continuam usando as mesmas chaves persistentes do projeto anterior. A migração é feita sem resetar o projeto salvo no navegador.

## QA

- Preflight Linux: OK
- QA estático: 32/32 contratos
- sintaxe dos runtimes ES modules: OK
- servidor local na porta 4173: OK
- assets principais: HTTP 200
- `window.__rt...` nos runtimes do produto: removido
- `MutationObserver` nos runtimes do produto: removido

## Observação de build

O ambiente de geração desta versão não conseguiu acessar o registry npm (`EAI_AGAIN`). Por isso o `dist` executável foi produzido preservando o bundle React já validado da V1.9.0 e trocando sua ponte de runtime para o novo Registry, enquanto os módulos V1.9.1 foram entregues diretamente como ES modules. O launcher Linux não depende de Node para executar.

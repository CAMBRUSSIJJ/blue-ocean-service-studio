# BLUE OCEAN Service Studio — V1.15.0 Global Navigation

## Objetivo

Criar uma camada única de navegação e busca sobre o Service Graph para reduzir troca manual de módulos e permitir localizar objetos pelo contexto real do serviço.

## Entregue

- busca global disponível no header;
- atalhos `Ctrl/Cmd + K` e `/` fora de campos de texto;
- navegação completa por teclado com `↑`, `↓`, `Enter` e `Esc`;
- índice construído diretamente sobre o Service Graph, sem banco ou cache paralelo;
- busca por Serviço, Jornada, Etapa, Touchpoint, Problema, Oportunidade, Ação, Métrica, Benefício, entidades estruturadas, Pesquisa e Blueprints;
- busca considera nome, tipo, responsável, jornada, etapa, descrição e outros campos contextuais;
- resultados agrupados por Experiência, Pesquisa, Melhoria, Execução, Blueprint e Service Graph;
- comandos rápidos para Workspace, Jornadas, Blueprints, Pesquisa, Plano de Ação, Inteligência, Benefícios e Revisão;
- abertura direta de Jornada e Blueprint pelos runtimes existentes;
- deep-link para fontes de Pesquisa, Evidências, Insights, Métricas, Oportunidades e Benefícios;
- abertura de Ações no Plano de Ação e edição direta da tarefa no source React;
- foco contextual da etapa no Journey Editor quando o resultado pertence a Stage/Touchpoint/Problem/Opportunity;
- trigger responsivo no header e fallback injetado para o bundle Vercel legado;
- API `globalNavigation` registrada no runtime para integrações futuras.

## Integridade

A busca é somente leitura sobre os dados existentes. A V1.15.0 não cria uma segunda fonte de verdade, não muda schema, chaves de storage, IDs ou migrações. Aberturas e edições continuam sendo delegadas aos runtimes proprietários de cada módulo.

## QA

- Stability V1.12: 12/12;
- Design System V1.13: 10/10;
- Workspace Home V1.14: 14/14;
- Global Navigation V1.15: 17/17;
- Practical Simulation: 79 objetos / 0 referências quebradas;
- sintaxe de todos os runtimes JavaScript: OK;
- TS/TSX syntax transpile: 20/20.

## Build

O cache de `node_modules` disponível no ambiente está incompleto e `npm ci --offline` não possui todos os pacotes (incluindo `zod`). Por isso, não foi possível concluir um novo bundle React. O pacote Vercel mantém o bundle React previamente validado e executa a Global Navigation pela nova camada runtime V1.15.0. O Source contém também a integração React nativa para o próximo build completo.

# BLUE OCEAN Service Studio — V1.14.0 Workspace Home

## Objetivo

Transformar a entrada da plataforma em um workspace operacional, sem duplicar dados e sem criar um dashboard desconectado do Service Graph.

## Entregue

- nova rota `home` e Workspace como entrada padrão;
- visão do serviço atual com última atualização e volume estrutural;
- bloco **Continuar de onde parou** conectado à Jornada ativa;
- recentes de Jornadas, Blueprints e Pesquisa a partir dos runtimes existentes;
- pulso operacional com ações pendentes, oportunidades, benefícios em risco e próxima revisão;
- atividade recente do workspace quando Collaboration possui eventos;
- botão global **+ Criar** no header;
- criação de Jornada, Blueprint, Whiteboard, Pesquisa, Problema, Oportunidade, Ação e Métrica;
- Whiteboard livre exposto pela API `whiteboardCore.createBlank()`;
- proteção para impedir a Journey Home antiga de sobrepor a Workspace Home no boot;
- runtime de compatibilidade `workspaceHome` para o pacote Vercel atual e implementação React nativa para o próximo bundle completo;
- UI responsiva usando os tokens permanentes da V1.13.0.

## Integridade

A versão não altera o schema do Service Graph, as chaves de persistência nem os IDs legados. Problema e Oportunidade criados globalmente exigem uma etapa existente e são vinculados à primeira etapa da Jornada ativa, evitando objetos órfãos.

## QA

- Workspace Home smoke: 14/14;
- Stability smoke: 12/12;
- Design System smoke: 10/10;
- Practical Simulation: 79 objetos / 0 referências quebradas;
- sintaxe de todos os runtimes JavaScript validada.

## Limitação de build

O ambiente não concluiu `npm ci`, portanto o pacote Vercel reutiliza o bundle React validado anterior e aplica a V1.14.0 pelos runtimes versionados. O source contém a implementação React nativa da Workspace Home para o próximo build completo.

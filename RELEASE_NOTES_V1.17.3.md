# BLUE OCEAN Service Studio — V1.17.3

## Unified Workspaces & Page States

Esta versão conclui a segunda das cinco etapas finais do ciclo de profissionalização visual/UX. O objetivo é fazer Pesquisa, Inteligência, Benefícios, Revisão, Colaboração e Configurações parecerem partes do mesmo produto, sem criar um novo modelo de dados.

## Adicionado

- runtime `unifiedWorkspaces` para coordenar os workspaces legados;
- página única de Configurações no workspace;
- Configurações com resumo do serviço, schema, revisão, Jornadas, Blueprints e fontes de pesquisa;
- controles da densidade já existente do quadro (Compacta / Normal / Detalhada);
- acesso central a Exportar projeto, Importar projeto e Verificar integridade;
- breadcrumbs de Colaboração e Configurações;
- gate `workspaces:smoke` com 19 contratos.

## Melhorado

- Pesquisa, Inteligência, Benefícios e Revisão compartilham geometria de página, header, tabs, toolbar, cards e estados;
- Colaboração deixa de se comportar visualmente como drawer e passa a ocupar um workspace completo;
- estados vazios/loading seguem o mesmo vocabulário visual;
- botões, filtros e KPIs ficam mais densos e menos cardificados;
- tipografia da nova camada mantém piso de 11 px;
- Pesquisa passa a receber a versão atual pelo pipeline.

## Corrigido

- cabeçalhos e paddings diferentes entre módulos;
- tabs com tratamentos visuais incompatíveis;
- toolbars de busca/filtro com geometrias diferentes;
- Colaboração ainda exibindo `V1.10.1` na superfície;
- gate V1.17.2 passa a aceitar versões posteriores corretamente;
- Shell Consistency reconhece Colaboração e Configurações como contextos oficiais.

## Removido

- nenhuma funcionalidade ou dado do Service Graph;
- removida apenas a apresentação modal/drawer da Colaboração como padrão visual;
- removidas marcas visíveis de versão antiga na Colaboração.

## Preservado

- Service Graph Schema V3;
- IDs e storage keys legados;
- persistência local-first e backups;
- Journey, Blueprint, Whiteboard, Home 2.0 e Wizard 2.0;
- RBAC local da Colaboração e contratos de sync existentes.

## Pendente

- Fase seguinte: finalizar a interface do Whiteboard (tool rail, barra inferior, cards e densidades);
- responsividade/acessibilidade completa continua em etapa posterior;
- perfil em nuvem, multi-serviço e login não são simulados na página de Configurações;
- build React/Vite completo não foi validado neste ambiente porque `npm ci` não conseguiu baixar `zod-4.6.5.tgz` do registry/cache.

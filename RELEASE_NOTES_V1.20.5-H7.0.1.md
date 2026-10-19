# V1.20.5-H7.0.1 — Sidebar & Wave Polish

## Objetivo
Lapidar a navegação lateral antes de iniciar Personas 2.0, reduzindo ruído e reforçando a identidade BLUE OCEAN sem alterar a arquitetura de dados.

## Adicionado
- Sidebar organizada em três grupos persistentes: **Desenho do serviço**, **Contexto** e **Gestão**.
- Onda decorativa animada em dois planos no rodapé da sidebar.
- Estado ativo com indicador lateral azul e superfície azul suave.
- Gate `v1205h701:sidebar-wave-polish-smoke`.
- Suporte a `prefers-reduced-motion` para desativar a animação automaticamente.

## Melhorado
- Branding da sidebar com marca BLUE OCEAN e subtítulo Service Studio.
- Seletor do serviço voltou a ficar visível e compacto no topo.
- Espaçamento, tipografia, ícones, hover e densidade foram normalizados.
- Colaboração e Configurações ficam visualmente separadas no rodapé.
- A navegação deixou de parecer uma lista única com mais de uma dezena de itens sem hierarquia.

## Organização final
### Desenho do serviço
- Journey maps
- Blueprints
- Whiteboards
- Hierarquias

### Contexto
- Personas
- Necessidades
- Jobs
- Dores
- Hipóteses
- Problemas
- Evidências

### Gestão
- Portfólio
- Métricas
- Pesquisa
- Templates
- Arquivo

### Rodapé
- Colaboração
- Configurações

## Corrigido
- Removido o accordion genérico `Workspace`, que acrescentava clique e escondia toda a arquitetura em um único grupo.
- Contratos de QA antigos foram migrados para reconhecer a nova estrutura sem preservar markup morto.
- O gate H5 continua garantindo que todos os `@import` permaneçam antes de Tailwind e das regras CSS.

## Limitações conhecidas
- Browser Truth visual ainda precisa ser confirmado no Linux do usuário.
- `npm run typecheck` e `npm run build` completos não foram executados neste ambiente porque o pacote-fonte não contém `node_modules` e o acesso externo às dependências não é garantido.
- A animação é propositalmente sutil; ajustes de intensidade podem ser feitos após inspeção visual real.

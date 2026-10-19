# V1.20.5-H7.0 — Dashboard Polish

## Objetivo
Lapidar apenas a Dashboard e usá-la como padrão visual do shell antes de avançar para Personas 2.0.

## Adicionado
- Dashboard H7.0 com ownership React explícito (`data-bo-dashboard-version="7.0"`).
- CSS isolado `src/runtime/dashboard-h70.css`.
- Criação rápida de Persona e Métrica integrada às páginas próprias da biblioteca.
- Gate `v1205h70:dashboard-polish-smoke`.

## Melhorado
- Três ações rápidas: Nova jornada, Nova persona e Nova métrica.
- Recentes com até cinco itens de Journey, Blueprint e Whiteboard.
- Favoritos com abertura direta das jornadas favoritas.
- Área Aprender com seis atalhos compactos.
- Layout responsivo e densidade visual mais próxima da referência enviada.
- Navegação da Dashboard agora passa por `rt-navigation`, preservando o coordenador H6.

## Corrigido
- Removido o título "Dashboard" duplicado dentro do conteúdo; o título permanece apenas no header do shell.
- Removidas chamadas diretas a `setActiveTab` dentro da Dashboard.
- Mantida a regra H5 de ordem de `@import` CSS.

## Removido
- Composição antiga `bo1205h3-dashboard-title` da Dashboard H3.
- Cards de aprendizado com descrição redundante na superfície principal.

## Limitações conhecidas
- Browser Truth visual ainda precisa ser confirmado no Linux do usuário.
- Full `npm run typecheck` / `npm run build` não foi comprovado neste ambiente porque o pacote é entregue sem `node_modules` e as dependências externas não estão disponíveis localmente.
- As outras abas não foram redesenhadas neste release por decisão de escopo; o próximo foco é Personas 2.0.

# BLUE OCEAN Service Studio V1.17.0 — Home 2.0

## Adicionado

- Home com dois estados reais: `first-use` e `active`.
- Primeiro uso com três caminhos: começar do zero, usar template e importar projeto.
- Readiness do serviço integrado à Home.
- Bloco único de `Próximo passo`, acionando o Guided Builder.
- Faixa operacional clicável: Ações pendentes, Oportunidades, Benefícios em risco e Próxima revisão.
- Bloco `Precisa de atenção` com regras determinísticas para:
  - tarefas vencidas;
  - comentários abertos;
  - etapas sem ação do cliente ou touchpoint;
  - oportunidades sem owner;
  - benefícios em risco;
  - revisão operacional próxima ou vencida.
- Recentes unificados entre Jornadas, Blueprints e Pesquisa.
- Favoritos reais quando marcados nos respectivos módulos.
- Personalização leve da Home com preferências locais.
- Smoke test `home:v2:smoke` com 18 contratos.

## Melhorado

- A Home deixa de parecer um dashboard genérico e passa a responder: onde estou, o que fazer agora e o que está em risco.
- Criação rápida foi reduzida a quatro atalhos compactos; o `+ Criar` global continua como entrada principal.
- `Continuar` prioriza a Jornada ativa e o andamento do plano de ação.
- Recentes deixam de reservar uma coluna inteira para uma categoria vazia.
- Estados vazios agora orientam a próxima ação.
- Plurais e mensagens de contagem passam a ser tratados na Home nativa.
- Layout adaptado para desktop, tablet e mobile.

## Corrigido

- Gate V1.16.3 agora aceita versões posteriores sem falhar por comparação literal de versão.
- Runtime fallback da Home passou a usar a versão atual injetada pelo pipeline.
- Runtime fallback também conhece Readiness, próximo passo, atenção e importação.

## Removido

- Hero antigo fortemente decorativo como foco principal da Home.
- Colunas fixas de recentes que permaneciam ocupando espaço mesmo vazias.
- Lista vertical longa de criação como elemento dominante da Home.

Nenhuma funcionalidade de domínio foi removida.

## Preservado

- Service Graph Schema V3.
- IDs `rt*` e aliases legados necessários para compatibilidade.
- Persistência local, recovery, checkpoints, import/export e migrations.
- Whiteboard, Journey, Blueprint, Readiness, Inspector Universal e Design System v4.

## Pendências

- Portfólio multi-serviço: depende de uma modelagem real de múltiplos serviços por workspace; não foi simulado nesta release.
- Miniaturas completas SVG do quadro: a V1.17.0 usa previews semânticos leves para manter a Home rápida.
- O `npm ci`/typecheck/build completo não pôde ser concluído neste ambiente por timeout de acesso ao registry; os gates que não dependem do registry passaram.

## QA

- V1.12 Stability: 12/12
- V1.13 Design System: 10/10
- V1.14 Workspace Home: 14/14
- V1.15 Global Navigation: 17/17
- Precision Studio: 17/17
- Branding Consolidation: 14/14
- Whiteboard UX Recovery: 13/13
- Whiteboard Unified UX: 14/14
- Design System v4: 14/14
- Shell & Page Consistency: 14/14
- Home 2.0: 18/18
- Demo: 79 objetos / 0 referências quebradas

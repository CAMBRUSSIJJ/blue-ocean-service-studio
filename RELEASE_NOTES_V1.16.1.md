# BLUE OCEAN Service Studio — V1.16.1

## Whiteboard Integrity & Unified UX

Baseline: V1.16.0 Source Recovery & Reproducible Build.

Esta versão não altera o Schema V3, IDs `rt*`, chaves legadas nem o modelo de persistência. O foco é consolidar a experiência de edição do Whiteboard/Journey/Blueprint sobre a nova fundação source-first.

## Adicionado

- **Readiness único no cabeçalho** do editor.
  - Fórmula explícita: 8 blocos — Serviço, Cliente, Etapas, Experiência, Operação, Problemas, Melhorias e Métricas.
  - Mostra próximo passo quando a estrutura ainda não está completa.
  - Modal explica a diferença entre Readiness, Completude da Jornada e Saúde do Blueprint.
- **Runtime `whiteboardUx`** para expor estado, Readiness e preferências da experiência do editor.
- Preferência **Abrir Inspector ao selecionar**.
- Preferência **Mostrar Readiness no cabeçalho**.

## Melhorado

- **Inspector Universal** agora abre automaticamente após selecionar/mover um objeto, mantendo 320 px no desktop.
- **Toolbar contextual** ficou menor: `Próximo`, `Conectar`, `Editar`, `•••`.
- Ações secundárias como duplicar, comentários, organização e exclusão foram movidas para `•••`.
- Cabeçalho do Inspector recebeu hierarquia visual mais clara.
- Responsividade do Readiness e do Inspector ajustada para tablet/mobile.
- V1.15.4 continua preservada: geometria estruturada, sticky labels condicionais, lanes vazias acionáveis, fonte mínima de 11 px e guia flutuante opt-in.

## Corrigido

- Redução da competição entre vários indicadores percentuais no editor.
- `Completude da Jornada` passa a ser explicitamente descrita como **cobertura estrutural da Jornada**.
- `Saúde do Blueprint` permanece como **diagnóstico de consistência/gaps**, não como progresso geral do serviço.
- O Readiness passa a ser o único número de progresso geral exibido no header do editor.

## Removido da superfície principal

- `Duplicar`, `Comentários` e `Propriedades` deixaram de ocupar espaço permanente na toolbar contextual.
- Nenhuma funcionalidade foi removida; essas ações continuam acessíveis em `Editar` ou `•••`.

## Compatibilidade

Preservado integralmente:

- Service Graph Schema V3;
- IDs `rt*`;
- chaves `realtalent-*` necessárias à migração/compatibilidade;
- backups existentes;
- persistência e recovery;
- Jornada, Blueprint, Whiteboard e runtimes anteriores.

## QA executado

- V1.12 Stability: 12/12
- V1.13 Design System: 10/10
- V1.14 Workspace Home: 14/14
- V1.15 Global Navigation: 17/17
- V1.15.3 Precision Studio: 17/17
- V1.15.3 Branding: 14/14
- V1.15.4 Whiteboard UX: 13/13
- V1.16.0 Source Foundation: 12/12
- **V1.16.1 Unified UX: 14/14**
- Demo: **79 objetos / 0 referências quebradas**
- TypeScript parse/syntax (`tsc --noEmit --noCheck`): OK após remoção de cache npm parcial.

## Limitações verificadas neste ambiente

- `npm ci` limpo não pôde ser concluído aqui porque a chamada ao registry expirou; por isso não afirmamos que um novo bundle React/Vite foi produzido neste ambiente.
- O E2E visual Playwright está configurado no projeto, mas o navegador deste ambiente bloqueou acesso ao servidor loopback local durante esta execução. Os gates de CI continuam preparados para executar isso em Linux/Vercel/GitHub Actions com navegador permitido.

## Próximo passo sugerido

V1.16.2 — **Design System v4 & Board Token Convergence**: reduzir dívida de `!important`, consolidar ícones/componentes e fechar o restante da fundação visual antes da Home 2.0.

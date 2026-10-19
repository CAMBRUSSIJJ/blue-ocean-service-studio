# BLUE OCEAN Service Studio V1.17.6 — Brand & Product Polish Final

## Adicionado
- Camada final `brand-polish` carregada por último, sem alterar o Service Graph.
- Ilustração SVG própria `blue-ocean-empty-state.svg` para estados vazios.
- Loading/boot branded com marca BLUE OCEAN e skeleton discreto.
- Página `404.html` com identidade BLUE OCEAN.
- Gate `brand:polish:smoke` com 20 contratos.

## Melhorado
- Marca, wordmark e subtítulo da sidebar ganham proporção e legibilidade consistentes.
- Empty states de Home, bibliotecas, busca, workshops e Design System passam a compartilhar a mesma linguagem visual.
- Motion de interação consolidado em 120/180/200 ms; `prefers-reduced-motion` continua soberano.
- Toast, offline, erro fatal e modo seguro usam a mesma linguagem de superfícies, bordas e tipografia.
- Texto estrutural final é protegido contra regressão abaixo de 11 px na nova camada.
- Superfícies e cards recebem acabamento mais plano, com menos sombra e movimento mínimo.

## Corrigido
- Microcopy principal remove `jornada(s)`, `quadro(s)`, `etapa(s)`, `tarefa(s)` e `objeto(s)` em fluxos React de maior uso.
- Plano de Ação passa a usar o agrupador `MELHORAR` também no conteúdo, eliminando resíduo `EXECUTAR` visível.
- Tela de erro deixa explícito que os dados locais foram preservados.
- Estado offline recebe `aria-live` e mensagem não-bloqueante.
- Título do documento passa a `BLUE OCEAN · Service Studio`.

## Removido
- Animação inline de 300 ms do Toast; substituída pelo motion token de 180 ms.
- Resíduos visuais de tipografia estrutural abaixo de 11 px cobertos pela camada final.
- Sombras e elevações excessivas nas superfícies mais frequentes.

## Preservado
Service Graph Schema V3, IDs `rt*`, storage legado, backups, migrations, persistência, Home 2.0, Library, Wizard 2.0, workspaces unificados, Whiteboard, responsividade e acessibilidade da V1.17.5.

## Pendente / dívida conhecida
- O build React/Vite completo não foi validado neste ambiente porque `npm ci` não conclui acesso ao registry; `tsc --noEmit --noCheck` e todos os gates source-first passaram.
- O Whiteboard ainda mantém parte dos `!important` históricos e continua operando sobre a arquitetura de overlay legado. Isso é dívida técnica, não bloqueio visual desta release.
- Dark mode continua fora do escopo deste ciclo.
- Lighthouse/axe e regressão por screenshot devem rodar no Linux/CI após instalação completa das dependências.

## Resultado do ciclo
A V1.17.6 encerra o ciclo de profissionalização visual/UX iniciado na V1.17.2: wizard, workspaces, Whiteboard, responsividade/acessibilidade e acabamento final estão concluídos. A próxima fase recomendada é voltar ao roadmap de capacidades do produto, começando pelos entregáveis estruturados de Service Design.

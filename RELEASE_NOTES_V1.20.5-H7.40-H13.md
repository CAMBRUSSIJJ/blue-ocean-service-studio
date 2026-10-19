# V1.20.5-H7.40-H13 — Persistent Global Sidebar

## Objetivo
Eliminar a troca de sidebar ao abrir um projeto. A sidebar do Blue Ocean passa a ser uma navegação global e permanente; o projeto muda apenas o contexto e o conteúdo central.

## Sidebar persistente
A mesma sidebar permanece visível em Home, Serviço, Project Home, Guided Service Workspace e páginas de contexto.

### Desenho do serviço
- Serviço
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
- Oportunidades
- Catálogo de métricas
- Pesquisa
- Templates
- Arquivo

Também permanecem Colaboração e Configurações.

## Contexto do projeto
As antigas entradas contextuais do projeto saíram da sidebar e passaram para uma barra horizontal no conteúdo:

- Visão geral
- Serviço
- Pesquisa
- Biblioteca
- Arquivos
- Equipe
- Configurações

Assim, o usuário nunca perde a referência da navegação principal ao entrar em um projeto.

## Comportamento
- `Home` volta à Home global.
- `Serviço` abre a lista de projetos.
- Abrir projeto mantém a mesma sidebar.
- O projeto ativo é mostrado pelo switcher de contexto.
- Personas/Problemas/Métricas etc. continuam no mesmo lugar e usam o projeto atual como contexto.
- Guided Service Workspace continua acessível pela barra contextual do projeto.

## QA
- H7.40-H13: 25/25 PASS
- Browser Chromium: 8/8 PASS
- `npm run qa`: PASS / 4829 OK / 0 FAIL esperado
- `syntax:check`: PASS
- `lock:verify`: PASS
- `source:authority`: PASS
- Foundation: 12/12 PASS
- Project Foundation: 46/46 PASS
- preflight Linux: PASS

## Limitação
React typecheck completo e Vite build não são declarados como PASS nesta execução porque o pacote final é source-clean e não contém `node_modules`.

## Pacote final
A reextração do Linux confirmou H13 25/25, H12 31/31, `syntax:check`, preflight e Chromium H13 8/8. Os três launchers estão em 755, não há diretórios gerados/proibidos e Linux/Source/Vercel possuem conteúdo canônico idêntico.

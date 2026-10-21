# V1.20.5-H7.40-H8 — Project Home & Workspace Architecture

## Objetivo
Criar a camada global que faltava acima do Service Workspace: o usuário entra no **Blue Ocean Home**, escolhe ou cria um **Projeto** e só então abre o workspace do serviço. A tela guiada H7.40-H7 passa a ser o interior de um projeto, não a Home inteira do produto.

## O que mudou
- Nova **Home global** com continuidade, projetos recentes, favoritos e templates.
- Nova área **Projetos** para criar, buscar, abrir e favoritar múltiplos projetos locais.
- Separação formal entre **Projeto** (espaço de trabalho) e **Serviço** (objeto desenhado dentro dele).
- Modal de criação pede **Nome do projeto** e **Serviço principal** separadamente.
- Novo switcher de projeto no shell: projeto atual, serviço principal, lista de projetos, “Todos os projetos” e “Novo projeto”.
- Breadcrumb dentro do projeto: **Home → Projetos → Projeto → ferramenta**.
- A H7.40-H7 Guided Service Workspace permanece íntegra dentro de cada projeto.
- Biblioteca local preserva um snapshot canônico do Service Graph por projeto, evitando que abrir outro projeto sobrescreva o anterior.
- Favoritos, recentes e `lastOpenedAt` ficam no índice global de projetos.
- Templates iniciais: **Novo serviço**, **Redesenho de serviço**, **Service Blueprint**, **Pesquisa de serviço** e **Experiência omnichannel**.
- A navegação global e a navegação interna do projeto passaram a ter papéis diferentes: Home/Projetos/Templates no nível global; Serviço/Contexto/Gestão dentro do projeto.

## Project × Service
Na maioria dos casos um projeto começa com um serviço principal, mas os conceitos são distintos:
- **Projeto** organiza o trabalho, histórico, favoritos, abertura recente e contexto do workspace.
- **Serviço** é o sistema de experiência/operação desenhado dentro do projeto.

Essa separação permite evoluir posteriormente para projetos com múltiplos serviços sem reescrever a arquitetura global.

## Persistência local
A Project Library H8 usa:
- índice global de projetos;
- ID do projeto ativo;
- snapshot do Service Graph por projeto.

Preferências puramente de interface do workspace continuam compartilhadas nesta versão; o isolamento H8 é do **Service Graph canônico** de cada projeto.

## QA
- H7.40-H8 Project Home & Workspace Architecture: **25/25 PASS**.
- Chromium real — Project Home: **8/8 PASS**.
- Suíte acumulada: **4697 OK / 0 FAIL**.
- Foundations, syntax, lock, source authority, project foundation e preflight: **PASS**.
- `project-library.ts` em TypeScript strict: **PASS**.

## Limitação de ambiente
A instalação completa via `npm ci --include=dev` não concluiu neste ambiente. O processo parcial foi encerrado e `node_modules` foi removido. Portanto o React typecheck completo e o build Vite não são declarados como PASS nesta execução.

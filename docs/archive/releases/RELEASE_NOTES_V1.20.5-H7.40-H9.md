# V1.20.5-H7.40-H9 — Project Architecture Hardening

## Objetivo
Consolidar a arquitetura multi-project criada na H7.40-H8 antes de iniciar uma nova macrofase operacional. A H9 separa navegação de progresso no Guided Workspace, valida isolamento real entre projetos, endurece persistência/recovery, completa o ciclo de gestão do Project Library e deixa explícito o escopo Global × Projeto.

## O que mudou
- O stepper **Entender → Projetar → Validar → Melhorar → Operar** não colore mais fases anteriores apenas porque o usuário navegou para uma fase posterior.
- O estado real de cada fase agora é independente da seleção: **concluída**, **parcial** ou **não iniciada**; a fase selecionada continua azul como navegação.
- Project Library validada com snapshots isolados: alterar o Projeto A não modifica o Projeto B.
- Troca/arquivamento do projeto ativo faz flush do estado atual antes da transição.
- Novo ciclo de gestão de projetos: **criar, abrir, favoritar, renomear, arquivar, restaurar**.
- Renomear o projeto não renomeia o serviço principal.
- Arquivar remove o projeto da lista ativa, mas preserva índice e snapshot local; projetos arquivados podem ser restaurados.
- O ID do projeto ativo continua persistido para recovery após reload.
- Sidebar publica explicitamente `global` ou `project` como escopo.
- Dentro do projeto: **Aplicar template**, **Equipe do projeto** e **Configurações do projeto** substituem rótulos ambíguos.
- Templates globais continuam criando novos projetos; aplicar template dentro do projeto permanece uma ação local.
- Breadcrumbs internos antigos `Workspace / ...` ficam ocultos visualmente; o shell mantém o breadcrumb canônico **Home → Projetos → Projeto → ferramenta**.

## Integridade multi-project
O gate H9 usa storage em memória com dois projetos independentes e prova:
1. alteração no snapshot A não modifica B;
2. rename altera somente metadado do projeto;
3. favorite persiste;
4. archive preserva snapshot;
5. restore devolve o projeto à lista ativa;
6. active project persiste para recovery.

## QA
- H7.40-H9 Project Architecture Hardening: **28/28 PASS**.
- Chromium real — Project Hardening: **9/9 PASS**.
- H7.40-H8 Project Home: **25/25 PASS**.
- H7.40-H7 Guided Workspace: **36/36 PASS**.
- H7.40-H6 Typecheck Final Cleanup: **4/4 PASS**.
- H7.40-H5 Workspace Simplification: **32/32 PASS**.
- Suíte acumulada: **4725 OK / 0 FAIL**.
- `syntax:check`, `lock:verify`, `source:authority`, Foundation 12/12, Project Foundation 46/46 e preflight: **PASS**.
- `project-library.ts` + domain model em TypeScript strict: **PASS**.

## Limitação de ambiente
A instalação completa via `npm ci --include=dev` não foi promovida a PASS nesta execução; o ambiente de validação das releases anteriores apresentou travamento recorrente do npm. Portanto React typecheck completo e Vite build continuam separados dos gates de source/domain/browser desta release.

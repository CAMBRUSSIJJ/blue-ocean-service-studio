# V1.20.5-H7.40-H11 — Service-first Project Navigation

## Objetivo
Corrigir a hierarquia global depois da H10. A entrada principal não deve ser **Projetos** acima de Serviço. A navegação correta passa a ser **Home → Serviço → Projetos → Projeto → Serviço interno**.

## O que mudou
- A sidebar global usa **Serviço** como entrada principal no lugar de **Projetos**.
- Entrar em **Serviço** abre a lista de **Projetos do serviço**.
- A Home global deixa de expor uma biblioteca completa de projetos e passa a encaminhar para a área Serviço.
- Ao escolher um projeto, a plataforma abre a **Home específica do Projeto** preservada pela H10.
- Dentro do projeto, **Serviço** continua sendo o módulo que abre o Guided Service Workspace.
- O breadcrumb passa a seguir `Home → Serviço → Projeto → área atual`.
- O seletor global comunica `Serviço / Projetos de serviço`.
- A navegação mobile usa **Serviço** como entrada global.
- H8/H9/H10 permanecem preservadas como contratos de regressão sem restaurar a hierarquia antiga.

## Modelo consolidado
```text
BLUE OCEAN
├── Home
├── Serviço
│   └── Projetos do serviço
│       └── Projeto
│           ├── Visão geral
│           ├── Serviço
│           │   └── Entender → Projetar → Validar → Melhorar → Operar
│           ├── Pesquisa
│           ├── Biblioteca
│           ├── Arquivos
│           ├── Equipe
│           └── Configurações
├── Templates
├── Colaboração
└── Configurações
```

## QA
- H7.40-H11 Service-first Project Navigation: **20/20 PASS**.
- Chromium real — Service-first navigation: **6/6 PASS**.
- H7.40-H10 Project Shell: **28/28 PASS**.
- H7.40-H9 Project Architecture Hardening: **28/28 PASS**.
- H7.40-H8 Project Home: **25/25 PASS**.
- Suíte acumulada: **4773 OK / 0 FAIL**.
- `syntax:check`, `lock:verify`, `source:authority`, Foundation 12/12, Project Foundation 46/46 e preflight: **PASS**.

## Limitação de ambiente
React typecheck completo, Vite production build e Vercel deploy não são declarados como PASS nesta execução sem uma instalação completa das dependências. Nenhum gate não validado foi promovido a PASS.

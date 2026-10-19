# V1.20.5-H7.40-H10 — Project Shell & Contextual Navigation

## Objetivo
Corrigir a transição **Home global → Projeto → Serviço**. Abrir um projeto não deve despejar toda a arquitetura do serviço na sidebar nem entrar automaticamente no Guided Service Workspace. A H10 cria uma Home real do Projeto, mantém a navegação global estável e transforma Serviço, Pesquisa, Biblioteca, Arquivos, Equipe e Configurações em áreas contextuais do projeto.

## O que mudou
- Clicar em um projeto agora abre a **Home do Projeto**.
- Criar um projeto novo também entra primeiro na Home do Projeto.
- O Guided Service Workspace só abre quando o usuário escolhe **Abrir serviço** ou a área **Serviço**.
- A sidebar do projeto passa a ter somente sete áreas contextuais:
  1. Visão geral
  2. Serviço
  3. Pesquisa
  4. Biblioteca
  5. Arquivos
  6. Equipe
  7. Configurações
- Personas, Necessidades, Jobs, Dores, Hipóteses, Problemas, Evidências, Hierarquias, Oportunidades e Métricas deixam de ocupar permanentemente a sidebar.
- Essas entidades continuam disponíveis na nova **Biblioteca do Projeto**, agrupadas em Pessoas & contexto, Descoberta e Gestão.
- A Home do Projeto mostra o **Serviço principal** como módulo explícito, com Journeys, Blueprints e Whiteboards, e CTA **Abrir serviço**.
- A Home do Projeto também mostra Pesquisa, Biblioteca, Arquivos, Equipe, Configurações e Aplicar template.
- Breadcrumb do contexto do projeto volta para a Home do Projeto.
- O seletor superior continua permitindo trocar projeto ou voltar para Todos os projetos.
- Navegação mobile diferencia explicitamente **Projeto** e **Serviço**.
- Configurações globais permanecem globais e não ativam contexto de projeto indevidamente.

## Modelo de navegação consolidado
```text
BLUE OCEAN
└── Home global
    └── Projetos
        └── Project Home
            ├── Serviço
            │   └── Entender → Projetar → Validar → Melhorar → Operar
            ├── Pesquisa
            ├── Biblioteca
            ├── Arquivos
            ├── Equipe
            └── Configurações
```

## Compatibilidade
Os contratos históricos de H7.18/H7.19/H7.22 e releases anteriores permanecem como marcadores de regressão no source. Eles não restauram a sidebar antiga e não aparecem visualmente para o usuário.

## QA
- H7.40-H10 Project Shell & Contextual Navigation: **28/28 PASS**.
- Chromium real — Project Shell: **9/9 PASS**.
- H7.40-H9 Project Architecture Hardening: **28/28 PASS**.
- H7.40-H8 Project Home: **25/25 PASS**.
- H7.40-H7 Guided Workspace: **36/36 PASS**.
- Suíte acumulada: **4753 OK / 0 FAIL**.
- `syntax:check`, `lock:verify`, `source:authority`, Foundation 12/12, Project Foundation 46/46 e preflight: **PASS**.

## Limitação de ambiente
React typecheck completo, Vite production build e Vercel deploy não são declarados como PASS nesta execução sem uma instalação completa das dependências. Os gates de source/domain/QA/browser são independentes e permanecem aprovados.

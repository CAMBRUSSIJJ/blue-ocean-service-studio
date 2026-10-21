# BLUE OCEAN Service Studio V1.17.9 — Auth Runtime Recovery & Wave Entry

## Adicionado
- Onda animada BLUE OCEAN em SVG/CSS na entrada e na transição para o workspace.
- Estado de primeiro acesso orientando criação do workspace local.
- Gate `auth:runtime:smoke` com 20 contratos de inicialização, login e resiliência.
- Timeouts explícitos para IndexedDB e preparação do workspace.

## Melhorado
- A tela de autenticação agora monta imediatamente e não depende da recuperação do Service Graph para aparecer.
- Sessões persistidas passam pela preparação segura antes de abrir o workspace.
- `rt-app-ready` passa a representar o workspace montado, em vez da simples montagem do entry point.
- Loading do workspace usa progresso real de preparação e fallback degradado.

## Corrigido
- Travamento indefinido em “Preparando seu workspace”.
- `v1120-stability` não usa mais top-level await para bloquear a entrada.
- IndexedDB bloqueado/lento não impede login e não deixa overlay legado sobre a interface.
- O boot legado é removido por `rt-entry-ready` e por watchdog de segurança.

## Removido
- Dependência da recuperação de persistência antes de renderizar a página de login.
- Loading puramente temporizado como condição para abrir o workspace.

## Limites
- Login continua local-first nesta release; Google/Microsoft OAuth real dependem de backend/cloud.
- O fallback degradado prioriza disponibilidade do workspace caso IndexedDB não responda no tempo seguro.

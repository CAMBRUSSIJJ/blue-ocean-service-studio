# V1.20.5-H7.2 — Needs 2.0

## Adicionado
- View dedicada `NeedsView` para a aba Necessidades.
- Biblioteca com busca e filtros: Todas, Não usadas, Com evidência, Base incompleta e Alta importância.
- Detalhe com abas Visão geral, Pessoas, Relações, Evidências e Uso.
- Perfil da necessidade com contexto, resultado desejado, alternativa atual, sinal de sucesso, importância, responsável e tags.
- Score determinístico de completude.
- Serviço `needs-studio.ts` para leitura, edição, relações e diagnóstico da necessidade.

## Melhorado
- Necessidades agora mostra quantidade de Personas e Evidências conectadas diretamente na tabela.
- Relações com Personas, Jobs, Dores, Hipóteses, Problemas e Evidências permanecem no Service Graph.
- Rastreamento de uso reutiliza a mesma infraestrutura canônica de Whiteboards e relações.

## Corrigido
- A aba Necessidades não cai mais no editor/modal genérico da Workspace Library.
- Remoção desvincula referências sem apagar os objetos relacionados.

## Removido
- Dependência visual da tabela genérica para a aba Necessidades.

## Limitações verificadas
- O typecheck/build completo não foi executado neste ambiente porque `npm ci` expirou antes de instalar o TypeScript local.
- Browser Truth interativo ainda precisa ser executado no Linux após o build.

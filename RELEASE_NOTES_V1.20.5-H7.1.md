# V1.20.5-H7.1 — Personas 2.0

Esta release inicia o refinamento módulo por módulo do BLUE OCEAN Service Studio.

## Personas deixa de ser página genérica

- `Personas` agora possui uma view dedicada (`src/views/PersonasView.tsx`).
- A biblioteca segue o padrão operacional de lista/tabela: busca, filtros, menu por linha e criação no próprio módulo.
- Filtros disponíveis: Todas, Não usadas, Com evidência e Base incompleta.
- Criar Persona abre a nova Persona imediatamente para completar o perfil.

## Editor de Persona

Ao abrir uma Persona, a página passa para um workspace dedicado com cinco abas:

1. Visão geral
2. Comportamento
3. Relações
4. Evidências
5. Uso

A edição reutiliza o `persona-studio` canônico; não existe um segundo modelo de Persona.

## Service Graph

- Necessidades, Jobs, Dores, Hipóteses e Evidências são ligadas por referência.
- `updatePersonaProfile` mantém relações bidirecionais e `personaIds` consistentes.
- `removePersonaFromGraph` remove a Persona e desvincula referências existentes.
- A aba Uso mostra instâncias visuais e relações conhecidas pelo Service Graph.

## UX

- Modo Simples e Profissional preservados.
- Completude é recalculada enquanto o usuário edita, antes de salvar.
- Responsável e tags ficam no bloco de organização.
- Remoção usa diálogo controlado pela aplicação.
- Layout responsivo para desktop e telas menores.

## Não alterado

- Journey maps, Blueprints, Whiteboards e demais bibliotecas não foram redesenhados nesta release.
- A arquitetura de navegação H6 e a interação de onda H7.0.4 permanecem intactas.

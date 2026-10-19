# V1.20.5-H7.2.4 — Persona Editor UX Polish

## Adicionado
- `AutoTextarea` para campos de texto que crescem com o conteúdo.
- Rail lateral com Completude, Organização e Base atual.
- Editor de chips para Canais e Tags.
- Sugestões de responsável via lista dos responsáveis já utilizados.
- Feedback explícito de estado: `Tudo salvo` / `Alterações pendentes`.
- Menu de contexto no detalhe da Persona para remoção.

## Melhorado
- Aproveitamento horizontal da tela do editor de Persona.
- Densidade e hierarquia do formulário.
- Objetivo principal, Situação, Resumo, Bio e Frase representativa começam compactos.
- Persona Simples/Avançada ganhou seletor mais legível.
- Action bar ficou mais leve e orientada a salvar/descartar.
- Canais e Tags deixaram de parecer campos de texto genéricos.

## Corrigido
- Chips digitados e ainda não confirmados são incorporados ao salvar.
- Remover Persona não fica mais como ação destrutiva permanente no rodapé.

## Removido
- Botão vermelho permanente `Remover` da action bar.
- Textareas altos por padrão na Visão geral da Persona.

## Limitações conhecidas
- Full `npm run typecheck` e `npm run build` precisam ser executados após `npm ci` no ambiente Linux do usuário.
- Browser Truth pós-hotfix ainda depende de inspeção visual no navegador.

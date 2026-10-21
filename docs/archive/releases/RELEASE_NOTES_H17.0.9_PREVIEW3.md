# H17.0.9 Preview 3 — edição de cartões

Base: H17.0.9 Preview 2 fornecida pelo usuário.

## Alterações
- Cartões livres agora possuem botão de duplicação (novo ID, conteúdo copiado).
- Barra de edição com marcação Markdown: negrito, itálico, lista e link (texto armazenado; não é renderização rich-text).
- Reordenação do cartão selecionado por botões ↑/↓ e atalhos Alt+Seta para cima/baixo.
- Operações puras de domínio com retrocompatibilidade do texto legado em `lane.cards`.
- Ajustes visuais localizados ao editor; outras telas não foram modificadas.

## Testes neste ambiente
- PASSOU `npm run syntax:check` (`tsc --noEmit --noCheck`, sem validação de tipos).
- PASSOU `npm run journey:h1709:p3:test` (9 verificações de domínio).
- PASSOU `npm run journey:h1709:test`.
- PASSOU `npm run journey:h1709:move:test`.
- PASSOU `npm run journey:a2:test` (12 verificações).
- NÃO EXECUTADO: build e testes no navegador. `npm ci --offline` bloqueado por zod@4.6.5 ausente.
- `npm run typecheck` sem dependências produziu erros por ausência de declarações React/JSX; não constitui validação de build.

## Limites conhecidos
- Formatação é inserção de sintaxe Markdown, ainda não WYSIWYG nem visualização renderizada.
- Os controles ↑/↓ reordenam na célula atual; drag-and-drop entre células permanece da Preview 2.
- Persistência foi testada na serialização do modelo, mas não após recarregamento do navegador.
- Requer Node.js 22+ para testes usando `--experimental-strip-types`.

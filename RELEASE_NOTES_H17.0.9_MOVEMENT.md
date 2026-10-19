# H17.0.9 — Movimentação de cartões (preview 2)

## Alterações
- Arraste pela alça ⠿ para mover cartões livres entre etapas e faixas compatíveis.
- Solte sobre outro cartão para inserir antes dele, ou na área da célula para inserir ao final.
- Persistência via `journey.mapLayout.lanes[].cardItems`, mantendo o campo legado `cards`.
- A movimentação não altera entidades vinculadas ao serviço nem faixas especiais.
- As operações são imutáveis e preservam IDs dos cartões.

## Testes realizados
- `npm run journey:h1709:move:test` — aprovado.
- `npm run journey:h1709:test` — aprovado.
- `npm run journey:a2:test` — aprovado.

## Ainda pendente
- Build/typecheck integral e teste visual no navegador (dependências npm não disponíveis no ambiente).
- Formatação rich text, edição avançada, acessibilidade de movimentação por teclado e teste ponta a ponta de persistência.

## Uso
`npm ci && npm run typecheck && npm run build && npm run dev`

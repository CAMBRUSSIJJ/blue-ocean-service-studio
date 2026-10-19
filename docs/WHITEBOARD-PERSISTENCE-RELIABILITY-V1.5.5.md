# V1.5.5 — Whiteboard Persistence & Reliability

## Objetivo

Tornar perda de trabalho, corrupção parcial e encerramentos inesperados eventos recuperáveis antes de declarar o Whiteboard Core estável.

## Camadas

1. **Working state** — Graph + meta usados pelo editor.
2. **Revision fence** — Graph e meta precisam carregar a mesma `persistenceRevision`.
3. **Durable mirror** — última cópia íntegra em IndexedDB.
4. **Checkpoints** — snapshots rotativos (12 por padrão).
5. **Session monitor** — registra abertura, heartbeat e encerramento limpo.
6. **Recovery Center** — validação e restauração assistida.

## Política

- autosave continua transparente;
- o mirror durável é atualizado após estabilização da gravação;
- checkpoints automáticos são espaçados para evitar crescimento indefinido;
- uma restauração cria antes um checkpoint do estado atual;
- versões V1.5.4 e anteriores migram para `persistenceSchemaVersion = 1`.

## Fora de escopo

Arquivos ZIP/JSON externos, SVG/PDF/PNG e importação de outros formatos pertencem à V1.5.6.

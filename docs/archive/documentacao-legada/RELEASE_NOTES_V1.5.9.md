# V1.5.9 — Performance & UX Polish

## Objetivo
Fechar a última etapa de otimização e refinamento antes da V1.6.0 — Whiteboard Core 1.0.

## Performance
- viewport culling ativado automaticamente em quadros acima do limiar de complexidade;
- objetos fora da viewport deixam de gerar nós DOM sem serem removidos do modelo;
- conexões distantes também são evitadas no paint quando não intersectam a área de trabalho;
- pan, drag, resize, reconnect e minimapa passam a agrupar renders por frame;
- semantic zoom reduz a quantidade de markup em zoom distante;
- minimapa limita a aproximadamente 520 marcas visuais, mantendo a distribuição espacial;
- `content-visibility`/containment aplicados onde seguros.

## UX
- cabeçalho responsivo consolidado em 1366 px;
- refinamento de painéis para telas pequenas e baixa altura;
- estados de foco visíveis;
- suporte a `prefers-reduced-motion` e `prefers-contrast`;
- modais marcados como dialog/aria-modal;
- botões recebem nomes acessíveis;
- mensagens de erro preservam a confiança no autosave.

## Diagnóstico
Foi adicionada uma API interna `window.__rtWhiteboardDiagnostics` para QA, contendo estatísticas de render e gerador de stress board. Ela não altera o fluxo normal do usuário.

## Compatibilidade
A V1.5.9 migra automaticamente metadados da V1.5.8 e versões anteriores através da cadeia de compatibilidade existente.

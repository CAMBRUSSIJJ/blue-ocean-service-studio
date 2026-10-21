# QA — V1.4.7 Frames & Structure

## Validações automatizadas em navegador

O motor V1.4.7 foi carregado em Chromium headless com armazenamento local controlado para validar o overlay de Whiteboard independentemente do bundle React.

Fluxos aprovados:

1. abertura do Whiteboard sem erro JavaScript;
2. criação de Section;
3. criação de Frame dentro da Section;
4. criação de Post-it dentro do Frame;
5. persistência da hierarquia `Section → Frame → Post-it`;
6. árvore de Camadas com três níveis;
7. collapse da Section ocultando toda a subárvore;
8. expand restaurando os três objetos;
9. movimento da Section deslocando Frame e Post-it pelo mesmo delta;
10. Inspector com tipo do container, auto-resize e padding;
11. duplicação da Section duplicando também Frame e Post-it e preservando relações pai-filho;
12. exclusão `container + conteúdo` removendo toda a subárvore;
13. ativação de auto-resize;
14. alteração de padding para 48 px;
15. `Ajustar conteúdo` executando sem erro;
16. template Service Blueprint gerando 5 Swimlanes;
17. ausência de `pageerror` e console errors durante o fluxo testado.

## Validações estáticas

- `node --check` aprovado para `src/whiteboard-v147.js` e `dist/v147-whiteboard.js`.
- arquivos `src` e `dist` do motor possuem bytes idênticos após sincronização.
- `dist/index.html` referencia exclusivamente `v147-whiteboard.css/js` como camada ativa.

## Launcher

O pacote final é validado separadamente após compactação: unzip limpo, `start-linux.sh`, resposta HTTP em `127.0.0.1:4173` e presença dos assets V1.4.7.

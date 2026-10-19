# QA — V1.5.4 Visualizations Engine

## Teste automatizado no Chromium

Harness executado com os arquivos distribuídos `v154-whiteboard.js` e `v154-whiteboard.css`.

### Fluxo testado

1. abrir Whiteboard;
2. importar Jornada e organizar como Journey;
3. validar persistência do layout Livre antes da transformação;
4. alternar para Fluxo;
5. confirmar que nenhuma conexão foi criada automaticamente;
6. alternar para Blueprint;
7. voltar para Livre e comparar posições com o snapshot original;
8. abrir Visualizations Engine.

### Resultado

- 4 botões de View: OK;
- Journey: 3 colunas de Etapa: OK;
- Journey: 5 lanes: OK;
- 11 instâncias persistidas nas Views Livre e Journey: OK;
- Fluxo: 0 edges antes e 0 depois da troca: OK;
- Blueprint: 3 colunas: OK;
- Blueprint: 6 lanes: OK;
- Blueprint: 3 separadores semânticos: OK;
- retorno para Livre: posições restauradas exatamente: OK;
- Visualizations Engine: 4 cards: OK;
- erros JavaScript: 0.

## Migração

Foi injetada uma meta V1.5.3 com marcador de teste. A V1.5.4:
- carregou o conteúdo legado;
- preservou o marcador;
- gravou a nova chave V1.5.4;
- registrou `visualizationEngineVersion: 1`;
- não gerou erros JavaScript.

# QA — V1.8.4

## Gate estático

Validar com `./qa-core.sh`.

## QA de interação controlado

Cenário padrão: 3 etapas × 6 lanes.

Resultados observados no harness de navegador:

- View Blueprint: ativa;
- células: 18;
- células vazias: 12;
- células preenchidas: 6;
- ações contextuais: 18;
- separadores semânticos: 3;
- botões de ajuda: 3;
- sticky stages visíveis: 3;
- sticky lanes visíveis: dependem da região vertical no viewport;
- após pan, sticky stages permaneceram no viewport;
- `stageTop` permaneceu fixo em relação ao viewport do editor;
- lane fixa permaneceu em `left = 72px` no cenário 1366×768;
- modal contextual abriu como `Adicionar em Descoberta`;
- ajuda da Linha de interação abriu corretamente;
- erros JavaScript registrados: 0.

A captura de screenshot do Chromium sobre o harness `about:blank` não é usada como evidência visual porque o runtime disponível não compõe a superfície corretamente; o DOM/interação foi validado via DevTools Protocol.

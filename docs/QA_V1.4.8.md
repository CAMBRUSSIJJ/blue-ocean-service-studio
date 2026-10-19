# QA — V1.4.8 Infinite Canvas & Navigation

## Validações estáticas

- `node --check dist/v148-whiteboard.js`: aprovado.
- Launcher contém assets V1.4.8 e não depende de npm para execução.

## QA funcional do motor isolado em Chromium

O whiteboard foi executado em um harness isolado com armazenamento local simulado para validar o novo motor sem depender da aplicação React hospedeira.

Fluxos verificados:

- overlay V1.4.8 abre sem erros JavaScript;
- template Fluxo: 6 cards / 5 conexões;
- painel Navegação abre;
- busca por "Atendimento" retorna e localiza o card correto;
- Space+drag altera a viewport;
- Ctrl+wheel altera o zoom preservando o ponto do cursor;
- Ctrl+1 retorna a 100%;
- Ctrl+0 executa Fit All;
- minimapa responde a clique e drag em teste dedicado;
- histórico de navegação habilita Voltar e restaura viewport anterior;
- Blueprint gera breadcrumbs estruturais (`Quadro › Frontstage › Ação visível`);
- Ctrl+F abre e foca a busca do Outline;
- Alt+Left / Alt+Right executam navegação histórica;
- nenhum erro JavaScript registrado nos fluxos testados.

## Observação do ambiente

A política do Chromium do ambiente bloqueia navegação direta para `127.0.0.1`, então o QA de interação foi executado com o motor V1.4.8 injetado em um harness `about:blank`, usando o mesmo JS/CSS distribuído no launcher. O `start-linux.sh` é validado separadamente por HTTP/curl.

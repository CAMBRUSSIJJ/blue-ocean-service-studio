# QA — V1.8.2

## Gate estático

`./qa-core.sh` verifica 25 contratos:

- Whiteboard Core, Journey Studio e Blueprint Studio preservados;
- Blueprint Home API;
- Global Shell API;
- migração V1.8.1;
- metadados da Home;
- listagem de Blueprints;
- criação a partir da Jornada;
- criação em branco;
- criação por template;
- duplicação;
- Cards/Lista;
- busca e filtro de status;
- Recentes;
- quick templates;
- favoritos;
- owner/status;
- Module Home shell;
- paleta RealTalent;
- responsividade;
- editor e Etapas compartilhadas preservados.

## QA de interação

Chromium em harness controlado:

- Blueprint na sidebar abre Module Home;
- Home exibe Recentes, Quick Start e Todos;
- troca Cards → Lista → Cards;
- busca altera a seção para Resultados;
- Create Flow apresenta 4 modos;
- criação “A partir da Jornada” gera novo registro com owner;
- editor Blueprint abre com o novo board;
- API reporta app `1.8.2`;
- voltar do editor retorna à Blueprint Home;
- `0` erros JavaScript observados.

Captura: `rt182_blueprint_home_qa.png` gerada fora do pacote para inspeção visual.

## QA dos quatro modos de criação

Harness Chromium controlado:

- Em branco: `0` objetos materializados automaticamente;
- A partir da Jornada: `14` objetos no cenário padrão;
- Template Delivery: `20` objetos após materialização/organização;
- Duplicar: `20` objetos preservados no cenário testado;
- registros finais: `5`;
- erros JavaScript: `0`.

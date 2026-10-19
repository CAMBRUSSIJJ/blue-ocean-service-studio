# QA — V1.5.5 Persistence & Reliability

## Sintaxe

- `node --check dist/v155-whiteboard.js`: aprovado.

## Harness Chromium

O ambiente bloqueia navegação automatizada para URLs locais, então os fluxos de interação foram exercitados em Chromium usando exatamente `v155-whiteboard.js` e `v155-whiteboard.css`, com implementações controladas das APIs de armazenamento para simular localStorage e IndexedDB.

### Autosave / mirror

- abertura do Whiteboard: OK;
- criação de Post-it: OK;
- Graph/meta com mesma `persistenceRevision`: OK;
- `persistenceSchemaVersion = 1`: OK;
- `appDataVersion = 1.5.5`: OK;
- estado visual `Salvo · protegido`: OK;
- latest-good no armazenamento durável: OK.

### Checkpoints

- checkpoint automático: OK;
- checkpoint manual: OK;
- listagem no Centro de Recuperação: OK;
- restauração de checkpoint anterior: OK;
- estado atual preservado antes da restauração: implementado.

### Corrupção / crash recovery

Foi injetado um Graph JSON inválido e uma sessão anterior marcada como aberta. A abertura seguinte:

- detectou o estado inválido;
- recuperou `latest-good`;
- regravou Graph/meta com revisões consistentes;
- preservou o nome/estrutura do serviço;
- exibiu `Estado recuperado automaticamente`;
- não gerou erro JavaScript.

## Launcher

`start-linux.sh` foi executado contra a distribuição final e respondeu HTTP 200 para `index.html`, `v155-whiteboard.js` e `v155-whiteboard.css`.

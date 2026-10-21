# QA — V1.5.3 Smart Objects / Service Graph

## Ambiente

Harness Chromium isolado usando exatamente `dist/v153-whiteboard.js` e `dist/v153-whiteboard.css`.

## Fluxo principal validado

- abertura do Whiteboard sem erro JavaScript;
- Service Graph Browser aberto pela toolbar;
- contagem inicial de entidades validada;
- criação de entidade `Processo` pelo picker;
- primeira instância criada com `instanceSchemaVersion: 2` e `entityRef` correto;
- edição do nome canônico refletida nas instâncias;
- `Ctrl+D` cria nova instância com novo `instanceId` mantendo a mesma entidade;
- `Duplicar como nova entidade` separa corretamente o conteúdo da instância selecionada;
- mesma entidade adicionada em um segundo quadro;
- Inspector reporta duas instâncias em dois quadros;
- nenhum erro JavaScript no fluxo principal.

## Migração V1.5.2 → V1.5.3

Foi carregado um estado legado com:

- Smart Object de Etapa sem `instanceId`/`entityRef` V2;
- Processo livre legado;
- Smart Object de Processo com referência inexistente.

Resultados:

- Smart Object legado recebeu `instanceId`, `entityRef` e `instanceSchemaVersion: 2`;
- meta V1.5.2 foi migrada para a chave V1.5.3;
- Processo livre foi convertido em entidade canônica + instância;
- referência inexistente foi detectada como ausente;
- ação `Reconectar entidade` restaurou o vínculo;
- nenhum erro JavaScript no fluxo de migração.

## Verificações estáticas

- `node --check src/whiteboard-v153.js` aprovado;
- `node --check dist/v153-whiteboard.js` aprovado.

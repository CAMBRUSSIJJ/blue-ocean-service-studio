# QA — V1.5.0 Editing Productivity

## Ambiente
- Chromium headless
- Viewport principal: 1440×900
- Execução do JavaScript/CSS distribuído em `dist/`

## Fluxos validados
- abertura do Whiteboard V1.5.0;
- estado inicial com Undo desabilitado;
- criação de dois Post-its;
- Undo removendo somente a última alteração;
- Redo restaurando a alteração;
- seleção múltipla + Copy/Paste;
- Undo/Redo de paste;
- Command Palette por Ctrl/Cmd+K;
- execução de comando pela busca;
- menu de contexto de objeto;
- menu de contexto do canvas;
- histórico visual de edição;
- migração para a chave de metadata V1.5.0;
- cópia de Frame com conteúdo filho;
- preservação de hierarquia pai/filho ao colar;
- cópia de dois objetos conectados preservando a conexão interna;
- ausência de `pageerror`/console error nos fluxos testados.

## Resultados observados
- 2 Post-its → Undo: 1 → Redo: 2.
- Copy/Paste de 2 Post-its → 4 → Undo: 2 → Redo: 4.
- Frame + Card copiados → 2 Frames + 2 Cards, com hierarquia preservada.
- 2 Post-its + 1 conexão copiados → 4 Post-its + 2 conexões.
- Command Palette retornou 18 comandos no estado inicial.

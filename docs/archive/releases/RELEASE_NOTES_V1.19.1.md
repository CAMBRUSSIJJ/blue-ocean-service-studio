# BLUE OCEAN Service Studio — V1.19.1
## Whiteboard Core Reliability

A V1.19.1 não adiciona novos módulos de produto. Ela corrige a camada de interação do Whiteboard a partir das falhas reveladas pelo Whiteboard Sim Kit 2.0.

## Corrigido
- Inspector deixa de destruir/recriar o textarea a cada tecla.
- Foco e cursor deixam de depender de um `renderAll()` durante digitação.
- Edição textual deixa de criar um snapshot completo de Undo por caractere.
- Novos post-its/objetos procuram posição livre e não nascem todos empilhados no mesmo ponto.
- Atalhos de uma letra não disparam sobre botões, links, campos, selects, contenteditable, textbox/combobox e demais controles interativos.
- Objetos ganham operação básica por teclado e atributos acessíveis.
- Toast passa a anunciar status via `aria-live`.
- Drag atualiza geometria incrementalmente em vez de reconstruir o overlay durante cada movimento.
- Connection handles críticos passam a usar listeners de pointer explícitos.
- Canvas expande para objetos distantes à direita/baixo; 5200×3200 vira piso de tamanho.
- Conflitos entre abas preservam uma cópia do trabalho em `conflictDraft` antes de bloquear o save.
- Voltar do quadro livre não depende mais de reload da aplicação.
- O primeiro Whiteboard reconhece um Serviço criado externamente mesmo se o Whiteboard Core já tinha carregado o workspace vazio.
- `serviceBuilderAssistant` expõe `setMode`, eliminando a incompatibilidade que derrubava F7.
- F6 do Sim Kit deixa de quebrar por procurar um botão com texto exato “Template”.

## Sim Kit 2.1
O pacote inclui `qa/whiteboard-sim` atualizado para V2.1, preservando checkpoints históricos e separando assertions bloqueantes de known issues/diagnósticos/benchmarks.

Os checkpoints de placement, foco, atalhos, acessibilidade, canvas dinâmico, conflito e navegação mudam automaticamente para `RESOLVED` quando a correção é observada dinamicamente.

## QA executado neste ambiente
- `npm run qa`: **903 OK / 0 FAIL**.
- Whiteboard Core Reliability: **42/42**.
- Service Builder Assistant: **51/51**.
- Creation Architecture Reset: **83/83**.
- Guided Service Builder: **117/117**.
- Sim Kit static contracts: **16/16**.
- Sim Kit script syntax: **OK**.
- `tsc --noEmit --noCheck`: **OK**.
- package-lock verify: **OK**.
- source authority: **OK**.
- source foundation: **OK**.
- Linux preflight: **OK**.

## Validações que NÃO serão declaradas como aprovadas
O `npm ci` e o `npm install` do Sim Kit não conseguiram completar neste ambiente dentro do tempo disponível/registry acessível, portanto o Sim Kit 2.1 dinâmico não foi marcado como PASS aqui.

Um gate source-only de navegador real também foi preparado (`scripts/v1191-browser-reliability.py`), mas o Chromium deste ambiente bloqueia `127.0.0.1` com `ERR_BLOCKED_BY_ADMINISTRATOR`. Assim, drag/conexão em browser real continuam exigindo execução em uma máquina sem essa restrição.

## Known issues que permanecem
- expansão para esquerda/cima ainda não suporta coordenadas negativas;
- conexões ainda não carregam semântica `relationType`;
- assets de imagem ainda podem usar data URL dentro do grafo;
- Undo geral continua baseado em snapshots amplos;
- conflito entre abas possui proteção do rascunho, mas ainda não tem UI de compare/merge.

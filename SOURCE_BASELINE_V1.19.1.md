# SOURCE BASELINE — V1.19.1 Whiteboard Core Reliability

## Base
V1.19.0 — Service Builder Assistant + Whiteboard Sim Kit 2.0.

## Objetivo
Consertar os problemas comportamentais revelados pelo Sim Kit em uso real do Whiteboard antes de adicionar novas funções ao produto.

## Invariantes preservados
- workspace novo continua vazio;
- criar Serviço continua sendo uma ação explícita;
- Whiteboard livre continua separado de Journey e Blueprint;
- abrir o Assistente não cria conteúdo escondido;
- Service Graph continua sendo a fonte canônica de dados.

## Mudanças principais
### Inspector e renderização
- digitação em `textarea` não executa mais `renderAll()` por tecla;
- foco/cursor permanecem no campo durante edição;
- o DOM visual do item selecionado é atualizado incrementalmente;
- histórico de Undo não recebe snapshot completo a cada tecla; a edição é consolidada no `blur`.

### Drag e conexão
- handlers críticos de pointer usam `addEventListener('pointerdown', ...)`;
- drag atualiza posição/medidas do DOM incrementalmente durante `pointermove`;
- o Sim Kit 2.1 mantém as assertions 2.5 e 3.6 para validar mouse/pointer.

### Placement
- novos objetos sem posição explícita usam `findOpenPlacement()`;
- colisões iniciais são evitadas com grade e busca de espaço próximo à viewport.

### Teclado e acessibilidade
- atalhos globais ignoram inputs, textareas, selects, `contenteditable`, comboboxes, botões, links e demais controles interativos;
- itens do canvas recebem `tabindex=0`, `role=button` e `aria-label`;
- Enter/Espaço selecionam; Delete remove; setas movem;
- toast possui `role=status` e `aria-live=polite`.

### Canvas
- 5200×3200 passa a ser tamanho mínimo, não limite físico positivo;
- `boardWorldSize()` expande a superfície para direita/baixo conforme objetos distantes;
- coordenadas negativas continuam fora do escopo desta release.

### Persistência e navegação
- conflito entre abas cria um rascunho protegido em storage antes de rejeitar o save;
- API expõe leitura/limpeza do `conflictDraft`;
- botão Voltar do Whiteboard livre fecha sem `location.reload()` e navega para `whiteboards`;
- criação do primeiro Whiteboard sincroniza o Service Graph persistido caso o núcleo tenha sido inicializado antes da criação do Serviço.

### Service Builder / Sim Kit
- API pública do Assistente passa a expor `setMode` além do alias legado `mode`;
- F6 deixa de depender do texto exato “Template”;
- F7 usa a API pública compatível e o fluxo do primeiro Serviço reconhece o grafo recém-persistido;
- Sim Kit atualizado para 2.1.0.

## Limitações mantidas
- coordenadas negativas ainda são limitadas em zero;
- conexões não possuem `relationType` semântico;
- imagens ainda podem residir como data URL no grafo;
- Undo geral ainda usa snapshots amplos (exceto a correção de digitação desta release);
- interface de resolução/merge de conflito entre abas ainda não foi criada, embora o trabalho deixe de ficar apenas em memória;
- gate dinâmico jsdom depende de `jsdom`, `fake-indexeddb` e `esbuild` instaláveis pelo npm;
- gate Playwright foi preparado, mas o Chromium deste ambiente bloqueia localhost com `ERR_BLOCKED_BY_ADMINISTRATOR`.

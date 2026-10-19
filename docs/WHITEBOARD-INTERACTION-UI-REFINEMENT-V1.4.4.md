# V1.4.4 — Whiteboard Interaction & UI Refinement

## Objetivo

Transformar o Blueprint Whiteboard de um editor com painéis permanentes em um ambiente de modelagem visual no qual o **canvas domina a interface** e a complexidade aparece somente quando é necessária.

## Decisões de UX

### 1. Canvas primeiro

A biblioteca e o inspector deixaram de ocupar colunas fixas. Ambos são drawers sobrepostos. Quando nenhum objeto está selecionado, o inspector fica fechado.

### 2. Uma única noção de visualização

Livre, Blueprint, Fluxo e Journey são quatro organizações geométricas sobre os mesmos objetos. O seletor fica no cabeçalho e não sugere quatro módulos independentes.

### 3. Ferramentas progressivas

A toolbar principal fica flutuante e contém somente as ações de uso frequente. Gerenciamento de quadro e exportação ficam no menu `•••`.

### 4. Objetos estruturados sem ruído técnico

Cards inteligentes continuam vinculados ao Service Graph. O vínculo passa a ser sinalizado de forma discreta e as propriedades detalhadas aparecem no inspector.

## Interações adicionadas

- conexão por handles laterais;
- resize por alça inferior direita;
- seleção múltipla com toolbar contextual;
- guias inteligentes de alinhamento;
- Snap na grade independente das guias;
- frames como containers visuais persistentes;
- mover um frame move seus filhos;
- minimapa adaptativo;
- ajustar seleção e ajustar tudo;
- importação da Jornada com estratégia escolhida pelo usuário.

## Persistência

A fonte de verdade continua em:

`realtalent-service-studio-v2-service-graph`

Preferências de UX e relações puramente visuais da V1.4.4 ficam em:

`realtalent-service-studio-v144-whiteboard-meta`

Na primeira abertura, a V1.4.4 tenta ler `realtalent-service-studio-v143-whiteboard-meta` para preservar preferências da versão anterior.

## Contrato de frames

A relação item → frame é visual. Ela não altera a entidade de domínio. Um objeto é considerado dentro de um frame quando o centro do card está contido na área do frame após uma movimentação. A relação é salva em `frameParents[boardId][itemId] = frameId`.

## QA executado

A camada V1.4.4 foi exercitada em Chromium headless com runtime isolado. Foram validados:

- abertura do overlay sem erros JavaScript;
- canvas ocupando toda a área abaixo do cabeçalho;
- inspector fechado por padrão;
- biblioteca sobreposta;
- criação de frame e post-it;
- associação do post-it ao frame;
- resize handle e connection handles;
- template Fluxo com 6 cards e 5 conexões;
- conexão adicional por handle;
- seleção múltipla e toolbar contextual;
- agrupamento com seleção do grupo inteiro;
- Blueprint com 5 faixas;
- importação da Jornada com 5 estratégias;
- reorganização para Journey;
- menu de quadro e inspector de configurações;
- movimento de frame carregando o item filho na mesma distância.

O launcher final continua independente de npm para uso normal.

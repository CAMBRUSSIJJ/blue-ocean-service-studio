# BLUE OCEAN Service Studio — V1.19.3
## Whiteboard Interaction & Structure UX

A V1.19.3 transforma quatro pontos de atrito observados no uso real do Whiteboard em uma camada única de interação: **zoom/navegação**, **gestão de quadros**, **renomeação sincronizada** e **criação/reutilização intuitiva de objetos estruturados**.

## Zoom e navegação
O controle de zoom passa a trabalhar de **10% a 400%** com:
- slider persistente na barra inferior;
- `−` e `+` graduais;
- retorno explícito para 100%;
- **Ajustar tudo**;
- **Ajustar seleção**;
- `Ctrl/Cmd + wheel` ancorado no ponto sob o cursor.

O canvas autoexpansível e os atalhos de navegação da V1.19.1 continuam preservados.

## Gestão real de Whiteboards
A biblioteca passa a expor um menu `•••` por quadro com:
- **Renomear**;
- **Duplicar**;
- **Excluir**.

A exclusão possui confirmação própria e remove somente o Whiteboard/representações visuais daquele quadro. Entidades canônicas do serviço usadas em outros lugares são preservadas.

## Renomear no próprio Whiteboard
Cards podem ser renomeados inline por duplo clique.

Para Smart Objects, a edição altera a **entidade canônica**, portanto o nome passa a ser refletido nas demais visualizações que usam aquele objeto. Para objetos livres, a mudança continua local ao item visual.

O Inspector também usa edição incremental, preservando foco/cursor e evitando renderização total a cada tecla.

## Remover do quadro × Excluir do serviço
Smart Objects passam a deixar explícita a diferença:
- **Remover do quadro** — remove apenas a representação desta view;
- **Excluir do serviço…** — calcula impacto, pede confirmação e remove a entidade canônica e relações dependentes conforme o `deletePlan`.

Isso reduz o risco de o usuário apagar dados do serviço quando queria apenas limpar a tela.

## Entity Picker V2
O antigo seletor técnico foi substituído por uma experiência contextual.

Por padrão o usuário escolhe entre:
- **Criar novo**;
- **Reutilizar existente**.

### Etapas
O sistema pergunta:
> “Qual é o próximo momento relevante da experiência?”

Com exemplos rápidos como Descobrir, Escolher, Agendar, Receber, Utilizar, Resolver e Encerrar.

### Pontos de contato
O sistema pergunta:
> “Onde o cliente interage com o serviço?”

Com sugestões como WhatsApp, Site, Aplicativo, Telefone, Loja física, Atendente e E-mail.

### Reutilização organizada
Entidades existentes são agrupadas por contexto:
- Desta construção;
- Neste quadro;
- Deste serviço;
- Arquivados.

Itens já presentes no quadro são **localizados**, não duplicados. Nomes equivalentes são detectados por normalização e o usuário é orientado a reutilizar a entidade já existente.

## Imagens mais intuitivas
Ao selecionar uma imagem, o Inspector deixa de mostrar apenas os campos técnicos genéricos e apresenta:
- **Onde esta imagem entra?**
- **Etapa relacionada**;
- **Área do serviço**.

Assim imagens, referências e evidências visuais podem ser organizadas junto da experiência/operação sem exigir conhecimento prévio de “camadas”.

## Linguagem de produto
Na biblioteca principal, “Do Service Graph” foi substituído por **Estrutura do serviço**. O Service Graph continua canônico internamente e disponível em superfícies avançadas, mas deixa de ser pré-requisito de entendimento para tarefas básicas.

## QA executado
- `npm run qa`: **1045 OK / 0 FAIL**;
- V1.19.3 Interaction & Structure UX: **70/70**;
- V1.19.2 Visual Service Builder: **72/72**;
- V1.19.1 Whiteboard Core Reliability: **42/42**;
- V1.19.0 Service Builder Assistant: **51/51**;
- V1.18.9 Creation Architecture Reset: **83/83**;
- V1.18.8 Guided Service Builder: **117/117**;
- Sim Kit 2.3 static contracts: **32/32**;
- `tsc --noEmit --noCheck`: **OK**;
- package-lock verify: **OK**;
- source authority: **OK**;
- source foundation: **OK**;
- Linux preflight: **OK**.

## Não declarado como aprovado neste ambiente
`npm ci` foi tentado, mas o npm registry respondeu `EAI_AGAIN` para múltiplos pacotes. Portanto esta release **não declara** como PASS:
- build React/Vite completo;
- `typecheck` completo dependente da instalação;
- execução dinâmica do Sim Kit 2.3 com `jsdom/fake-indexeddb/esbuild`.

Nenhum `node_modules` parcial ou `dist` antigo é incluído nos pacotes finais.

## Limitações conhecidas mantidas
- plano infinito real para coordenadas negativas ainda não existe;
- edges ainda não possuem `relationType` semântico;
- imagens ainda podem residir como data URL no Service Graph;
- conflito entre abas preserva rascunho, mas ainda não tem UI final de compare/merge;
- testes visuais de pixel/drag/touch continuam dependentes de navegador real.

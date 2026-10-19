# Release Notes — V1.8.4

## Blueprint Grid UX + Cells + Sticky Headers

A V1.8.4 melhora a leitura e a edição direta da matriz do Service Blueprint sem alterar o modelo de dados.

### Entregas

- cabeçalhos de Etapa fixos no viewport;
- labels de lane fixas à esquerda durante navegação;
- 6 lanes operacionais preservadas;
- células `Etapa × Lane` com estados vazio/preenchido;
- ação contextual `+ Adicionar` em cada célula;
- contador de itens nas células preenchidas;
- criação contextual já atribuindo Etapa e Lane;
- edição direta da Ação do Cliente na célula correspondente;
- ajuda contextual nas três linhas semânticas;
- Blueprint Grid API `window.__rtBlueprintGrid`;
- migração V1.8.3 → V1.8.4.

### Sem mudança de arquitetura

O Service Graph permanece fonte única de verdade. Sticky headers e células são projeções da View Blueprint e não entidades persistidas separadamente.

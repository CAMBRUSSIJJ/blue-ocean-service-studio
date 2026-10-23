# Uma matriz para Jornada e Blueprint

**Jornadas e Blueprints** é uma única entrada no menu do projeto. A biblioteca
reúne as jornadas e os blueprints existentes, preservando as buscas e a exibição
em cartões ou tabela de cada conjunto. Atalhos e sessões antigos de Blueprint
também abrem essa biblioteca.

![Matriz compartilhada em 1440 px com dados fictícios](imagens/matriz-compartilhada-desktop.png)

## Duas perspectivas no mesmo editor

No cabeçalho do mapa, **Jornada** mostra a experiência do cliente e **Blueprint**
mostra as faixas operacionais. A alternância muda as faixas visíveis e preserva
as faixas personalizadas; não cria etapas, cartões ou cópias do serviço.
**Personalizar visualização**, os demais presets e as visualizações nomeadas
continuam disponíveis. A perspectiva fica salva junto das preferências do mapa.

As linhas têm fundo suave e divisórias entre etapas. Os cartões de texto e
conteúdo usam a mesma borda e superfície, mantendo seus tipos e metadados.
Os títulos das etapas aparecem em formato de seta.

## Adicionar e editar cartões

Passe o ponteiro na célula para mostrar **+ Adicionar cartão** sobre uma linha
tracejada. O mesmo controle aparece antes de cada cartão para inserir naquele
ponto. Use Tab para alcançar os botões pelo teclado. Em dispositivos com toque,
os controles ficam visíveis e têm alvos maiores.

O catálogo mantém texto, cartão, imagem, emoji, link, escala, conteúdo incorporado
e vínculos com registros do serviço. Editar, duplicar, mover, remover e
desfazer/refazer continuam disponíveis. As operações preservam os IDs originais.

![Matriz em 390 px com dados fictícios](imagens/matriz-compartilhada-celular.png)

## Filtros e ferramentas preservados

**Filtros** abre e recolhe o painel de busca, Persona, tipo e tag. O indicador
avisa quando há filtros ativos, inclusive com o painel recolhido. Classificação,
seleção e edição em lote continuam descritas no [guia dos cartões](journey-card-tools.md).

Nos cartões operacionais vinculados, **Ações da nota → Detalhes operacionais**
abre os detalhes canônicos da atividade ou evidência. A edição operacional
detalhada mantém as restrições existentes em celulares.

**Ferramentas → Recursos avançados** mantém revisão, estratégia e qualidade,
importação/exportação, guia e auditoria dos vínculos. **Editor operacional
completo** dá acesso às demais ferramentas do Blueprint. **Voltar à matriz**
retorna ao editor compartilhado sem duplicar ou remover registros.

## Verificar o fluxo

`npm run maps:matrix:browser` verifica navegação compartilhada, inserção antes
de um cartão, alternância de perspectivas, edição operacional, faixas próprias,
retorno das ferramentas completas, persistência e toque. Também executa Axe
na biblioteca e na matriz em 1440, 834 e 390 px. As evidências ficam em
`artifacts/shared-map-matrix/` e não são versionadas.

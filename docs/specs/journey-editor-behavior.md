# Especificação funcional independente — editor de jornadas

Versão 1, 22/10/2026. Produto: Blue Ocean Service Studio.

## Premissas

Uma jornada tem etapas com identidades estáveis, faixas, elementos e vínculos
com o serviço. Visualizações são configurações sobre a mesma jornada. Exibir,
ocultar ou apresentar conteúdo não cria uma cópia da jornada nem altera as
entidades vinculadas. A ausência de uma observação não vira valor neutro.

As fontes e a comparação inicial estão no
[registro de observação](../research/smaply-observation-2026-10-22.md). As regras
abaixo são decisões independentes para o Blue Ocean; números, nomes de ações e
limites são escolhas do nosso produto, não afirmações sobre a referência.

## Contratos de comportamento

| ID | Entrada e ação | Resultado verificável | Prioridade e estado inicial |
| --- | --- | --- | --- |
| B01 | Criar mapa vazio, nomear e adicionar duas etapas | As etapas têm identidade própria e não contêm ações ou emoções inventadas | P0, existente |
| B02 | Ocultar/reordenar faixas e voltar à visualização anterior | Conteúdo, vínculos e ordem dos elementos permanecem salvos | P0, existente |
| B03 | Escolher um ponto antes de um cartão e inserir conteúdo | O novo elemento ocupa aquele ponto; os demais mantêm identidade e ordem, inclusive após recarga | P0, a implementar |
| B04 | Abrir inclusão em uma faixa com padrão e pressionar Enter sem busca | O padrão da faixa é usado. Com busca preenchida, Enter escolhe o primeiro resultado visível | P0, a implementar |
| B05 | Focar o cartão fora dos campos de edição e usar Ctrl/Cmd+D ou Delete | Duplicação tem nova identidade e conteúdo independente; exclusão pode ser desfeita. Atalhos não capturam digitação, formulários ou diálogos | P0, a implementar |
| B06 | Salvar uma visualização nomeada, mudar o mapa e reaplicá-la | Restaurar visibilidade/ordem de faixas, ajuste de tela e contexto da Persona. Os dados atuais continuam sendo a única fonte | P0, a implementar |
| B07 | Renomear, atualizar ou excluir uma visualização | Nomeação não altera conteúdo; atualização é explícita; excluir a configuração não exclui o mapa. Salvar/excluir pode ser desfeito | P0, a implementar |
| B08 | Apresentar a visualização atual e baixar HTML | Apenas faixas visíveis entram nesse recorte, com seu contexto; o resumo executivo completo continua uma ação separada | P0, a implementar |
| B09 | Trocar Persona e registrar uma emoção | Observações por etapa/Persona ficam isoladas; histórico sem Persona e zero explícito são preservados | P0, existente |
| B10 | Analisar dor, selecionar evidência, planejar e medir | A cadeia usa as entidades reais do serviço; referências não duplicam os registros de origem | P0, existente |
| B11 | Atribuir Personas específicas a qualquer cartão e filtrá-los | Exige metadados próprios e filtragem que preserve todos os índices e vínculos canônicos | P1, backlog |
| B12 | Fazer cartões cobrirem várias etapas, seleção múltipla e hierarquia | Exige contratos adicionais de alcance, edição em lote e navegação | P1, backlog |

## Invariantes da inclusão

O ponto de inserção usa a identidade do próximo elemento, não um índice guardado
que possa ficar desatualizado. Se a referência não existir mais, a inclusão deve
falhar de modo explícito em vez de ser colocada em outro ponto. Cancelar o
seletor ou o formulário não cria um elemento. O limite por célula e o orçamento
de imagens continuam valendo. Duplicar uma representação de um registro mantém
o vínculo à mesma fonte, mas duplica profundamente os dados locais do cartão.

## Invariantes das visualizações

- São até 20 configurações por jornada, com nomes únicos sem distinguir maiúsculas.
- O registro contém apenas nome, identificador, datas, preferências e Persona;
  não contém etapas, imagens, notas, medições ou cópias de entidades.
- Configurações são independentes por jornada e sobrevivem ao backup do projeto.
- Faixas removidas são ignoradas ao aplicar. Faixas novas, ausentes da ordem
  capturada, permanecem ocultas nesse recorte até edição explícita.
- Uma Persona indisponível gera erro visível ao aplicar, sem troca silenciosa
  para outra pessoa e sem alteração parcial das preferências.
- O contexto de Persona desta versão muda a leitura emocional. Os demais
  conteúdos continuam comuns; não há alegação de filtro completo por Persona.
- Aplicar uma visualização é uma ação de preferência; salvar, atualizar,
  renomear e excluir a configuração são transações do projeto.

## Tarefas de aceitação

1. Criar duas etapas e três notas, inserindo a segunda entre as demais.
2. Cancelar uma inclusão intermediária e conferir que nada foi criado.
3. Configurar padrão de Emoji e usar Enter com busca vazia e depois com busca.
4. Duplicar/remover uma representação vinculada e usar desfazer/refazer.
5. Salvar visões de revisão e operação, com Personas e faixas diferentes, e
   voltar a cada recorte depois de editar um dado da jornada.
6. Apresentar/exportar um recorte e comparar o conjunto de faixas com o mapa.
7. Reordenar etapas, recarregar e conferir identidades, notas e configurações.
8. Repetir inclusão e aplicação de visualização por toque em 390 px e conferir
   navegação por teclado e acessibilidade em 1440, 834 e 390 px.

O roteiro usa dados fictícios e pode ser executado automaticamente no Blue
Ocean. Uma comparação interativa no produto observado e o teste com
participantes são etapas separadas, ainda não realizadas neste registro.

## Entrega do incremento e correspondência com os testes

A especificação inicial e a observação foram registradas no commit `da7b8db`,
anterior ao código deste incremento. Os estados da tabela inicial acima são
preservados como ponto de partida. B03–B08 foram implementados; B11 e B12
continuam no backlog. Não houve execução autenticada no Smaply.

| Contrato | Implementação | Verificação reproduzível |
| --- | --- | --- |
| B03 | Âncora no próximo elemento; validação explícita de célula cheia/âncora removida; cancelamento sem mutação | `journey:observation:test` e navegador: ordem A/B/C, identidades, recarga, reordenação e toque |
| B04 | Opção rápida do padrão com busca vazia; busca preenchida usa catálogo filtrado | Navegador: padrão Emoji, escolha de Texto por busca, foco |
| B05 | Foco no cartão e cópia profunda; referências à origem preservadas | Domínio: independência dos valores e identidade; navegador: referência, Ctrl+D, Delete, histórico e edição de texto |
| B06 | Configurações por jornada; dados atuais compartilhados | Domínio: ausência de cópias, Persona removida e faixas novas; navegador: Personas, faixas/ordem, recarga e toque |
| B07 | Criar, renomear, atualizar e remover; nomes únicos e limite de 20 | Domínio: nomes, limites e isolamento; navegador: erro visível, atualização e exclusão com desfazer |
| B08 | Apresentação/exportação explícita das faixas visíveis | Navegador: conjunto de faixas e HTML comparados ao mapa; conteúdo oculto aparece somente no resumo completo |

As capturas e relatórios axe são gerados em `artifacts/journey-observation/`,
com telas de 1440, 834 e 390 px e contexto de toque em 390 px. Os comandos e
seus limites estão em [Testes](../testes.md). A regressão de Personas, dores,
evidências e planos permanece em `journey:context:browser`; o piloto com pessoas
e a comparação interativa entre produtos continuam pendentes.

## Próximo incremento — cartões por Persona (B11)

Esta seção especifica o incremento antes de sua implementação. A fonte pública
S04 já registrada orienta a tarefa; regras e interface abaixo são escolhas do
Blue Ocean. Não houve nova sessão no produto observado.

- Cada elemento composto aceita até 20 vínculos explícitos com Personas. Nenhum
  vínculo significa conteúdo comum. Os cartões atuais continuam comuns sem
  migração; referências a registros do serviço não inferem esse vínculo.
- A Persona da jornada continua escolhendo a observação emocional. Um filtro
  separado permite todos os cartões, Persona e comuns ou somente Persona.
  Os dois últimos modos exigem uma Persona selecionada.
- Novos cartões criados com filtro ativo recebem vínculo à Persona selecionada,
  anunciado junto ao filtro. Duplicação mantém vínculos; desvincular é explícito.
- A filtragem é apenas de exibição. Os índices, identidades, etapas, dados e
  vínculos canônicos permanecem completos ao editar, mover ou excluir um cartão
  visível. Campos de escala, menus e pontos de inclusão usam os índices originais.
- Vínculos a Personas removidas ficam identificados como indisponíveis até
  remoção explícita. Não se tornam conteúdo comum automaticamente.
- Visualizações salvas guardam o modo do filtro. As antigas abrem com todos os
  cartões. O recorte apresentado/exportado respeita o filtro; o resumo executivo
  completo continua incluindo todos os cartões, com os vínculos identificados.
- Contexto da etapa e dores/ideias da faixa nativa permanecem comuns. Filtrar
  cartões vinculados a uma dor não filtra ou remove o registro canônico da dor.
- Salvar vínculos é uma edição com histórico; trocar o modo é preferência de
  exibição. Recarga e backup preservam vínculos e visualizações.

Aceitação: intercalar cartões comuns, de A, B e A+B; alternar os três modos;
editar, duplicar, inserir, remover, mover e ajustar escala com cartões ocultos
antes/depois; conferir desfazer/refazer e reordenação de etapas; salvar/aplicar
visões; apresentar/exportar e recarregar; remover uma Persona; repetir por toque
em 390 px e auditar teclado/axe em 1440, 834 e 390 px.

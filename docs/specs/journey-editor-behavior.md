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

## Entrega de B11

A seção B11 acima foi registrada em `70fa08f`, antes do código. O incremento
implementa vínculos opcionais em todos os elementos compostos, os três modos de
filtro e persistência nas visualizações. As afirmações de conteúdo comum na
primeira versão deste documento descrevem a base anterior: cartões agora podem
ter vínculos; contexto da etapa e dores/ideias nativas continuam comuns.

`journey:persona-content:test` verifica normalização, legado, vínculos múltiplos,
fontes independentes, Personas indisponíveis, cópia, serialização e configurações.
`journey:persona-content:browser` executa o roteiro de B11, incluindo controles
com índices originais, ações nativas completas no grafo, histórico, recarga,
HTML, teclado, toque e axe. Capturas e relatórios ficam em
`artifacts/journey-persona-content/`. O teste com participantes não foi realizado.
B12 (alcance em várias etapas, seleção múltipla e hierarquia) permanece no backlog.

## Incremento B12 — abrangência, seleção e fases

Contrato independente registrado antes do código. Este incremento usa as fontes
públicas já documentadas; não acrescenta observação autenticada do concorrente.

- Um cartão pode abranger etapas explicitamente escolhidas. Existe um único
  conteúdo editável, na etapa de origem, e a abrangência usa identidades estáveis.
  Segmentos contínuos ocupam a largura das etapas; após reordenação, segmentos
  separados mostram continuações que levam à mesma origem. Etapas intermediárias
  não escolhidas não ganham o cartão automaticamente.
- A origem deve estar na abrangência. Reduzir a uma etapa torna o cartão comum
  de uma célula. Mover a origem mantém os membros anteriores e inclui o destino;
  duplicar o cartão conserva a abrangência e os vínculos, com nova identidade.
- Excluir uma etapa remove sua participação. Se era a origem de um cartão amplo,
  o cartão passa para a primeira etapa participante restante. Sem participantes,
  ele é removido. Duplicar uma etapa copia seus cartões como cartões locais e não
  amplia os cartões anteriores. Desfazer restaura estrutura e conteúdo juntos.
- A seleção permite até 100 cartões exibidos, com duplicação, movimentação para
  outra etapa na mesma faixa e exclusão em uma transação. Trocar o recorte elimina
  da seleção cartões ocultos. Falhas de capacidade ou imagem rejeitam o lote sem
  alterações parciais. Selecionar não altera o projeto.
- Fases organizam uma hierarquia de um nível: fase → etapas. São até 20 fases,
  com nomes únicos de até 80 caracteres e participação exclusiva de cada etapa.
  Fases não alteram a ordem temporal e continuam vinculadas às etapas após
  reordenação; fases vazias são removidas ao excluir suas etapas.
- Abrangência e fases sobrevivem ao histórico, à recarga e ao backup. Filtros por
  Persona aplicam-se ao cartão inteiro. Apresentação/HTML identificam a fase e a
  abrangência; o conteúdo completo é apresentado uma vez, com referências de
  continuação nas demais etapas, sem multiplicar medições ou entidades.
- Alcance não cria atividades canônicas adicionais nas etapas participantes.
  Hierarquias com vários níveis e sub-jornadas não fazem parte deste contrato.

Aceitação: criar três etapas e cartões comuns/específicos, ampliar e editar uma
escala e um vínculo, fragmentar o alcance por reordenação, remover a origem e
recuperar pelo histórico, duplicar etapas/cartões, rejeitar lote cheio de forma
atômica, filtrar a seleção, criar/editar/remover fases, recarregar e exportar.
Repetir ações por teclado/toque e auditar axe em 1440, 834 e 390 px.

## Entrega de B12

O contrato foi registrado em `674b134`, antes do código. A entrega cobre
abrangência explícita por identidade, projeções contínuas/fragmentadas, seleção
em lote e fases com um nível. Cartões locais e abrangentes continuam no mesmo
documento; a apresentação em trilhas não cria novas entidades. Lotes são
validados antes da aplicação. História, serialização e transferências de origem
preservam os dados do cartão e seus vínculos.

As suítes `journey:structure:test` e `journey:structure:browser` verificam o
contrato, inclusive destinos cheios de cartões ocultos e acesso às origens.
Capturas e relatórios axe ficam em `artifacts/journey-structure/`. Não houve
piloto com participantes ou comparação interativa com o produto observado.
Hierarquia recursiva, sub-jornadas e colaboração remota exigem contratos futuros.

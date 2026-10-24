# Blueprint conectado

Jornada e Blueprint compartilham etapas e cartões. A perspectiva Blueprint
expõe a relação entre a experiência do cliente e a operação que a sustenta.
Contexto, emoções, dores, oportunidades e faixas personalizadas continuam
acessíveis pelo controle **Personalizar**. A visão operacional inicial reúne
evidências, ações do cliente, linha de frente, bastidores e apoio; as demais
faixas podem ser mostradas sem perder conteúdo nem preferências salvas.

- **Linha de frente / Frontstage:** ações percebidas pelo cliente, inclusive
  mensagens automáticas e interações digitais.
- **Bastidores / Backstage:** execução fora da percepção do cliente, incluindo
  triagem, análise, encaminhamento e encerramento do atendimento.
- **Sistemas e apoio:** recursos utilizados e processos que viabilizam a entrega,
  como manter acessos, integrações e regras de roteamento.
- **Evidências físicas e digitais:** artefatos percebidos pelo cliente, como
  telas, mensagens, protocolos e documentos.

Renomear uma faixa mantém seu papel metodológico. As linhas de interação,
visibilidade e interação interna dependem da posição e visibilidade das camadas.

## Editar uma atividade

Abra **Ações da nota → Detalhes operacionais**. Informe responsável, equipe,
recursos do serviço, ferramentas descritas, regras e estimativas de tempo.
Campos vazios permanecem sem informação. O zero é uma estimativa explícita.
Os vínculos existentes a papéis, canais, políticas e demais detalhes avançados
continuam disponíveis em **Detalhes avançados do serviço**.

Para corrigir uma atividade de execução em Sistemas e apoio, escolha natureza
**Atividade** e mova-a para Bastidores ou Linha de frente no mesmo formulário.
A operação mantém a identidade do cartão e o registro canônico de origem; quando
muda o tipo da entidade, cria a entidade apropriada para a nova classificação.
Desfazer e refazer restauram a operação completa.

## Conectar atividades

Use **Conexões** ou **Conectar atividade** no menu de um cartão. A relação é
direcional: origem A e destino B.

| Relação | Significado |
| --- | --- |
| Sequência | A acontece antes de B; admite ciclos de atendimento. |
| Dependência | B precisa de A; ciclos de dependências são rejeitados. |
| Usa recurso | A utiliza B; B deve estar classificado como recurso. |
| Passagem entre equipes | Trabalho transferido de uma equipe para outra. |

Uma passagem exige equipes de origem e destino diferentes e a descrição do que
será transferido. Prazo e condição de aceite são opcionais. O marcador de passagem
só aparece para uma relação registrada explicitamente; uma seta não cria uma
transferência automaticamente.

A visualização padrão mostra as conexões do cartão selecionado. É possível
mostrar todas ou ocultá-las. O diálogo fornece uma lista acessível para editar e
excluir conexões, inclusive quando seus cartões estão em faixas ocultas.
Ocultar ou recolher faixas não exclui os vínculos. Excluir um cartão remove seus
vínculos da matriz, com recuperação pelo histórico.

As conexões acompanham a identidade dos cartões, inclusive entre etapas.
Preferências de exibição pertencem à visualização; atividades e conexões
pertencem ao documento e são incluídas no backup. O resumo completo inclui as
relações; a apresentação de uma visualização salva respeita suas faixas e filtros.

## Geometria da matriz

Cabeçalhos, pontos emocionais, cartões de emoções e conexões utilizam as larguras
reais das etapas. Redimensionamento, zoom, ajuste à tela e recarga preservam esse
alinhamento. **Distribuir larguras** remove os ajustes individuais da perspectiva
atual e distribui as colunas sem modificar seu conteúdo.

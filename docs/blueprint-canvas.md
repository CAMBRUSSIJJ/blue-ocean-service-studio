# Canvas operacional do Blueprint

Na Jornada, selecione **Blueprint** para abrir o canvas. As etapas, os componentes
e as conexões usam os mesmos registros da matriz. O botão **Matriz** permite
continuar usando os editores de conteúdo e os filtros existentes; **Canvas
operacional** retorna ao novo modo. Cada perspectiva lembra sua visualização.

## Montar o mapa

1. Adicione as etapas do atendimento com **+ Etapa**.
2. Escolha um componente na biblioteca ou arraste seu tipo para uma etapa.
3. Informe o nome e a posição no inspetor. **Adicionar ao Blueprint** cria o
   registro e o coloca no mapa em uma única operação. **Cancelar** descarta o
   rascunho.
4. Selecione um componente para editar responsável, equipe, canal, execução,
   espera, prazo, recursos, regra e indicador. Use **Salvar componente** para
   confirmar. O preenchimento mantém o foco no campo.

| Componente | Uso e posição |
| --- | --- |
| Atividade | Execução na linha de frente ou nos bastidores; processo de suporte em Sistemas e apoio. |
| Ponto de contato | Interação do cliente, na faixa Ações do cliente. |
| Evidência física/digital | Artefato do serviço percebido pelo cliente, como uma confirmação ou recibo. |
| Decisão operacional | Condição de execução da linha de frente ou dos bastidores. |
| Sistema | Plataforma que apoia o serviço. |
| Recurso | Pessoa, meio ou infraestrutura de apoio. |
| Indicador | Registro de uma medição do serviço; pode ser colocado nas faixas operacionais. |

Sistemas, recursos e indicadores podem reutilizar um registro existente. A
inclusão preserva seus dados. Uma decisão operacional registra uma regra do
atendimento; o histórico de decisões do projeto continua em sua área própria.
Evidências de pesquisa mantêm seus registros e fontes na Jornada e na matriz.

## Ler e organizar

A linha de frente reúne o que o cliente percebe. Os bastidores mostram a
execução interna; Sistemas e apoio mostram o que viabiliza essa execução. As
linhas de interação, visibilidade e interação interna aparecem quando as faixas
correspondentes estão visíveis e em uma ordem semanticamente válida.

O layout organiza os cartões em pilhas por etapa e faixa, sem sobreposição.
Arrastar um componente muda sua posição; etapa e faixa também podem ser
alteradas no inspetor pelo teclado. Mudar entre linha de frente, bastidores e
suporte preserva a identidade visual e registra a reclassificação dos dados.
**Desfazer** e **Refazer** usam o histórico existente do projeto.

Se forem exibidos no canvas, contexto, emoções, dores e ideias aparecem como
resumos dos registros da Jornada. Selecioná-los abre a matriz para editar seus
campos específicos, preservando observações e fontes.

No computador, arraste o fundo para mover, use a roda para ampliar e **Ajustar**
para enquadrar o mapa. O controle **Detalhes** alterna a visão geral e as
informações operacionais; no modo automático, o afastamento reduz o conteúdo dos
cartões. O nome completo permanece disponível na seleção e no inspetor. Com o
foco no canvas, as setas movem a visão, `+` e `-` ampliam/reduzem e `0` enquadra.
Com o foco em um cartão ou conexão, `Enter` ou espaço abre suas propriedades.

No celular, o mapa mostra uma etapa por vez. Use a seleção de etapa ou as setas
para navegar. **+ Componente** abre a biblioteca e selecionar um cartão abre
suas propriedades. Ambos os painéis têm botão de fechar.

## Relacionar e revisar

**Criar conexão** permite escolher origem e destino pelos campos ou selecionar
dois cartões no canvas. Os vínculos têm quatro tipos:

| Relação | Significado |
| --- | --- |
| Sequência | Uma atividade acontece antes da outra; retornos no atendimento são permitidos. |
| Dependência | O destino depende da origem. Dependências circulares são rejeitadas. |
| Usa recurso | A origem utiliza um sistema, recurso ou indicador de apoio. |
| Passagem entre equipes | Registra equipes distintas, entrega, prazo e condição de aceite. |

Vínculos duplicados com mesma origem, destino e tipo são rejeitados. Selecionar
uma conexão permite editar ou removê-la. O seletor **Conexões** mostra todas, as
da seleção ou oculta as linhas, preservando os vínculos salvos.

**Revisar operação** reúne responsáveis ausentes, esperas, prazos excedidos,
dependências e transferências registradas. A revisão usa os valores informados;
não mede automaticamente o atendimento nem executa transferências.

**Exportar SVG** gera um mapa independente com setas, rótulos e os detalhes da
transferência nos títulos acessíveis do arquivo. **Dados e backup** abre a
exportação completa do projeto. O SVG é uma visualização; o backup JSON permite
recuperar os registros editáveis. Remover um componente do mapa remove suas
conexões visuais e mantém o registro original do serviço.

O canvas respeita o papel de acesso do projeto e utiliza a persistência local ou
a sincronização remota já configurada. Não cria outro banco ou outro projeto.

## Verificação

```bash
npm run blueprint:canvas:test
npm run build
npm run blueprint:canvas:browser
```

O teste de domínio verifica layout denso, movimentação, metadados, exportação e
preferências. O teste em Chromium passa pela interface, pelo grafo canônico,
pelo histórico e pela recarga, além dos fluxos e da acessibilidade no celular.

# Mapas do serviço

Um mapa reúne a experiência do cliente e a operação. **Blueprint**, **Jornada** e
**Matriz** são opções do seletor **Visualização** dentro do mesmo editor. A
biblioteca mostra uma entrada por mapa; as Jornadas existentes e os Blueprints
vinculados continuam nos mesmos registros, com seus IDs e histórico.

O editor usa o padrão claro da Jornada: fundo branco, faixas suaves e controles
azuis. A biblioteca de componentes fica à esquerda. Os detalhes avançados só
aparecem quando solicitados.

## Criar um cartão

1. Arraste um componente da biblioteca para a célula desejada. A célula destaca
   se o destino é compatível. Também é possível usar **+ Adicionar cartão** na
   própria célula ou **+ Componente** na barra.
2. O mapa mostra um cartão provisório no destino. Digite o nome, acrescente uma
   observação se quiser e pressione **Enter** ou **Criar cartão**.
3. **Escape** ou o botão de fechar cancela o rascunho, sem criar registros órfãos.

O formulário inicial possui nome e texto opcional. Responsável, equipe, tempos,
recursos, regras e indicadores ficam em **Detalhes opcionais**, no menu do cartão.
Para canais, sistemas, recursos e outros registros já cadastrados, **Usar um
registro existente** permite reutilizar seus dados sem criar outra entidade.

Soltar fora da grade ou em uma faixa incompatível não escolhe um destino
silenciosamente. A criação e a persistência do cartão formam uma única operação.
O rascunho visual ainda não é um componente salvo.

## Componentes e faixas

| Grupo | Componentes |
| --- | --- |
| Experiência do cliente | Ação do cliente, canal, ponto de contato, emoção, pensamento, Persona, necessidade, dor e ideia de melhoria. |
| Operação do serviço | Atividade, decisão operacional, evidência física/digital, sistema, recurso e indicador. |
| Anotações | Cartão livre; **Mais tipos de conteúdo** abre o seletor de imagens, links, escalas, conteúdo incorporado, planos e demais registros existentes. |

As faixas incluem Contexto, Evidências, Canais, Ações do cliente, Pensamentos,
Emoções, Linha de frente, Bastidores, Sistemas e apoio e Dores e ideias. Cada
visualização escolhe um recorte inicial. Adicionar um componente pode revelar sua
faixa. **Faixas** permite escolher visibilidade, ordem e personalização.

Canais são registros do serviço. Emoções usam o contexto de Persona selecionado
no cabeçalho: uma observação de uma Persona não é copiada para outra. A emoção
pode ser registrada como hipótese; sua validação e fonte continuam disponíveis
nos editores existentes. Evidências físicas/digitais representam artefatos do
serviço; evidências de pesquisa preservam seus registros e fontes específicos.

## Etapas e movimentação

O **+ discreto ao lado do cabeçalho de cada etapa** insere outra etapa
imediatamente depois dela. O botão **+ Etapa** da barra adiciona ao final. Dar um
nome e pressionar Enter confirma. Inserir uma coluna preserva as etapas antigas,
os cartões, os vínculos e a posição dos problemas.

Arraste cartões entre etapas e faixas compatíveis. O destino é realçado e a
prévia acompanha o movimento. A posição solicitada aparece durante a gravação;
se houver erro, o documento confirmado é mantido. Ações podem ser reclassificadas
entre cliente, linha de frente, bastidores e suporte, preservando a identidade
visual e o registro de origem. Uma emoção só pode ser movida para outra etapa
sem sobrescrever uma observação já existente no contexto atual.

**Desfazer** e **Refazer** usam o histórico do projeto. O menu do cabeçalho da
etapa permite renomear, e as operações existentes de duplicação e remoção
continuam disponíveis no contexto do mapa.

## Conectar pelo próprio cartão

- Clique no **ponto de conexão na lateral do cartão** e depois no cartão de
  destino. A conexão de sequência é criada diretamente, sem abrir o inspetor.
- Ou clique com o **botão direito** no cartão e escolha **Conectar a outro cartão**.
- O menu **···** oferece as mesmas ações por clique ou toque. Os controles também
  aceitam foco de teclado e Enter/espaço.
- Durante a conexão, a barra contextual permite escolher outra relação.
  **Escape** ou **Cancelar conexão** cancela o gesto.

| Relação | Regra |
| --- | --- |
| Sequência | A origem acontece antes do destino; retornos no atendimento são permitidos. |
| Dependência | O destino depende da origem. Ciclos são rejeitados antes da gravação. |
| Usa recurso | O destino deve ser um recurso compatível do serviço. |
| Passagem entre equipes | Pede equipes diferentes, entrega, prazo e aceite em um diálogo específico. |

Clique em uma linha para editar a relação ou sua descrição. Vínculos duplicados
com origem, destino e tipo iguais são rejeitados. A criação de uma sequência
simples não exige preencher um formulário operacional.

## Navegar e revisar

A roda rola o mapa; **Ctrl + roda** amplia/reduz, e arrastar o fundo move a visão.
Os controles **−**, **Ajustar** e **+** ficam no canto do canvas. Com o foco no
canvas, as setas movem a visão, `+` e `-` mudam o zoom e `0` enquadra o mapa.
O zoom semântico ajusta a quantidade de informações e o tamanho dos títulos.

No celular, o mapa mostra uma etapa por vez. As setas e a seleção de etapa
permitem navegar; criar e editar usam o mesmo cartão simples. O menu **···**
permite conectar cartões sem depender de botão direito ou de um painel lateral.

**Revisar operação** utiliza os responsáveis, esperas, prazos, dependências,
transferências e melhorias registrados. Não representa uma medição automática
da operação nem envia tarefas a outras pessoas.

Em **Mais**, **Exportar SVG** gera uma visualização independente com setas,
rótulos e detalhes das transferências. **Dados e backup** abre os recursos de
exportação e recuperação do projeto. O SVG é uma visualização; o backup JSON
preserva os registros editáveis. O editor respeita os papéis de acesso existentes.

## Verificação

```bash
npm run maps:flow:test
npm run build
npm run maps:flow:browser
npm run blueprint:canvas:browser
```

A verificação inclui arrastar da biblioteca, cancelar rascunhos, criar com Enter,
inserir etapa intermediária, mover entre blocos, usar conexão contextual,
alternar visualizações, recarregar e editar no celular. Os testes de domínio e
as regressões avançadas também verificam referências, histórico, exportação,
regras de conexão e acesso somente de leitura.

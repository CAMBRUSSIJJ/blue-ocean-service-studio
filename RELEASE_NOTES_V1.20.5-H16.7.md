# V1.20.5-H16.7 — Research Flow & Flexible Discovery

## Pesquisa mais clara
- Remove o breadcrumb interno duplicado da Pesquisa.
- No modo Fundamentos, a entrada deixa de falar em “projeto de pesquisa” e passa a orientar pela pergunta: **o que você quer descobrir?**
- Substitui o indicador rígido “1 de 4 passos” por estados independentes de Pergunta, Campo, Evidências e Aprendizados.
- Evidência sem origem fica em atenção e não conta como etapa estruturada.
- O painel de evidência só abre quando a pessoa escolhe um card e funciona como drawer sobreposto, liberando largura para o fluxo.
- Estados vazios ensinam Material → Observação → Evidência → Aprendizado e o uso de arrastar e soltar.
- “Sem origem” vira uma ação explícita para vincular a procedência.
- Pessoas, necessidades, dores e problemas ficam acionáveis como continuação da compreensão, não como KPI genérico.

## Linguagem específica
- Remove rótulos genéricos como “Elementos do contexto/serviço” das superfícies atuais.
- Passa a nomear diretamente **Pessoas, Necessidades, Dores e Problemas**, para ajudar a pessoa a pensar no que precisa registrar.

## Dois caminhos de trabalho
- O modo Fundamentos deixa claro que não existe uma ordem obrigatória.
- A pessoa pode organizar Pesquisa/contexto primeiro ou começar no Whiteboard/Journey e registrar descobertas durante o desenho.
- Journey permite criar Persona, Necessidade e Dor no momento em que aparecem; uma Necessidade criada com etapa selecionada é vinculada automaticamente à etapa.
- Whiteboard oferece “Começar livre” ou “Usar o que já foi pesquisado”; a criação dentro do quadro continua usando os objetos canônicos do ServiceGraph.

## Arquitetura
- Não cria banco, entidade ou modelo paralelo.
- Pesquisa, Journey e Whiteboard reutilizam as entidades canônicas existentes e mantêm a rastreabilidade entre as superfícies.

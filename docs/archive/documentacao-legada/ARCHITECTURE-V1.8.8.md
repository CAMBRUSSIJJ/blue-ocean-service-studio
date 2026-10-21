# Arquitetura V1.8.8

O Service Graph do runtime visual é a fonte canônica. A interface React consulta e altera o graph pelo __rtDataBridge. Eventos rt-graph-changed atualizam o Plano de Ação; ele não mantém um escritor independente no armazenamento.

Transações clonam o graph, preservam coleções estendidas e usam o histórico visual para undo/redo. Graph e metadados possuem a mesma revisão. Falha no segundo write restaura o armazenamento anterior; revisões mais antigas não podem sobrescrever uma revisão mais recente. Eventos storage só adotam pares com revisão consistente.

localStorage não oferece transações reais entre abas. O controle de revisão reduz conflitos, mas não substitui colaboração multiusuário. Exportar backups continua necessário. Mantivemos as chaves das versões anteriores para migração local.

Abrir ou enquadrar uma vista não marca a jornada como editada. Os quadros possuem journeyId; cards e diagnósticos usam esse vínculo para resolver etapas. Duplicação remapeia objetos e etapas da jornada, mantendo contatos compartilhados do serviço.

Saúde da Jornada verifica estrutura, contatos, canais e emoções. Saúde do Blueprint verifica preenchimento e relações, com pesos normalizados e critérios opcionais. Nenhum desses indicadores estima satisfação real, eficácia operacional ou evidências de pesquisa.

O build publica apenas os runtimes ativos V1.8.8. O servidor Python usa 127.0.0.1:4173 para manter a origem dos dados e encerra com mensagem clara se a porta estiver ocupada.

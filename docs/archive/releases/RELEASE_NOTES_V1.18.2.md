# BLUE OCEAN Service Studio — V1.18.2
## Home Information Architecture & DOM Ownership Recovery

### Corrigido
- Elimina a colisão entre React e runtimes legados que podia resultar em `Node.insertBefore: Child to insert before is not a child of this node`.
- React passa a ser o único proprietário estrutural da sidebar e do header nativos.
- Pesquisa, Inteligência, Benefícios, Revisão, Simulação, Colaboração e Configurações agora possuem entradas nativas na sidebar React; runtimes apenas abrem/fecham suas superfícies.
- Shell Consistency, Precision Studio e Workspace runtime deixam de inserir/reordenar nós dentro do shell React nativo.

### Adicionado
- Home 3.0 com hierarquia focada no serviço.
- Próxima Melhor Ação determinística.
- Service Pulse determinístico: Estrutura, Evidências, Governança e Execução.
- Contexto do serviço no hero: status, owner, última atualização e número de jornadas.
- Continuidade baseada no item realmente mais recente.
- Attention Queue ordenada por severidade.
- Gates `dom:ownership:smoke` e `home:v3:smoke`.

### Melhorado
- Home deixa de enfatizar quatro KPIs genéricos e passa a orientar decisão/continuidade.
- Criação rápida duplicada na Home foi retirada; `+ Criar` global continua como launcher canônico.
- Atividade passa a ficar oculta por padrão e pode ser reativada em Personalizar.
- Sidebar fica estável e declarativa, sem injeções estruturais concorrentes.

### Removido
- Injeção estrutural de navegação dentro da sidebar React pelos runtimes legados.
- Reescrita externa do breadcrumb/header nativo.
- Faixa operacional de quatro KPIs na Home React.
- Bloco duplicado de criação rápida na Home ativa.

### Compatibilidade
- Service Graph Schema V3 preservado.
- IDs, storage, IndexedDB, backups e migrations preservados.
- Nenhuma migração de dados obrigatória.

### Limitações
- Service Pulse é determinístico e ainda não possui pesos configuráveis.
- Owner do serviço usa, nesta ordem, owner da Jornada principal ou membro local atual; `Service.owner` ainda não existe no schema.
- Typecheck/build completo depende de dependências instaladas. O ambiente de empacotamento não concluiu `npm ci` por indisponibilidade do registry.

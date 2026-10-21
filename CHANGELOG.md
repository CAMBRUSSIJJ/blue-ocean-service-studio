# Histórico de mudanças

## Início guiado e navegação da Jornada — 21/10/2026

- Redesenha o estado vazio com uma prévia ampla e duas ações: criar a primeira etapa ou aplicar a estrutura inicial opcional.
- Recupera o ponto de partida de mapas vazios cuja introdução já havia sido dispensada.
- Oferece faixas de ações, pensamentos e emoções com ícones, descrições e vínculos reais ao serviço.
- Melhora a hierarquia das etapas e faixas, o foco do formulário e a criação por Enter.
- Acrescenta Ajustar à tela ao controle de zoom, preservando o conteúdo e a opção de restaurar 100%.
- Amplia a regressão de entrada para validar os dois caminhos e o enquadramento em computador, tablet e celular.

## Botões e ações dos mapas — 21/10/2026

- Padroniza cores, altura, bordas, ícones e estados de foco, seleção e indisponibilidade nas bibliotecas e nos cabeçalhos de Jornada e Blueprint.
- Agrupa Cards/Tabela em um seletor e organiza as ações dos cards em rodapés alinhados, com exclusão identificada por ícone e confirmação.
- Ajusta busca e controles para celular e tablet, preservando as ações e os vínculos entre Jornada e Blueprint.
- Acrescenta regressão no Chromium para três larguras, incluindo nomes longos, navegação, criação de etapas e acessibilidade das bibliotecas.

## Navegação confiável e experiência local clara — 21/10/2026

- Impede que Colaboração continue capturando cliques depois de sair da área.
- Alinha páginas de Colaboração e Configurações ao cabeçalho real, incluindo sidebar recolhida.
- Torna a entrada sem conta a ação principal e explica que perfis locais compartilham projetos neste navegador.
- Identifica os logins sociais indisponíveis antes do clique e mantém o acesso a perfis existentes como opção secundária.
- Acrescenta backup do projeto no editor de Jornada e uma regressão que verifica o arquivo exportado com as edições atuais.
- Corrige nomes acessíveis, contraste e legibilidade nos fluxos auditados, com validação automática de acessibilidade em desktop e celular.
- Simplifica a biblioteca de Jornadas vazia e comunica o modo de leitura de Whiteboard/Blueprint no celular.
- Apresenta colaboração e sincronização conforme as capacidades locais disponíveis; a operação remota depende de um backend ainda não provisionado.

## Organização do repositório — 21/10/2026

- Reestrutura a apresentação e os guias atuais em português.
- Arquiva 670 notas, relatórios e documentos históricos por assunto, preservando seu conteúdo.
- Atualiza os caminhos consultados pelos contratos de regressão, mantendo as verificações.
- Acrescenta orientações de contribuição, segurança e convivência, além de modelos de issues e pull requests.
- Adiciona verificação de links da documentação e padroniza versão do Node, finais de linha e configurações do editor.
- Reutiliza o build validado entre os jobs de CI e limita permissões, duração e execuções concorrentes.

Consulte o [índice da documentação](docs/README.md) para os guias atuais e o
[arquivo histórico](docs/archive/README.md) para registros por versão.

## Entrada contínua e início guiado da Jornada

- Remove a seção duplicada de ferramentas da visão geral do projeto.
- Corrige o login para ocupar toda a largura, com ondas animadas, fundo contínuo e campos sem bordas duplicadas.
- Isola o estilo da entrada das regras do workspace e respeita movimento reduzido.
- Dá ao mapa uma superfície própria, direção nos cabeçalhos, ícones nas faixas e áreas de escrita mais convidativas.
- Oferece uma estrutura inicial opcional com etapas e faixas essenciais, preservando os mapas existentes e o histórico em uma única ação.

## Blueprint: estrutura e revisão da entrega

- Completa a vista operacional com evidências do serviço e as linhas de interação, visibilidade e interação interna.
- Distingue artefatos percebidos pelo cliente de evidências de pesquisa; registros antigos permanecem preservados e pedem classificação explícita.
- Acrescenta detalhes de atividades com papéis, canais, relações, execução, espera, prazo, capacidade, demanda, falhas, recuperação e contribuição para a promessa.
- Verifica vínculos ausentes, dependências circulares, prazos inviáveis e demanda superior à capacidade, separando cobertura estrutural de revisão da entrega.
- Acrescenta estratégia opcional com os 7 Ps e cinco dimensões de qualidade percebida, sem novos controles permanentes no canvas.
- Preserva metadados em backups, cancelamento e histórico; mantém as novas formas editáveis em desktop e tablet e a revisão disponível no modo de leitura do celular.

## Cartões mais suaves e seletor de faixas padronizado

- Integra o texto à superfície do cartão, com bordas leves, sombras discretas e ajuste automático da altura.
- Padroniza os ícones de tipos de faixa, vínculos do serviço, ações do cartão e formatação.
- Organiza os tipos de conteúdo em duas colunas, com descrições curtas e uma seção própria para informações do serviço.
- Acrescenta navegação do seletor por teclado, restauração de foco e suporte a movimento reduzido.
- Verifica textos longos, compactação, estabilidade do cartão, alcance das opções em telas menores e acessibilidade do seletor aberto.

## Editor exclusivo em tela inteira

- Abre a Jornada diretamente em uma superfície de tela inteira, ocultando sidebar, cabeçalho do projeto, abas e breadcrumbs, com isolamento e restauração do foco.
- Reúne os comandos essenciais em uma barra compacta e move mão, histórico e zoom para um grupo flutuante no canto inferior esquerdo.
- Adiciona navegação com mão e Espaço temporário, preservando a edição direta e o conteúdo dos mapas.
- Mantém matriz detalhada, Blueprint e retorno ao serviço acessíveis em Visualizações.
- Alinha o Blueprint guiado ao mesmo padrão de cabeçalho compacto e controles flutuantes, com recursos avançados sob demanda.
- Amplia a validação de tela inteira, navegação, teclado, acessibilidade, persistência e uso em telas menores.

## Edição simplificada e sidebar recolhível

- Torna o recolhimento da sidebar visível e sincroniza botão, atalho e preferência salva.
- Reúne ações de etapas e faixas em menus contextuais, reduz controles repetidos e remove a barra de retorno duplicada.
- Abre o Blueprint com duas ferramentas essenciais, nomes de camadas mais claros, edição por clique na célula e um guia curto.
- Agrupa visualizações, backups e ferramentas avançadas sob demanda, mantendo as operações existentes.
- Acrescenta verificações reais de recolhimento, persistência, menus e alternância entre modos guiado e profissional.

## Jornada configurável 2.0

- Corrige a disponibilidade de desfazer/refazer, o bloqueio da primeira etapa por sobreposição e o deslocamento de controles ao sair da edição de um cartão.
- Adiciona propriedades de faixa, duplicação independente de cartões, cores, altura mínima e largura persistida das etapas.
- Define comportamentos de checklist, ícones, subetapas, imagem, referência externa, divisor e emoções.
- Melhora nomes, miniaturas da biblioteca, menus, contexto do serviço, telas menores e indicação de armazenamento local.
- Abre ou reutiliza um Blueprint em rascunho com as etapas e ações compartilhadas da Jornada.
- Acrescenta testes de domínio e aceitação no navegador. Consulte `docs/journey-editor-2.md`.

## V1.20.5-H17.0.5 — Journey Free Canvas (referência de interação Smaply)
- Restaura a base de navegação H17.0.4; altera apenas a apresentação da Jornada.
- Jornada abre em um mapa amplo com colunas horizontais, cartões de etapas, espaço de construção e zoom.
- Painel de edição contextual permite alterar etapas, ações, pensamentos, emoções, pontos de contato e registrar descobertas canônicas.
- Filtros controlam linhas opcionais, Visualizações abre a matriz detalhada antiga; os dois modos editam o mesmo ServiceGraph.
- Modo expandido sobrepõe só a interface visual enquanto aberto; botão Serviço retorna à tela original.
- Nenhuma exclusão ou migração de registros históricos.
- Teste H17.0.5 confere estrutura de edição, integração com StudioController, TypeScript sintático e controle de visibilidade.

## V1.20.5-H17.0.4 — Reference Journey Workflow

- Tela inicial agora prioriza Nova Jornada, Nova Persona e Nova Métrica, com Jornadas recentes clicáveis.
- Estrutura de fases permanece consultável, recolhida por padrão para não competir com a criação.
- Jornada usa uma escolha visual em tela cheia: em branco ou modelos reais editáveis do runtime.
- Seleção de Jornada usa editor integrado sem abrir automaticamente o canvas sobreposto.
- Etapas criadas diretamente no mapa, sem modal; descobertas de Pessoas, Necessidades, Dores e Evidências continuam canônicas.
- Corrige navegação redundante na Jornada e mantém dados de pesquisa existentes sem exigir Pesquisa para criar objetos.
- Sem promessa de IA: modelos explícitos existentes, nenhuma pesquisa nem conteúdo do serviço gerado automaticamente.

## V1.20.5-H17.0.3.1 — Guided Target Typecheck Hotfix
- Corrige TS2367 em `BlueprintWorkspaceView.tsx`: a seleção do próximo passo não inclui mais `research` após H17.0.3.
- Retira a condição impossível de destaque no botão legado; mantém os acessos diretos a Persona, Jornada e Métricas.
- Adiciona verificação de regressão, com testes H17.0.3 e anteriores compatíveis com releases de manutenção.
- Sem alterações em ServiceGraph, dados, migrações ou conteúdo de pesquisa salvo.

## V1.20.5-H17.0.3 — Direct Creation & Audience-first UX
- Acesso direto à criação de Jornada, Persona e Métricas.
- Fase Público-alvo independente de Pesquisa; jornada sem bloqueios.
- Pesquisa sai dos acessos principais, sem apagar dados existentes.
- Jornadas novas: em branco ou com orientação.

# V1.20.5-H17.0.2 — Design Overview Focus

- Retira a seção redundante **Retomar / Continue de onde parou** da Visão geral do Design do serviço.
- Mantém as fases, suas capacidades, próximos passos, relações e ações canônicas.
- Preserva as bibliotecas Journey, Blueprint e Whiteboard, sem apagar artefatos nem dados.
- Atualiza os smokes históricos H5/H7/H15.3 para a regra atual e inclui smoke H17.0.2.
- Não altera a organização de Personas, Necessidades, Dores, Problemas, Canais ou Touchpoints: decisão de arquitetura de informação ainda em discussão.

# V1.20.5-H17.0.1 — Sidebar Icon Typecheck Hotfix

- Corrige erro TypeScript TS2304: ícone `ChevronsUpDown` usado no seletor de serviço sem importação.
- Importa `ChevronsUpDown` pela fachada canônica `src/design-system/icons.ts`.
- Mantém a experiência única H17, sem alteração do ServiceGraph, estado salvo ou UX.
- Adiciona smoke de contrato para impedir regressão na importação do ícone.

# V1.20.5-H17 — Single Experience Baseline

- Remove o seletor Fundamentos / Aplicado / Avançado da interface.
- Define a antiga projeção Avançado como experiência canônica única do produto.
- Perfis anteriores salvos localmente são ignorados; nenhum dado do serviço é alterado.
- Remove chips visíveis de "Modo" para que a plataforma volte a evoluir como uma única experiência.
- Mantém contratos H16 em código apenas como compatibilidade histórica, sem torná-los selecionáveis.

# V1.20.5-H16.8 — Design Start Choice & In-Flow Discovery

- Simplifica a entrada da fase Desenhar em Fundamentos para um único CTA **Começar a desenhar**.
- Adiciona chooser por intenção: **Organizar a experiência** → Jornada e **Explorar visualmente** → Whiteboard.
- Recomenda Journey para começar sem bloquear o Whiteboard.
- Depois que há trabalho iniciado, prioriza continuidade na ferramenta usada mais recentemente.
- Mantém Whiteboard como ambiente transversal de exploração, não como capacidade obrigatória da fase.
- Permite registrar Pessoa, Necessidade, Dor e Evidência dentro da Journey sem interromper o desenho.
- Evita uma segunda pergunta de intenção ao abrir Whiteboard a partir do chooser.
- Preserva os objetos canônicos e não cria modelo de dados paralelo.

# V1.20.5-H16.7 — Research Flow & Flexible Discovery

- Remove o breadcrumb interno duplicado da Pesquisa e simplifica a entrada de Fundamentos para **Defina o que você quer descobrir**.
- Substitui o progresso rígido por estados independentes de Pergunta, Campo, Evidências e Aprendizados.
- Evidências sem origem passam a ser estado de atenção; somente evidências com material/observação de origem contam como estruturadas.
- O detalhe da evidência abre somente por seleção e vira drawer sobreposto, preservando a largura do fluxo.
- Estados vazios e drop zones passam a ensinar Material → Observação → Evidência → Aprendizado.
- Troca rótulos genéricos de “elementos” por **Pessoas, Necessidades, Dores e Problemas**.
- Adiciona escolha explícita entre estruturar contexto antes ou descobrir enquanto desenha.
- Journey passa a registrar Persona, Necessidade ou Dor durante o desenho; Necessidades podem ser ligadas automaticamente à etapa atual.
- Whiteboard permite começar livre ou com o que já foi pesquisado, mantendo os mesmos objetos canônicos do ServiceGraph.
- Não adiciona modelo de dados paralelo nem transforma Pesquisa em proprietária das entidades de contexto.

# V1.20.5-H16.6.1 — CSS Build Hotfix

- Corrige erro de sintaxe no `transition` dos cards H16.6 que fazia o PostCSS interpretar `background` como palavra desconhecida.
- Preserva integralmente a UX H16.6 de Pesquisa, incluindo Ferramentas, drag & drop e animações.
- Adiciona smoke específico para impedir a regressão `opacity .16s ease;background .16s ease`.
- Atualiza o smoke H16.6 para funcionar como verificação histórica em releases posteriores.

# V1.20.5-H16.6 — Research Workflow UX

- Pesquisa em Fundamentos deixa de repetir a navegação global de fases dentro da ferramenta.
- Subnavegação contextual passa a ser `Pesquisa | Ferramentas`, removendo `Valor do serviço` desse nível.
- Ferramentas ganham uma superfície própria organizada em Planejar, Coletar e Sintetizar.
- Cards do fluxo recebem hierarquia visual, affordance de arraste, hover/foco e animações discretas.
- Drag & drop é semântico: Material → Observação abre registro com origem; Observação → Evidência promove o registro; Evidência → Aprendizado pré-seleciona a evidência para síntese.
- Ações explícitas continuam disponíveis como alternativa acessível ao drag & drop.
- `prefers-reduced-motion` desativa animações e transições de movimento.

# V1.20.5-H16.5.1 — Research Proposal Typecheck Hotfix

- Corrige 18 erros `TS2367` introduzidos pela separação visual entre Fundamentos e os modos Aplicado/Avançado na H16.5.
- Remove comparações impossíveis com `foundation` do ramo profissional já estreitado pelo TypeScript.
- Mantém a experiência Fundamentos H16.5, os modos Aplicado/Avançado e o modelo de dados sem alterações funcionais.
- Atualiza os smokes históricos H16.1, H16.2 e H16.5 para reconhecer a evolução da interface sem exigir markup removido por releases posteriores.
- Adiciona smoke específico para impedir regressão do narrowing no Research Studio.

# V1.20.5-H16.5 — Research Proposal Layout

- Implementa a nova proposta visual da aba **Pesquisa** no modo Fundamentos.
- Substitui dashboard, KPIs e abas empilhadas por uma hierarquia única: cabeçalho → próximo passo → ferramentas → fluxo de pesquisa.
- Introduz três visualizações funcionais: **Fluxo**, **Lista** e **Mapa**.
- Organiza o fluxo em **Materiais → Observações → Evidências → Aprendizados**.
- Torna evidências selecionáveis e adiciona painel lateral para origem, uso no contexto e leitura do que está sendo compreendido.
- Reutiliza o Evidence Studio existente para ler relações com Persona, Necessidade, Dor e Problema, sem criar entidades paralelas.
- Mantém Pesquisa como fonte de compreensão sem transferir a propriedade das entidades de contexto para o Research Studio.
- Adiciona ferramentas rápidas para pergunta de pesquisa, entrevista, material, nota de campo, questionário e síntese.
- Adapta os modais do modo Fundamentos para **Nova pergunta de pesquisa** e **Aprendizado**, preservando o modelo ResearchProject/Insight internamente.
- Mantém os layouts Aplicado e Avançado da H15.6/H16 intactos.

# V1.20.5-H16.4 — Design do Serviço Proposal Layout

- Implementa a proposta visual enviada para **Design do serviço** no modo Fundamentos.
- Promove o próximo passo para um hero único e remove a duplicação visual do nome do serviço nessa experiência.
- Separa **Caminho do serviço** da **Fase em foco** e adota layout 2/1: trabalho principal à esquerda, conexão e resumo à direita.
- Faz **Lista** ser a visualização inicial da fase, preservando a alternância Lista / Cards como preferência local.
- Transforma a lista de capacidades em leitura compacta, com estado, descrição, métrica e ação textual na mesma linha.
- Converte **Como esta fase se conecta** em fluxo vertical e adiciona **Já estruturado** apenas quando uma fase realmente está completa.
- Ajusta a sidebar Fundamentos para **Entender / Desenhar / Testar / Melhorar / Acompanhar**, mantendo Pesquisa como única entrada de Entender.
- Mantém ServiceGraph, H16.3, H16.2 e os modos Aplicado/Avançado sem migração de dados.

# V1.20.5-H16.3 — Phase Status Consistency

- Unifica a fonte das linhas por fase para que stepper, contador e painel usem o mesmo conjunto de capacidades.
- Inclui **Elementos do contexto** no cálculo da fase Entender em Fundamentos.
- Faz estados `progress` e `attention` contarem como fase em construção, sem confundir seleção com progresso.
- Padroniza os estados do stepper em **Estruturada / Em construção / Não iniciada**.
- Mantém `aria-selected` exclusivamente como estado de navegação da fase ativa.
- Ajusta o próximo passo da Pesquisa para distinguir início de continuidade do trabalho.
- Mantém um único CTA primário por fase e transforma ações repetidas das linhas em links discretos.
- Preserva H16.2 Research-Driven Context + View Modes e todo o ServiceGraph existente.

# V1.20.5-H16.2 — Research-Driven Context + View Modes

- Reorganiza **Fundamentos** para que Pesquisa seja a principal entrada da fase **Entender**.
- Apresenta Personas, Necessidades, Dores e Problemas como **elementos do contexto compreendidos com apoio da pesquisa**, sem mover sua propriedade para o Research Studio.
- Adiciona o bloco **O que estamos compreendendo** à Pesquisa, com contagens e acesso direto a Pessoas, Necessidades, Dores e Problemas.
- Explicita o fluxo **Pesquisa → Evidências → Contexto**, preservando outras origens possíveis para os elementos do serviço.
- Substitui Ecologia como capacidade primária visível em Fundamentos por um bloco didático **Elementos do contexto**.
- Mantém Ecologia completa nos modos Aplicado e Avançado.
- Introduz alternância **Lista / Cards** na Fase em foco, persistida localmente por usuário.
- Lista usa o padrão compacto horizontal do workspace; Cards preservam a experiência guiada e visual.
- Ajusta guidance para que Fundamentos nunca recomende diretamente uma capacidade oculta como Ecologia.
- Preserva ServiceGraph, Context Library, H16.1 e os dados existentes.

# V1.20.5-H16.1 — Foundation Experience Deep Adaptation

- Aprofunda o modo **Fundamentos** para que ele deixe de ser apenas uma versão reduzida da interface profissional.
- Renomeia o seletor para **Modo** e corrige o popover: fecha ao clicar fora, pressionar Esc ou navegar.
- Reorganiza a sidebar de Fundamentos por intenção: **Entender, Desenhar, Melhorar e Acompanhar**.
- Mantém a taxonomia profissional intacta nos modos Aplicado e Avançado.
- Centraliza linguagem simples por capacidade e fase no Experience Profile.
- Faz o overview respeitar a visibilidade real do perfil também no stepper e nos cards de fase.
- Separa seleção de fase de progresso real: selecionar uma fase não pinta o conector como concluído.
- Remove percentuais e indicadores executivos desnecessários do modo Fundamentos.
- Torna o bloco Retomar contextual: em Fundamentos, artefatos de desenho aparecem quando a fase Desenhar está em foco.
- Redistribui os cards de Entender para aproveitar melhor a largura em desktop.
- Aprofunda a linguagem da Pesquisa em Fundamentos: **Coleta, Aprendizados e progresso em 4 passos** no lugar de jargão e percentuais.
- Preserva ServiceGraph, dados existentes, H16 e todas as capacidades profissionais nos outros modos.

# V1.20.5-H16 — Adaptive Experience Foundation

- Introduz **Experience Profile** como preferência local do usuário, independente dos dados do projeto.
- Cria três níveis de experiência: **Fundamentos**, **Aplicado** e **Avançado**.
- Adiciona sistema central de visibilidade, densidade e terminologia para adaptar a interface sem duplicar entidades nem bancos.
- Inclui seletor de experiência no header com aviso explícito de que nenhum dado é removido.
- Aplica projeção progressiva à navegação: Fundamentos reduz itens avançados; Aplicado preserva o fluxo essencial; Avançado expõe a maior densidade.
- Aplica a primeira projeção adaptativa em **Design do serviço** e **Pesquisa do serviço**.
- Em Fundamentos, Pesquisa ganha linguagem didática, guia em quatro passos e reduz a exposição de rastreabilidade técnica.
- Em Avançado, Pesquisa ganha indicadores adicionais de material, observações, origem, suporte e rastreabilidade.
- Design do serviço adapta terminologia, visibilidade de capacidades e densidade conforme o perfil.
- Preserva ServiceGraph, Service Model, H15.6 e todos os dados existentes; o nível altera somente a apresentação.

# V1.20.5-H7.40-H15.6 — Research Studio UX & Guided Actions

- Renomeia a experiência visível para **Pesquisa do serviço**, mantendo o contrato histórico Research Studio internamente.
- Torna o próximo passo da pesquisa determinístico: projeto → campo → evidência → insight → rastreabilidade.
- Reduz o topo para quatro indicadores principais: projetos, participantes, evidências e insights.
- Introduz maturidade orientativa da pesquisa sem bloquear navegação ou criação.
- Reorganiza o pipeline em um caminho compacto **Material → Observação → Evidência → Insight → Decisão**.
- Reforça a hierarquia entre navegação da pesquisa e conteúdo das abas.
- Redesenha o empty state de Projetos para ensinar pergunta, método e coleta antes da síntese.
- Mantém material e observação disponíveis como ações secundárias quando ainda não existe projeto.
- Melhora Campo e materiais, Evidências, Insights e Rastreabilidade com contexto e ações mais explícitas.
- Preserva H15.5, H15.4, H15.3, H15.2, Service Model e o pipeline H7.26.

# V1.20.5-H7.40-H15.5 — Discovery UX & Guided Actions

- Simplifica a navegação contextual do projeto removendo **Design do serviço** e **Pesquisa** da barra superior; ambos permanecem disponíveis pela navegação lateral canônica.
- Transforma a fase **Entender** em uma experiência guiada com cards dedicados para **Pesquisa**, **Ecologia do serviço** e **Proposição do serviço**.
- Pesquisa passa a mostrar projetos, observações, evidências, maturidade e próximo passo determinístico com base nos dados reais do Research Studio.
- Ecologia passa a usar linguagem de atores, relações e dependências, com exemplo visual que facilita compreender o conceito antes do primeiro mapeamento.
- Proposição passa a conectar necessidades, evidências, valor entregue e resultado, usando os gaps reais do modelo para orientar o próximo passo.
- Adiciona uma recomendação contextual dentro da fase **Entender** e um mapa visual **Pesquisa → Ecologia → Proposição** que ensina o método pela própria interface.
- Preserva H15.4, H15.3, H15.2, Service Model, dados existentes e navegação livre entre as fases.

# V1.20.5-H7.40-H15.4 — Design do Serviço Visual Polish

- Redesenha o **Caminho do serviço** como stepper visual premium, com linha de progresso, fase ativa destacada e estados legíveis sem depender apenas de cor.
- Transforma a fase ativa em um card de foco com progresso próprio e leitura rápida das capacidades estruturadas.
- Refina as capacidades para superfícies individuais, com mais respiro, hierarquia e ações consistentes.
- Evolui **Como esta fase se conecta** para um mapa visual de relações, mantendo Whiteboard e Prontidão como apoios não obrigatórios.
- Preserva o fluxo Entender → Projetar → Validar → Melhorar → Operar, H15.3, H15.2, Service Model e os contratos históricos.
- Corrige as propriedades `action` duplicadas antes de `...stateOf(...)`, eliminando o TS2783 reportado no H15.3.

# V1.20.5-H7.40-H15.3 — Design do Serviço UX Refinement

- Refina a aba **Design do serviço** sem alterar a arquitetura global do projeto.
- Reduz o peso visual do percentual de estruturação e torna o próximo passo mais compacto e explicável.
- Mantém o caminho **Entender → Projetar → Validar → Melhorar → Operar** como navegação livre, com a fase atual em foco.
- Padroniza as ações das capacidades em **Criar / Continuar / Ver**, reservando **Revisar** para estados que exigem atenção.
- Corrige a semântica de **Canais**, separando canais de touchpoints na leitura da capacidade.
- Trata **Whiteboard** como apoio de exploração, sem apresentá-lo como etapa obrigatória.
- Promove **Como esta fase se conecta** para uma visão contextual visível, em vez de deixar a arquitetura escondida.
- Preserva H15.2 Usage & Relations, H15 Service Model Index, H14 acessibilidade e os contratos históricos do Guided Workspace.

# V1.20.5-H7.40-H15.2 — Usage & Relations

- Torna visível o Service Model introduzido na H15 com um painel compartilhado de **Uso e relações**.
- Separa **Utilizado em** de **Relacionado a**, agrupando conexões por Pessoas, Descoberta, Design, Melhoria, Gestão, Operação e Governança.
- Introduz referências navegáveis entre objetos sem criar novas entidades nem novas rotas globais.
- Integra Persona, Necessidade, Job, Dor, Hipótese, Problema, Evidência, Ator, Touchpoint, Iniciativa e Métrica ao mesmo padrão de rastreabilidade.
- Preserva a arquitetura H14/H15, a sidebar e os contratos de persistência; a primeira entrega de relações permanece read-only.
- Reforça foco visível, alvos touch e comportamento responsivo no novo painel.

# V1.20.5-H7.40-H15 — Service Model Integration

- Introduz `Service Model Index` read-only sobre o `ServiceGraph`.
- Unifica resolução, relações, uso e cobertura sem duplicar entidades existentes.
- Formaliza a distinção entre problemas observados, validados e priorizados.
- Conecta Ecologia, Journey/Blueprint, Improvement, Outcomes, Governance e Operations no mesmo índice.
- Mantém a arquitetura e a navegação da H14 intactas.

## V1.20.5-H7.37 — Service Governance
- Adiciona a perspectiva **Governança** ao Service Workspace, totalizando 15 perspectivas conectadas.
- Cria registro explícito de owner, accountable, revisores, cadência e próxima revisão para Journey, Blueprint, Canal, Métrica e Iniciativa.
- Introduz aprovações controladas, histórico de revisões, itens vencidos, cobertura de ownership e governance score determinístico.
- Mantém histórico quando um alvo deixa de existir e não modifica automaticamente os artefatos governados.


## V1.20.5-H7.40-H8 — Project Home & Workspace Architecture
- Cria uma **Home global** acima do Service Workspace, com Continuar, Meus projetos, Favoritos e Templates.
- Separa formalmente **Projeto × Serviço** na interface: o projeto organiza o trabalho; o serviço é o objeto desenhado dentro dele.
- Adiciona biblioteca local multi-projeto com snapshots independentes, projeto ativo, favoritos e troca de projeto sem apagar o anterior.
- O Guided Service Workspace H7.40-H7 passa a ser o interior do projeto, acessado por `Home → Projetos → Projeto → Serviço`.
- A sidebar muda de navegação global (Home/Projetos/Templates) para navegação contextual do projeto quando um projeto é aberto.
- H7.40-H8 smoke: 25/25; Chromium Project Home: 8/8; suíte acumulada: 4697 OK / 0 FAIL.


## V1.20.5-H7.40-H14 — Interaction & Accessibility Polish
- Diferencia **Serviço** global de **Design do serviço** dentro do projeto para reduzir ambiguidade de navegação.
- Mantém a sidebar global persistente e adiciona recolhimento por seção com preferência salva localmente.
- Compacta o header dentro das ferramentas e reforça `aria-current`, `focus-visible`, targets de interação e legibilidade das capability rows.
- Torna o feedback de persistência explícito: `Salvando…`, `Salvo neste dispositivo` e `Não foi possível salvar`.
- Ajusta a copy do caminho guiado para permitir iteração: `Evolua o serviço, fase por fase`.

## V1.20.5-H7.40-H7 — Guided Service Workspace
- Transforma a Visão Geral em um guia operacional: estruturação, próximo passo determinístico, retomada e caminho Entender → Projetar → Validar → Melhorar → Operar.
- Substitui cards de capacidades por linhas escaneáveis com estado, métrica e ação; Cockpit e Prontidão permanecem leituras derivadas e não contam como capacidade estrutural.
- Adiciona Guidance Engine determinística baseada no estado real do Service Graph, sem IA ou aleatoriedade para decidir a sequência.
- Introduz cabeçalho compacto nas ferramentas e mantém KPIs secundários recolhíveis.
- H7.40-H7 smoke: 36/36; Chromium Guided Workspace: 10/10; suíte acumulada: 4672 OK / 0 FAIL.

## V1.20.5-H7.40-H5 — Service Workspace Simplification
- Simplifica a Visão Geral do Service Workspace com progressive disclosure: Continue de onde parou, 6 KPIs essenciais e 5 fases de trabalho.
- Remove os 16 cards estreitos da superfície principal; capacidades detalhadas passam a aparecer por Entender, Projetar, Validar, Melhorar e Operar.
- Colapsa indicadores secundários, remove a sub-aba redundante de Visão geral e padroniza linguagem visível de Resultados, Governança e Operação.
- Corrige sobreposição de CTA por construção: cards de fase usam layout flex, rodapé em fluxo normal e grid responsivo 5/3/2/1.

## V1.20.5-H7.40-H4 — UX Polish

- Dashboard ganhou **Meu Serviço**, progresso por fundamentos e próxima ação contextual.
- Hierarquias agora explicam Personas isoladas e oferecem CTAs de continuidade.
- Oportunidades ganhou fluxo visual Oportunidade → Dor validada → Solução → Iniciativa e preview de itens.
- Catálogo de métricas diferencia definição de métrica de acompanhamento em Resultados.
- Rótulos visíveis `Whiteboard 2.0` e `Journey Map 2.0` foram removidos da superfície comercial.
- Densidade, empty states e responsividade foram refinados sem criar novas entidades ou módulos.
- H7.40-H4 smoke: 26/26; Chromium polish: 8/8; suíte acumulada: 4600 OK / 0 FAIL.

## V1.20.5-H7.40-H3 — Product Coherence & Navigation
- Reorganiza as 18 perspectivas do Service Workspace em **Visão geral, Entender, Projetar, Validar, Melhorar e Operar**, removendo o mega-tab horizontal da superfície principal.
- Renomeia a entrada principal da sidebar de **Blueprints** para **Serviço** e diferencia **Oportunidades** de **Iniciativas** e **Catálogo de métricas** de **Resultados**.
- Corrige a navegação do Executive Cockpit, que enviava um payload incompatível para o evento interno de troca de perspectiva.
- Adiciona watchdog de autosave para impedir o estado visual de salvamento de permanecer indefinidamente quando o graph sofre mudanças frequentes.
- Remove nomenclatura interna `Whiteboard 2.0`, melhora a explicação de Hierarquias e troca o CTA de Problemas para **Validar novo problema**.
- Adiciona browser gate de coerência para garantir ausência de overflow horizontal global em 1920 px, tablet e mobile.


## V1.20.5-H7.40 — Professional Product Hardening
- Adiciona a perspectiva **Prontidão** para diagnóstico honesto de persistência, recovery, RBAC, integridade, runtime e acessibilidade.
- Adiciona autosave com debounce para o estado React, flush em `pagehide`/`beforeunload`/`visibilitychange` e reaproveita o recovery durável já existente do Whiteboard Core.
- Reforça RBAC também no fallback React, preservando o guard canônico do Data Bridge para Owner/Editor/Commenter/Viewer.
- Mantém `npm ci`, React typecheck, Vite build, browser full-app e deploy como gates externos: UNKNOWN/UNAVAILABLE nunca vira PASS; adiciona um browser hardening H7.40 escopado, executado em Chromium real.


## V1.20.5-H7.39 — Executive Service Cockpit
- Adiciona a perspectiva **Cockpit** ao Service Workspace, totalizando 17 perspectivas conectadas sobre 16 capacidades operacionais/readiness.
- Consolida Saúde do Serviço, Prioridades, Portfolio, Outcomes, Governança e Operations Bridge em uma visão executiva derivada e read-only.
- Introduz Executive Score determinístico com seis dimensões ponderadas e agenda executiva ordenada por severidade e urgência.
- Expõe riscos de problema crítico, iniciativa atrasada/bloqueada, métrica fora da meta, iniciativa implementada sem prova, revisão vencida/aprovação pendente e vínculo operacional em erro.
- Não cria um segundo silo de dados e não modifica os artefatos-fonte.

## V1.20.5-H7.38 — Service Operations Bridge

- Added an explicit Operations Bridge between Service Governance and operational consolidation.
- Maps Touchpoint → Activity, Journey → Workflow, Channel → Communication, Blueprint → Process, Initiative → Execution and Metric → Data source.
- Supports provider-neutral operational references with Blue Ocean, RealTalent CRM, Webhook, manual and other-system providers.
- External providers require an explicit external reference before a binding can be activated.
- Added execution history with simulated, success, partial and failed outcomes without pretending to call unavailable external connectors.
- Missing design targets are detected without deleting historical mappings.

## V1.20.5-H7.36 — Metrics & Service Outcomes
- Adicionada a perspectiva Resultados ao Service Workspace, totalizando 14 perspectivas conectadas.
- Métricas canônicas agora podem ser ligadas a Proposição, Journey, Touchpoints, Handoffs, Blueprints e Iniciativas.
- Adicionados baseline, meta, direção, valor corrente, histórico de medições, tendência e progresso determinístico.
- Portfolio H7.35 agora pode provar outcome real por métricas, incluindo alerta de iniciativa implementada sem evidência de resultado.
- Nenhum artefato de serviço é alterado automaticamente por análise de outcomes; vínculos e leituras são explícitos.

## V1.20.5-H7.35 — Improvement Portfolio
- Adiciona a perspectiva **Portfolio** ao Service Workspace e eleva o workspace para 13 perspectivas conectadas.
- Converte somente oportunidades Selecionadas/Planejadas em iniciativas explícitas e idempotentes.
- Introduz fluxo Backlog → Planejada → Em execução → Validando → Implementada.
- Planeja responsável, resultado esperado, impacto, esforço, risco, prazo e progresso.
- Adiciona dependências entre iniciativas com bloqueio determinístico e detecção de atraso.
- Mantém rastreabilidade até Oportunidade/Problemas e vínculos validados com Decisões, Experimentos e Métricas.
- QA H7.35: 176/176; suíte acumulada: 3684 OK / 0 FAIL.
- React typecheck completo, build Vite e validação visual em navegador não são declarados como PASS porque `npm ci` não concluiu; `node_modules` parcial foi removido.

## V1.20.5-H7.34 — Problems, Opportunities & Prioritization
- Adiciona a perspectiva **Prioridades** ao Service Workspace e eleva o workspace para 12 perspectivas conectadas.
- Consolida sinais de Pesquisa, Problemas validados, Journey, Canais, Protótipos, Atual × Futuro e Blueprint em um backlog único.
- Preserva múltiplas proveniências no mesmo problema sem duplicar a entidade do backlog.
- Introduz priorização determinística por Impacto, Frequência, Esforço, Risco e Urgência, com score 0–100 e bandas de prioridade.
- Mantém histórico quando a fonte desaparece por meio de `sourceActive=false`, sem apagar triagem ou decisões anteriores.
- Cria oportunidades ligadas aos problemas priorizados e importa oportunidades legadas de forma idempotente.
- QA H7.34: 175/175; suíte acumulada: 3508 OK / 0 FAIL.
- React typecheck completo, build Vite e validação visual em navegador não são declarados como PASS porque `npm ci` não concluiu; o source final foi limpo novamente.

## V1.20.5-H7.33 — Current × Future Service
- Adiciona a perspectiva **Atual × Futuro** e separa formalmente baseline atual de target futuro.
- Snapshot atual captura Proposição, Journeys, Canais, Blueprints e responsabilidades; o Futuro permanece editável sem mutar objetos canônicos.
- Decisões aprovadas da H7.32 podem ser projetadas no Futuro antes da aplicação operacional.
- Gaps são derivados deterministicamente e possuem status, responsável e nota.
- QA H7.33: 134/134; suíte acumulada: 3333 OK / 0 FAIL.

## V1.20.5-H7.32 — Decision & Iteration Loop
- Adiciona a perspectiva **Decisões** ao Service Workspace, entre Aprendizados e Blueprint.
- Converte aprendizado revisado em decisão explícita com snapshot de recomendação, confiança e síntese.
- Introduz pacotes de mudança `antes → depois` para Proposição, Journey e Blueprint, com whitelist de campos e enums controlados.
- Fluxo Draft → Proposed → Approved/Rejected → Applied, separando aprovação de aplicação.
- Guardrail de conflito compara o estado atual com o snapshot antes de aplicar e bloqueia o pacote inteiro se houver edição concorrente.
- Aplicação aprovada é atômica: nenhum alvo é parcialmente alterado quando existe conflito.
- QA H7.32: 190/190; suíte acumulada: 3199 OK / 0 FAIL.
- React typecheck completo, build Vite e validação visual em navegador não são declarados como PASS porque `npm ci` não concluiu; o source final foi limpo novamente.

## V1.20.5-H7.31 — Evidence & Learning System
- Adiciona a perspectiva **Aprendizados** ao Service Workspace, entre Protótipos e Blueprint.
- Materializa rodadas concluídas do Prototype Lab em evidências canônicas (`sourceType: experiment`) com proveniência explícita.
- Cria aprendizado versionado por rodada de experimento, com hipótese capturada, verdict, confiança, recomendação, síntese e racional.
- Impede duplicação de evidências/aprendizados ao processar novamente a mesma rodada concluída.
- Mantém Journey, etapas, Touchpoints, Proposição, cenários, Canais e Blueprint inalterados; aplicação de mudanças fica para o Decision & Iteration Loop.
- QA H7.31: 141/141; suíte acumulada: 3009 OK / 0 FAIL.

## V1.20.5-H7.30 — Service Prototype Lab
- Nova perspectiva **Protótipos** no Service Workspace, elevando a leitura integrada para oito perspectivas.
- Experimentos de serviço conectam Journey, etapas, Touchpoints, Proposição e cenários “E se?” por referência, sem sobrescrever as fontes.
- Snapshot explícito torna cada experimento reproduzível mesmo quando o serviço evolui depois.
- Participantes, hipótese, objetivo, instruções, sete níveis de fidelidade, critérios de sucesso, evidências e observações.
- Resultado determinístico por critérios: Passou, Falhou ou Inconclusivo; conclusão manual continua explícita.
- Ciclo Draft → Ready → Running → Completed/Archived, com reabertura segura.
- QA H7.30: 129/129; suíte acumulada: 2868 OK / 0 FAIL.
- Typecheck React completo, build Vite e validação visual em navegador não são declarados como PASS porque `npm ci` não concluiu e o cache local não contém `zod@4.6.5`.

## V1.20.5-H7.0 — Dashboard Polish
- Dashboard lapidada como padrão visual do shell.
- Ações rápidas, Recentes, Favoritos e Aprender alinhados à referência.
- Criação rápida de Personas/Métricas integrada às páginas próprias.
- Navegação da Dashboard usa exclusivamente `rt-navigation`.
## 1.20.3 — Structured Service Frame
- Whiteboard ganha Service Frame com etapas horizontais e cinco camadas: Cliente, Frontstage, Backstage, Processos e Sistemas/Recursos.
- Adiciona Linha de Interação e Linha de Visibilidade com significado semântico.
- Drag/drop no frame atualiza `serviceStageId` e `serviceLayer` sem duplicar o Service Graph.
- Cobertura por etapa aponta gaps estruturais explicitamente.
- `Novo Service Frame` entra como caminho principal de construção; Blueprint continua como projeção formal.
- Antiga composição de 12 lanes é substituída pela matriz simplificada de 5 camadas.
- QA: `npm run qa` PASS; 44 gates contados = 1630/1630; Service Frame 71/71.
- Browser Truth: UNAVAILABLE por ausência do Chromium do Playwright; typecheck/build React completos não declarados por instalação incompleta de dependências.

## 1.20.2 — Service Context Library
- Cria Context Library com abas canônicas para Personas, Necessidades, Jobs, Dores, Hipóteses, Problemas e Evidências.
- Introduz Universal Inspector, busca, filtros funcionais e relações bidirecionais.
- Simplifica a Service Home e renomeia Dashboard para Visão geral.
- Reorganiza sidebar em Contexto, Desenho, Validação e Melhoria.
- Reorganiza + Criar por Contexto / Desenho / Melhoria e medição.
- Whiteboard passa a reutilizar objetos da Context Library e permite converter objetos livres em entidades canônicas.
- Problema validado continua exigindo promoção explícita de hipótese sustentada por evidência.
- QA: npm run qa PASS; 1575/1575 verificações explícitas; Context Library 85/85.
- Browser Truth: UNAVAILABLE por ausência do Chromium do Playwright.

## 1.20.1-H1 — WorkspaceHome Typecheck Hotfix
- Corrige 5 declarações não utilizadas detectadas por `noUnusedLocals`.
- Corrige tipagem da entidade criada em Discovery antes do acesso a `updatedAt`.
- Preserva o contrato legado `type: discoveryCreate` exigido pelo UX Truth.
- Adiciona gate `workspace-home:h1:smoke` com 9 verificações específicas.
- Sem alteração de schema, dados, layout ou regra de negócio.

## 1.20.1 — Service Definition Studio
- Fase Definir vira workspace operacional com readiness determinístico de 9 critérios.
- Definition conecta Persona, Problem e Evidence por referência canônica, sem duplicar entidades.
- Adicionados critérios de sucesso, fora do escopo e premissas.
- Entrada no Design fica bloqueada enquanto a definição estiver incompleta.
- Schema/runtime passam a validar e migrar os novos campos de definição.

## V1.20.0 — Problem & Evidence Studio

- Dor/contexto → Hipótese → Evidência → Problema validado dentro da fase Entender.
- Evidence stance por hipótese: Sustenta, Contradiz ou Contextual.
- Evidence Desk com confiança e tipo de fonte.
- Critérios determinísticos e explicáveis antes da promoção para problema validado.
- `entities.problem` canônico preserva hipótese de origem, contexto e evidências.
- Alteração após validação marca `validationNeedsReview`; revalidação atualiza sem duplicar.
- Regressão completa: 1449/1449; gate específico: 107/107; Browser Truth UNAVAILABLE por ausência do Chromium.

## V1.19.9 — Persona Studio

- Persona Studio integrado à fase Entender, sem novo módulo de sidebar.
- Modos Simples e Profissional sobre a mesma Persona canônica.
- Contexto, objetivo, situação, comportamentos, expectativas, restrições, gatilhos, alternativas e canais.
- Relações bidirecionais com Necessidades, Jobs, Dores, Hipóteses e Evidências.
- Fundação determinística da Persona e resumo de confiança das evidências.
- Remoção segura limpa vínculos e preserva os demais objetos de Discovery.
- QA completo: 1342 OK / 0 FAIL; Persona Studio 89/89.
- Browser Truth: UNAVAILABLE por ausência do Chromium do Playwright.

## V1.19.8 — Discovery Workspace

- Entender virou workspace operacional de Discovery.
- Fluxo Persona → Necessidade → Job → Dor → Hipótese → Evidência.
- Criação rápida, relações de contexto, confiança de evidência e cobertura/readiness.
- Guided Builder passa a compartilhar o readiness canônico do Discovery.
- Service Home clicável e Definition persistente preservadas/reconstruídas.
- Regressão: 1183 OK / 0 FAIL; gates novos: 19/19 + 51/51.

## V1.19.6 — Service Project Foundation

- Service Project canônico persistido em `service.project`.
- Ciclo Discovery → Definition → Design → Validation → Improvement.
- Definition foundation para promessa, outcome, escopo e limites.
- Migração transparente de projetos V3 antigos.
- Runtime/Data Bridge normaliza e valida project ownership/fase.
- Home passa a usar relatório derivado do Service Project.

## V1.19.3 — Whiteboard Interaction & Structure UX
- Zoom 10–400% com slider e fit.
- Gestão de Whiteboards: renomear, duplicar e excluir.
- Renomeação inline sincronizada com Smart Objects canônicos.
- Remover do quadro separado de Excluir do serviço.
- Entity Picker V2 com Create/Reuse, contexto, grupos e prevenção de duplicata.
- Imagens ganham Etapa relacionada e Área do serviço.
- QA: 1045 OK / 0 FAIL; Sim Kit static 32/32.

# V1.19.2 — Visual Service Builder

- BuilderSession isolada por Whiteboard com modos Criar do zero, Mapear existente e Melhorar existente.
- Construção do zero começa em 0% e deixa de herdar progresso/etapas antigas.
- Serviço, objetivo, limites, Persona, etapas e camadas passam a nascer visualmente no canvas.
- Lanes automáticas para experiência, operação, evidências, problemas, métricas e melhorias.
- Conexões visuais entre etapas e Persona → primeira etapa.
- Dashboard de construção guiada sempre inicia em novo Whiteboard vazio.
- Sim Kit atualizado para 2.2 com Fase 7 focada em BuilderSession e materialização visual.
- Regressão estática completa: 975 OK / 0 FAIL.

# V1.19.1 — Whiteboard Core Reliability

- Inspector com edição incremental e preservação de foco/cursor.
- Placement engine para novos objetos.
- Drag e pointer handlers endurecidos.
- Guard universal de atalhos sobre controles interativos.
- Acessibilidade básica de objetos e toast aria-live.
- Canvas positivo autoexpansível.
- Rascunho persistente para conflito entre abas.
- Navegação de saída do Whiteboard sem reload.
- Sincronização do primeiro Serviço antes da criação do primeiro quadro.
- Whiteboard Sim Kit atualizado para 2.1 e F6/F7 estabilizados no harness.
- Regressão estática completa: 903 OK / 0 FAIL.

## 1.18.9 — Creation Architecture Reset

- Workspace limpo passa a nascer sem Serviço/Jornada/Etapa/Blueprint/Whiteboard pré-criados.
- Fluxo real de Criar Serviço com escolha entre Quadro em branco, Construção guiada e Template.
- Whiteboards viram módulo de primeira classe; `free`, `journey` e `blueprint` passam a ter semântica explícita.
- Blueprint em branco não herda Journey nem materializa etapas automaticamente.
- Guided Builder deixa de criar Persona/Journey escondidos; normalização de Journey não inventa Persona principal.
- CSS do Dashboard é carregado em ordem válida.
- Gate `creation-reset:smoke` com 83/83 contratos; regressão V1.12 → V1.18.9 com 810 OK / 0 FAIL.

## 1.18.8 — Guided Service Builder Foundation

- Guidance Engine determinístico com assistência Guiada, Essencial e Desligada.
- Drawer universal de orientação, ajuda contextual por objeto e progresso do primeiro serviço em oito blocos.
- Guided Builder V2.0 integrado ao Whiteboard, Dashboard e shell sem criar um Service Graph paralelo.
- Gate `guidance:smoke` com 117/117 contratos; regressão V1.12 → V1.18.8 com 727 OK / 0 FAIL.

## 1.18.7 — Dashboard Parity
- Home e shell reconstruídos segundo o modelo visual de dashboard fornecido: sidebar branca compacta, header mínimo, três ações rápidas, Recentes, Favoritos e Aprender.
- Ações rápidas são funcionais; `Nova persona` grava no Service Graph canônico.
- Service Health, Attention Engine, Continue/Favorites/Pins e Service Architecture permanecem preservados em superfícies focadas.
- Gate `dashboard-parity:smoke` com 53/53 contratos; regressão V1.12 → V1.18.7 com 610 OK / 0 FAIL.
- Sem cópia de marca, código ou assets do produto usado como referência.

## 1.18.6 — Service Architecture Preview
- Engine determinístico de arquitetura estrutural sobre o Service Graph.
- Cinco camadas: Experiência, Serviço, Operação, Melhoria e Resultados.
- Cobertura estrutural, fluxo principal, inventário, gaps e Central Service Architecture na Home.
- 51/51 no gate da release; regressão histórica 557 OK / 0 FAIL.

## 1.18.5 — Continue + Favorites + Pins
- Continue passa a usar um motor determinístico próprio, combinando contexto rastreado e timestamps reais de Jornada/Blueprint/Pesquisa.
- Favoritos deixam de depender da lista de recentes e passam a ser preferência explícita por usuário/workspace.
- Pins ganham persistência, ordem deliberada e controles de reordenação independentes da recência.
- Preferências ficam separadas do Service Graph em IndexedDB, com fallback local, deduplicação e limpeza de referências excluídas.
- Aberturas de Jornada/Blueprint e alterações de favorito publicam eventos globais para manter a Home sincronizada.
- Gate `workspace-preferences:smoke` valida Continue, Favorites, Pins, persistência e integração da Home.
- Persistência endurecida com timeout de IndexedDB, seleção do estado mais novo, fila serial de eventos e updates funcionais para evitar perda de preferências.

## 1.18.4 — Attention Engine
- Regras de atenção saem da Home e viram um motor determinístico dedicado.
- Alertas passam a ter severidade, prioridade, causa, impacto, owner, prazo, status e ação recomendada.
- Próxima Melhor Ação usa o alerta de maior prioridade.
- Central de Atenção detalha todos os sinais e roteia para o workspace responsável.
- Gate `attention:smoke` com 32/32 contratos.

## 1.18.3 — Service Pulse / Health Engine
- Service Health passa a usar 7 dimensões determinísticas com pesos explícitos.
- Diagnóstico explica fórmula, pontos fortes, gaps e ação por dimensão.
- Journey Health e Blueprint Health são expostos separadamente.
- Gate `health:smoke` com 26/26 contratos.

## 1.18.2 — Home Information Architecture & DOM Ownership Recovery
- Corrige colisão de DOM entre React e runtimes legados no shell.
- Sidebar/header nativos passam a ter propriedade estrutural exclusiva do React.
- Home 3.0: Próxima Melhor Ação, Continue, Attention Queue e Service Pulse determinístico.
- Remove KPI strip genérico e quick-create duplicado da Home ativa.

## 1.18.1 — Compositor Ocean Performance
- Substitui os grupos SVG animados da entrada por uma textura WebP pré-renderizada e seamless.
- Mantém apenas uma faixa animada, com `translate3d` e velocidade linear contínua.
- Remove `alternate`, reversões e easing da onda para evitar pausas perceptivas.
- Adiciona preload da textura e gate `ocean:performance:smoke`.
- Preserva Geist Sans, login local, Service Graph e todo o restante da V1.18.0.

## 1.18.0 — Fluid Ocean & Geist Typography System
- Onda oceânica agora cobre 100% da viewport, atrás da narrativa e do login.
- Animação foi reescrita para transform/translate3d sem Gaussian blur ou morphing de path.
- Geist Sans torna-se tipografia global via Design Tokens e Tailwind.
- Escala tipográfica em px é normalizada; nenhum texto principal fica abaixo de 11 px.
- Login passa a flutuar como painel sobre o fundo, removendo o corte vertical rígido.
- Login local, recuperação e Service Graph permanecem inalterados.

## 1.17.9 — Auth Runtime Recovery & Wave Entry
- Login passa a renderizar antes da recuperação do Service Graph.
- Corrigido travamento indefinido do boot legado.
- IndexedDB e preparação do workspace recebem timeout/fallback.
- Entrada e loading ganham onda animada BLUE OCEAN.
- Novo gate de runtime/auth com 20/20 contratos.

# Changelog
## V1.17.8 — Professional Entry & Authentication Experience
- Login local-first premium, cadastro, recuperação local, loading do workspace e shell autenticado.


## V1.17.7 — TypeScript Gate Recovery
- Corrige tipagem da Home 2.0 e contratos de SmartObjectKind sem alterar UX ou dados.


## 1.17.6 — Brand & Product Polish Final
- Marca, loading, estados vazios, erro, offline e 404 convergem para a mesma identidade BLUE OCEAN.
- Ilustração SVG própria para empty states e motion consolidado em 120/180/200 ms.
- Microcopy principal pt-BR corrigida e resíduo EXECUTAR removido do Plano de Ação.
- Gate Brand & Product Polish V1.17.6 com 20/20 contratos.
- Ciclo de profissionalização visual/UX concluído; próxima fase volta às capacidades do produto.

## 1.17.5 — Responsive & Accessibility Foundation
- Breakpoints explícitos para desktop, tablet e mobile.
- Drawer + bottom navigation no celular; sidebar deixa de vazar sobre o conteúdo.
- Whiteboard mobile vira leitura + navegação + comentários, sem edição destrutiva.
- Alvos de toque de 40/44 px, foco global visível, contraste AA e reduced motion.
- Gate Responsive & Accessibility V1.17.5 com 19/19 contratos.

## 1.17.3
- Workspaces de Pesquisa, Inteligência, Benefícios, Revisão e Colaboração recebem geometria e estados unificados.
- Colaboração deixa de ser drawer e passa a workspace completo.
- Página única de Configurações centraliza densidade, backup/importação e integridade.
- Gate Unified Workspaces V1.17.3 com 18/19 contratos.

## 1.17.2
- Wizard “Montar serviço” 2.0 com stepper de 8 passos.
- Prévia ao vivo do Service Graph durante a montagem.
- Continuação automática entre passos e lacunas do Stage Flow.
- Resumo final com Readiness e atalhos para Jornada/Blueprint.
- Gate Wizard V1.17.2 com 18/19 contratos.

## 1.17.1
- Jornadas e Blueprints evoluem para bibliotecas com ordenação, filtros rápidos e seleção em lote.
- Ações em lote para favoritar, ativar e arquivar sem alterar o Service Graph.
- Templates e cards recebem previews estruturais.
- Gate Library V1.17.1 com 16/16 contratos.

## 1.17.0
- Home 2.0 com primeiro uso, Readiness e próximo passo único.
- Atenção operacional determinística, recentes unificados e favoritos.
- Personalização leve da Home e criação rápida compacta.
- Gate Home 2.0 com 18/19 contratos.

## 1.16.3
- Shell e cabeçalhos de página unificados.
- Breadcrumbs, seletor de serviço e status único de salvamento.
- Estado ativo da sidebar normalizado e agrupador MELHORAR consolidado.
- Runtimes históricos passam a receber a versão atual no pipeline.

## 1.16.2
- Design System v4 e convergência de tokens do Whiteboard.
- Facade única de ícones e biblioteca React ampliada.
- Redução controlada de `!important` e gate contra regressão visual.

# Changelog — BLUE OCEAN Service Studio

## 1.16.1 — Whiteboard Integrity & Unified UX

- Readiness único com fórmula explícita.
- Inspector Universal abre ao selecionar objetos.
- Toolbar contextual simplificada; ações secundárias migradas para `•••`.
- Diagnósticos de Jornada/Blueprint separados do progresso geral.
- Gate V1.16.1 com 14/14 contratos.


## 1.16.0 — Source Recovery & Reproducible Build

### Adicionado
- `src/` formalizado como source authority.
- versão única derivada de `package.json`.
- `dist/build-manifest.json` com fingerprints do source e lockfile.
- gate `source:authority` e smoke da fundação V1.16.0.
- pipeline CI em dois jobs: build e E2E visual.
- infraestrutura Playwright em 1440, 1024 e 390 px.
- documentação `SOURCE_AUTHORITY.md`.

### Melhorado
- build deixa de depender de nomes hash fixos no preflight Linux.
- scripts Linux passam a ler a versão do `package.json`.
- Whiteboard e badge React deixam de fixar manualmente a versão da aplicação.
- package-lock passa a acompanhar a versão da release.

### Corrigido
- divergência potencial entre versão do shell, React, Whiteboard e launcher.
- risco de publicar `dist` antigo como se fosse release nova.
- CI anterior não registrava provenance do build.

### Removido
- necessidade de editar versão em vários arquivos para cada release.
- dependência de nomes específicos como `index-B4iNVFdJ.js` no preflight.

### Limitações
- neste ambiente de execução, `registry.npmjs.org` não resolve por DNS. Por isso o `npm ci` + build React completo precisa ser confirmado no CI/Vercel ou no Linux do usuário com acesso à internet.
- baseline de screenshot pode ser gerada com `npm run e2e:visual:baseline`; o gate estrutural Playwright já está preparado.
## 1.17.4 — Whiteboard Interface Finalization
- Header do board em 48 px e breadcrumbs de workspace.
- Tool rail com grupos, atalhos e tooltips.
- Barra inferior única para zoom, minimapa, densidade e estado.
- Cards 11/14/12 com Compacta/Normal/Detalhada.
- Inspector Universal consolidado em 320 px.


## V1.19.5 — UX Truth & Service Project Entry
- Service Project Home Discovery-first no Dashboard.
- Persona, necessidade e problema/hipótese passam a existir antes do desenho do serviço.
- Montagem estruturada exige contexto mínimo, sem bloquear Whiteboard livre.
- Recipe modal removido como fluxo de runtime.
- UX Truth QA: L1 Código + L2 Contrato + L3 Runtime + L4 Visual, com browser gate que não transforma indisponibilidade em PASS.

## 1.20.4 — Service Readiness
- Readiness derivado passa a separar Contexto, Definição e Estrutura.
- 17 critérios determinísticos apontam lacunas e a próxima ação concreta.
- Score não é persistido no Service Project; é recalculado a partir do Service Graph, Definition e Service Frame.
- Composição assistida fica condicionada ao gate `Ready to Design`.
- Service Home mostra Readiness detalhado sem confundir Health ou Coverage.

## V1.20.5-H7.28 — Blueprint Semantic Zoom + Custom Layers
- Blueprint estruturado agora alterna entre Estratégico, Journey e Operacional por significado.
- Camadas personalizadas podem ser adicionadas, marcadas como obrigatórias/opcionais e configuradas por nível de zoom.
- Presets para Padrão, Saúde, Hospitalidade e SaaS.
- Blueprint Health permanece determinístico e retrocompatível com as seis lanes canônicas.

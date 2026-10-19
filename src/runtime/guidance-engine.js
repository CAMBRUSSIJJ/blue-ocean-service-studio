// BLUE OCEAN Service Studio — V1.18.8 Guided Service Builder Foundation
// Deterministic guidance catalog. It never creates or edits Service Graph data by itself.

export const ASSISTANCE_MODES = Object.freeze(['guided', 'essential', 'off']);

const topic = (key, data) => Object.freeze({ key, ...data });

export const GUIDANCE_TOPICS = Object.freeze({
  service: topic('service', {
    eyebrow: 'COMECE PELO CONTEXTO', title: 'Definir o serviço',
    summary: 'Delimite o que está sendo entregue, para quem e qual resultado o serviço precisa produzir.',
    why: 'Sem um escopo claro, Jornada, Blueprint e métricas acabam descrevendo coisas diferentes.',
    steps: ['Escreva o serviço como uma entrega, não como o nome da empresa.', 'Defina onde a experiência começa e termina.', 'Descreva o resultado que o cliente está tentando alcançar.'],
    example: '“Entrega de refeições por delivery” em vez de apenas “Restaurante”.',
    mistakes: ['Usar o nome do departamento como serviço.', 'Misturar vários serviços no mesmo escopo.', 'Descrever apenas atividades internas.'],
    checklist: ['O serviço tem um nome específico.', 'O resultado para o cliente está explícito.', 'O início e o fim podem ser reconhecidos.'],
  }),
  persona: topic('persona', {
    eyebrow: 'ENTENDA QUEM VIVE A EXPERIÊNCIA', title: 'Criar uma Persona',
    summary: 'Represente um tipo relevante de cliente em um contexto de uso específico.',
    why: 'A mesma operação pode gerar experiências muito diferentes para pessoas com objetivos e restrições diferentes.',
    steps: ['Defina quem é a pessoa no contexto do serviço.', 'Registre o que ela tenta resolver.', 'Anote o que ela valoriza e o que gera frustração.'],
    example: '“Profissional com pouco tempo, pede à noite e valoriza velocidade e previsibilidade.”',
    mistakes: ['Criar uma persona genérica demais.', 'Descrever somente idade e profissão.', 'Confundir persona com segmento comercial.'],
    checklist: ['Existe um contexto de uso.', 'Há uma necessidade principal.', 'O comportamento esperado é compreensível.'],
  }),
  stage: topic('stage', {
    eyebrow: 'ORGANIZE OS GRANDES MOMENTOS', title: 'Criar uma Etapa',
    summary: 'Uma etapa representa um momento relevante da experiência, não um clique ou tarefa minúscula.',
    why: 'Etapas boas tornam a Jornada legível e permitem conectar operação, problemas e métricas ao mesmo momento.',
    steps: ['Liste os grandes momentos da experiência.', 'Use verbos ou resultados fáceis de entender.', 'Evite granularidade excessiva no primeiro mapa.'],
    example: '“Escolher produto” é melhor que “Clicar no botão azul”.',
    mistakes: ['Criar etapas como tarefas internas.', 'Ter dezenas de etapas logo no primeiro mapa.', 'Misturar etapa com touchpoint.'],
    checklist: ['Representa uma mudança de objetivo ou contexto.', 'É compreensível sem explicação longa.', 'Pode receber ações, touchpoints e operação.'],
  }),
  customerAction: topic('customerAction', {
    eyebrow: 'EXPERIÊNCIA DO CLIENTE', title: 'Descrever a Ação do Cliente',
    summary: 'Registre o que a pessoa faz, tenta fazer ou decide em cada etapa.',
    why: 'A ação do cliente ancora a leitura da Jornada e evita começar o Blueprint pela visão interna da empresa.',
    steps: ['Escreva pela perspectiva do cliente.', 'Use verbo + objeto ou resultado.', 'Registre somente o que acontece nesta etapa.'],
    example: '“Compara opções e escolhe a forma de entrega.”',
    mistakes: ['Escrever a ação da equipe.', 'Usar frases vagas como “interage com a empresa”.', 'Misturar várias etapas em uma ação.'],
    checklist: ['Começa pela perspectiva do cliente.', 'Tem um verbo claro.', 'Pertence à etapa selecionada.'],
  }),
  touchpoint: topic('touchpoint', {
    eyebrow: 'ONDE A EXPERIÊNCIA ACONTECE', title: 'Adicionar um Touchpoint',
    summary: 'Touchpoint é o ponto em que o cliente encontra, percebe ou interage com o serviço.',
    why: 'Mapear touchpoints mostra por onde a experiência acontece e onde falhas se tornam visíveis para o cliente.',
    steps: ['Identifique o contato real da etapa.', 'Nomeie o canal ou elemento percebido.', 'Conecte o touchpoint à etapa correta.'],
    example: 'WhatsApp, site, atendente, embalagem, e-mail, aplicativo ou loja física.',
    mistakes: ['Usar um processo interno como touchpoint.', 'Criar um touchpoint sem etapa.', 'Confundir canal com objetivo da etapa.'],
    checklist: ['O cliente consegue perceber este ponto.', 'Está ligado a uma etapa.', 'O canal pode ser identificado.'],
  }),
  emotion: topic('emotion', {
    eyebrow: 'COMO A PESSOA VIVE O MOMENTO', title: 'Registrar Emoção',
    summary: 'Registre como a pessoa se sente em um momento específico, sem transformar opinião em evidência.',
    why: 'A emoção ajuda a enxergar picos e vales da experiência e priorizar onde investigar.',
    steps: ['Escolha o estado mais representativo.', 'Relacione ao contexto da etapa.', 'Busque evidência depois para validar a hipótese.'],
    example: 'Ansiedade na espera por confirmação de pagamento.',
    mistakes: ['Usar emoção como nota de qualidade.', 'Assumir emoção sem hipótese explícita.', 'Copiar a mesma emoção para todas as etapas.'],
    checklist: ['Está ligada a uma etapa.', 'O contexto da emoção está claro.', 'Pode ser validada por pesquisa ou evidência.'],
  }),
  frontstage: topic('frontstage', {
    eyebrow: 'BLUEPRINT · VISÍVEL AO CLIENTE', title: 'Mapear Frontstage',
    summary: 'Descreva o que a organização faz e o cliente consegue perceber diretamente.',
    why: 'O Frontstage conecta a experiência do cliente ao comportamento observável da operação.',
    steps: ['Pergunte o que a equipe ou sistema faz diante do cliente.', 'Descreva a resposta ou entrega visível.', 'Mantenha o item ligado à etapa.'],
    example: '“Atendente confirma o pedido e informa o prazo.”',
    mistakes: ['Colocar atividades invisíveis.', 'Descrever intenção em vez de comportamento.', 'Duplicar a ação do cliente.'],
    checklist: ['É percebido pelo cliente.', 'É uma ação do serviço.', 'Está ligado à etapa correta.'],
  }),
  backstage: topic('backstage', {
    eyebrow: 'BLUEPRINT · BASTIDORES', title: 'Mapear Backstage',
    summary: 'Registre o trabalho interno necessário para que o Frontstage aconteça.',
    why: 'O Backstage revela dependências e gargalos que o cliente não vê, mas que afetam a experiência.',
    steps: ['Parta do Frontstage.', 'Pergunte o que precisa acontecer internamente.', 'Descreva a ação concreta de bastidor.'],
    example: '“Cozinha recebe a comanda e prioriza pedidos dentro do SLA.”',
    mistakes: ['Repetir o Frontstage.', 'Descrever departamentos, não ações.', 'Misturar processo completo com uma ação de bastidor.'],
    checklist: ['Sustenta uma entrega visível.', 'É interno ao serviço.', 'Pode ter processo ou sistema associado.'],
  }),
  process: topic('process', {
    eyebrow: 'BLUEPRINT · FLUXO OPERACIONAL', title: 'Mapear Processo',
    summary: 'Defina o fluxo ou procedimento que sustenta este momento do serviço.',
    why: 'Processos conectam o desenho da experiência à forma como a organização realmente executa o serviço.',
    steps: ['Identifique o fluxo responsável pela entrega.', 'Use um nome operacional reconhecível.', 'Conecte ao Backstage e à etapa.'],
    example: 'Processar pagamento, preparar pedido, despachar entrega.',
    mistakes: ['Nomear apenas uma equipe.', 'Criar processo sem relação com a etapa.', 'Descrever tecnologia como processo.'],
    checklist: ['Existe um fluxo reconhecível.', 'Suporta a etapa.', 'Tem relação com a operação real.'],
  }),
  system: topic('system', {
    eyebrow: 'BLUEPRINT · TECNOLOGIA', title: 'Mapear Sistema',
    summary: 'Registre a ferramenta, plataforma ou tecnologia que sustenta a execução.',
    why: 'Sistemas revelam dependências tecnológicas, integrações e pontos de falha operacional.',
    steps: ['Identifique a tecnologia usada na etapa.', 'Relacione ao processo que ela suporta.', 'Evite listar ferramentas sem função clara.'],
    example: 'POS, gateway de pagamento, CRM, painel de despacho.',
    mistakes: ['Tratar um processo como sistema.', 'Listar software sem relação com a entrega.', 'Criar duplicatas para o mesmo sistema.'],
    checklist: ['É uma tecnologia real.', 'Suporta processo ou operação.', 'Está ligado à etapa.'],
  }),
  evidence: topic('evidence', {
    eyebrow: 'APRENDA COM O QUE É OBSERVADO', title: 'Adicionar Evidência',
    summary: 'Evidência registra algo observado, medido ou documentado e separa fato de hipótese.',
    why: 'Sem evidências, problemas e decisões podem refletir apenas opinião da equipe.',
    steps: ['Registre o que foi observado.', 'Informe a origem quando possível.', 'Classifique confiança e amostra conforme disponível.'],
    example: '“18% dos contatos perguntam onde está o pedido — base: 420 atendimentos.”',
    mistakes: ['Registrar solução como evidência.', 'Não indicar fonte.', 'Tratar hipótese como fato comprovado.'],
    checklist: ['É observável ou verificável.', 'Tem contexto ou fonte.', 'Pode sustentar uma conclusão.'],
  }),
  problem: topic('problem', {
    eyebrow: 'FRICÇÃO DO SERVIÇO', title: 'Definir um Problema',
    summary: 'Problema descreve uma fricção real para cliente, operação ou resultado.',
    why: 'Um problema bem formulado evita pular cedo demais para uma solução específica.',
    steps: ['Descreva o efeito indesejado.', 'Localize onde acontece.', 'Conecte evidências antes de priorizar quando possível.'],
    example: '“Cliente não recebe previsão confiável e entra em contato para perguntar pelo pedido.”',
    mistakes: ['Escrever a solução no campo do problema.', 'Ser genérico demais.', 'Culpar pessoas em vez de descrever o sistema.'],
    checklist: ['O efeito está claro.', 'Existe um contexto ou etapa.', 'Não contém solução embutida.'],
  }),
  opportunity: topic('opportunity', {
    eyebrow: 'TRANSFORME FRICÇÃO EM DIREÇÃO', title: 'Criar uma Oportunidade',
    summary: 'Oportunidade expressa uma possibilidade de melhorar valor ou desempenho sem fechar a solução cedo demais.',
    why: 'Ela cria espaço para explorar alternativas antes de comprometer recursos com uma solução.',
    steps: ['Parta de um problema ou evidência.', 'Escreva o resultado que vale perseguir.', 'Depois compare impacto, esforço e risco.'],
    example: '“Aumentar previsibilidade da entrega durante períodos de pico.”',
    mistakes: ['Nomear uma feature como oportunidade.', 'Não ligar a nenhum problema.', 'Confundir oportunidade com tarefa.'],
    checklist: ['Está ligada a uma fricção ou evidência.', 'Expressa resultado desejado.', 'Permite mais de uma solução.'],
  }),
  metric: topic('metric', {
    eyebrow: 'MEÇA SE O SERVIÇO FUNCIONA', title: 'Definir uma Métrica',
    summary: 'Métrica transforma uma expectativa em algo observável para acompanhar desempenho e resultado.',
    why: 'Sem métrica, não é possível distinguir melhoria percebida de melhoria comprovada.',
    steps: ['Defina o que será medido.', 'Informe unidade e direção desejada.', 'Associe a etapa, oportunidade ou resultado relevante.'],
    example: 'Tempo médio de entrega · minutos · menor é melhor · meta ≤ 35.',
    mistakes: ['Criar métrica sem decisão associada.', 'Misturar fórmula e objetivo.', 'Usar somente métricas de vaidade.'],
    checklist: ['É mensurável.', 'Tem unidade ou interpretação clara.', 'Ajuda uma decisão do serviço.'],
  }),
  blueprint: topic('blueprint', {
    eyebrow: 'CONECTE EXPERIÊNCIA E OPERAÇÃO', title: 'Construir o Blueprint',
    summary: 'Monte o Blueprint em camadas: cliente, Frontstage, Backstage, Processo e Sistema.',
    why: 'A sequência por camadas evita começar pela estrutura interna e perder a relação com a experiência.',
    steps: ['Comece pela ação do cliente.', 'Mapeie o Frontstage visível.', 'Descubra o Backstage necessário.', 'Conecte Processo e Sistema.'],
    example: 'Cliente paga → checkout confirma → financeiro valida → processo de pagamento → gateway.',
    mistakes: ['Começar pela tecnologia.', 'Preencher todas as lanes sem relação entre elas.', 'Confundir processo com Backstage.'],
    checklist: ['A experiência ancora a leitura.', 'As camadas operacionais se conectam.', 'Cada item pertence à etapa correta.'],
  }),
  journey: topic('journey', {
    eyebrow: 'MAPEIE A EXPERIÊNCIA', title: 'Construir a Jornada',
    summary: 'Organize a experiência por etapas e depois aprofunde ações, touchpoints, necessidades, emoções e evidências.',
    why: 'A Jornada cria uma visão comum da experiência antes de detalhar a operação.',
    steps: ['Defina a Persona.', 'Crie os grandes momentos.', 'Descreva ações do cliente.', 'Adicione touchpoints e evidências.'],
    example: 'Descobrir → Escolher → Comprar → Receber → Pós-venda.',
    mistakes: ['Mapear processos internos como etapas.', 'Começar com detalhe excessivo.', 'Criar uma Jornada sem Persona ou contexto.'],
    checklist: ['As etapas têm sequência compreensível.', 'Ações do cliente estão explícitas.', 'Os principais touchpoints aparecem.'],
  }),
});

export function normalizeAssistanceMode(value) {
  return ASSISTANCE_MODES.includes(value) ? value : 'guided';
}

export function guidanceTopic(key) {
  return GUIDANCE_TOPICS[key] || GUIDANCE_TOPICS.service;
}

export function topicForBuilderStep(stepKey) {
  return ({ service:'service', objective:'service', customer:'persona', stages:'stage', experience:'journey', operation:'blueprint', evidence:'evidence', problems:'problem', improvements:'opportunity', metrics:'metric', review:'service' })[stepKey] || 'service';
}

export function topicForObjectKind(kind) {
  return ({ persona:'persona', stage:'stage', customerAction:'customerAction', touchpoint:'touchpoint', emotion:'emotion', evidence:'evidence', problem:'problem', opportunity:'opportunity', metric:'metric', frontstage:'frontstage', backstage:'backstage', process:'process', system:'system' })[kind] || null;
}

const values = (object) => Object.values(object || {});
const entityValues = (graph, kind) => values(graph?.entities?.[kind]);
const text = (value) => String(value || '').trim();
const stageEntityCount = (graph, kind, stageId) => entityValues(graph, kind).filter((item) => item?.stageId === stageId).length;

export function buildGuidanceSnapshot(graph, options = {}) {
  const journeyId = options.activeJourneyId || graph?.service?.journeyIds?.[0];
  const journey = graph?.journeys?.[journeyId] || null;
  const stages = (journey?.stageIds || []).map((id) => graph?.stages?.[id]).filter(Boolean);
  const personas = entityValues(graph, 'persona');
  const operationKinds = ['frontstage', 'backstage', 'process', 'system'];
  const serviceDone = !!text(graph?.service?.name) && !/^Serviço principal$/i.test(text(graph?.service?.name)) && !!text(graph?.service?.description) && !/^Experiência ponta a ponta do serviço\.?$/i.test(text(graph?.service?.description));
  const customerDone = personas.some((item) => !!text(item?.title || item?.name) && !/^Cliente principal$/i.test(text(item?.title || item?.name)));
  const stagesDone = stages.length > 0;
  const experienceDone = stagesDone && stages.every((stage) => text(stage.customerAction).length > 2 && (stage.touchpointIds || []).length > 0);
  const operationDone = stagesDone && stages.every((stage) => operationKinds.every((kind) => stageEntityCount(graph, kind, stage.id) > 0));
  const problemCount = values(graph?.problems).filter((item) => stages.some((stage) => stage.id === item?.stageId)).length;
  const opportunityCount = values(graph?.opportunities).filter((item) => stages.some((stage) => stage.id === item?.stageId)).length;
  const metricCount = entityValues(graph, 'metric').filter((item) => !item?.stageId || stages.some((stage) => stage.id === item.stageId)).length;
  const reviewed = options.reviewed || {};
  const blocks = [
    { key:'service', label:'Serviço', done:serviceDone, topicKey:'service' },
    { key:'customer', label:'Cliente', done:customerDone, topicKey:'persona' },
    { key:'stages', label:'Etapas', done:stagesDone, topicKey:'stage' },
    { key:'experience', label:'Experiência', done:experienceDone, topicKey:'journey' },
    { key:'operation', label:'Operação', done:operationDone, topicKey:'blueprint' },
    { key:'problems', label:'Problemas', done:problemCount > 0 || reviewed.problems === true, topicKey:'problem' },
    { key:'improvements', label:'Melhorias', done:opportunityCount > 0 || reviewed.improvements === true, topicKey:'opportunity' },
    { key:'metrics', label:'Métricas', done:metricCount > 0 || reviewed.metrics === true, topicKey:'metric' },
  ];
  const done = blocks.filter((item) => item.done).length;
  const next = blocks.find((item) => !item.done) || null;
  return {
    version: 1,
    mode: normalizeAssistanceMode(options.mode),
    progress: Math.round((done / blocks.length) * 100),
    done,
    total: blocks.length,
    blocks,
    next,
    counts: { stages: stages.length, personas: personas.length, problems: problemCount, opportunities: opportunityCount, metrics: metricCount },
    firstService: !options.completedAt,
  };
}

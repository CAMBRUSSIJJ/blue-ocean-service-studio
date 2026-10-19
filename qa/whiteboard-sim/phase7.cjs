const L = require('./lib.cjs');

(async () => {
  const {
    assert, diagnostic, knownIssue, flush, sleep, $, $$, setPhase, save,
    makeEnv, seedService, storageSnapshot, submitForm, buttonByText
  } = L;

  setPhase('F7 · Service Builder Assistant — criação guiada dentro do Whiteboard');

  // 7.1: workspace canônico vazio continua vazio até a criação explícita do Serviço.
  const { w } = makeEnv();
  const wc = w.BlueOceanRuntime.api('whiteboardCore');
  let createRequested = false;
  w.addEventListener('bo-create-service', () => { createRequested = true; });
  const blocked = await wc.createBlank('Não deve nascer');
  assert('7.1', 'Workspace vazio bloqueia Whiteboard e solicita criação explícita do Serviço', blocked === null && createRequested);

  // A Fase 7 usa a operação canônica de domínio como fronteira de criação do Serviço.
  const service = seedService(w, 'Lavanderia Express', 'Coleta, lavagem e devolução de roupas no prazo combinado.');
  assert('7.2', 'Serviço de teste usa createServiceGraph canônico e nasce sem Jornada/Stage/Whiteboard',
    service.id !== 'workspace-uninitialized' && service.name === 'Lavanderia Express' &&
    Object.keys(service.journeys || {}).length === 0 && Object.keys(service.stages || {}).length === 0 &&
    Object.keys(service.views?.whiteboards || {}).length === 0);

  const created = await wc.createBlank('Primeiro serviço — construção guiada');
  await flush(w);
  const wb = w.__wb;
  assert('7.3', 'Whiteboard criado para o assistente começa literalmente vazio',
    !!created && wb.board().viewKind === 'free' && Object.keys(wb.board().items || {}).length === 0 && Object.keys(wb.board().edges || {}).length === 0);

  const assistant = w.BlueOceanRuntime.api('serviceBuilderAssistant');
  assert('7.4', 'Service Builder Assistant está registrado no runtime público', !!assistant && typeof assistant.start === 'function' && typeof assistant.act === 'function');
  const beforeStart = JSON.stringify({ journeys: wb.graph.journeys, stages: wb.graph.stages, entities: wb.graph.entities, items: wb.board().items });
  assistant.start();
  await flush(w);
  const afterStart = JSON.stringify({ journeys: wb.graph.journeys, stages: wb.graph.stages, entities: wb.graph.entities, items: wb.board().items });
  assert('7.5', 'Abrir o assistente não cria conteúdo escondido e primeiro pede o tipo de sessão', beforeStart === afterStart && !!$(w, '.bo1192-intent-modal'),
    `items=${Object.keys(wb.board().items || {}).length}; journeys=${Object.keys(wb.graph.journeys || {}).length}; stages=${Object.keys(wb.graph.stages || {}).length}`);
  const createFromZero = buttonByText(w, 'Criar do zero');
  if (!createFromZero) throw new Error('opção Criar do zero não encontrada');
  createFromZero.click(); await flush(w);
  assert('7.6', 'Sessão do zero abre o painel isolado e começa em 0%', !!$(w, '.bo1190-assistant-panel') && assistant.session().intent === 'create_new' && assistant.progress().percent === 0,
    `intent=${assistant.session().intent}; progress=${assistant.progress().percent}`);

  // Modos do assistente.
  for (const mode of ['understand', 'review', 'improve', 'create']) {
    assistant.setMode(mode); await flush(w);
    assert(`7.7.${mode}`, `Modo ${mode} pode ser ativado sem sair do Whiteboard`, assistant.state().mode === mode && wb.board().viewKind === 'free');
  }

  const answer = assistant.ask('Qual a diferença entre etapa e touchpoint?');
  await flush(w);
  assert('7.8', 'Pergunta metodológica recebe resposta determinística e persiste no estado do assistente',
    typeof answer === 'string' && answer.length > 30 && assistant.state().lastQuestion.includes('diferença') && assistant.state().lastAnswer.length > 30,
    answer.slice(0, 180));

  // Definição do serviço pelo Assistente.
  assistant.act('service'); await flush(w);
  assert('7.9', 'Passo Definir serviço abre formulário contextual', !!$(w, '.bo1190-assistant-modal form, .rt1811-builder-modal form'));
  await submitForm(w, {
    name: 'Lavanderia Express Premium',
    description: 'Coletar roupas, processar com rastreabilidade e devolver no prazo combinado.'
  });
  assert('7.10', 'Definição confirmada altera o Serviço, sem criar Jornada automaticamente',
    wb.graph.service.name === 'Lavanderia Express Premium' && Object.keys(wb.graph.journeys || {}).length === 0);
  assert('7.10b', 'Definir serviço materializa um card visual gerenciado pela sessão',
    Object.values(wb.board().items || {}).some(it => it.assistantSessionId === assistant.session().id && it.assistantRole === 'service'));

  assistant.act('objective'); await flush(w);
  await submitForm(w, {
    objective: 'Receber as roupas limpas e prontas sem precisar acompanhar manualmente o processo.',
    startBoundary: 'Cliente solicita a coleta.',
    endBoundary: 'Cliente recebe as roupas e confirma a entrega.'
  });
  assert('7.11', 'Objetivo, início e fim ficam persistidos no contexto do Serviço',
    wb.graph.service.designContext?.objective?.includes('roupas limpas') &&
    wb.graph.service.designContext?.startBoundary?.includes('solicita') &&
    wb.graph.service.designContext?.endBoundary?.includes('recebe'));
  assert('7.11b', 'Objetivo e limites aparecem no Whiteboard como contexto visual da sessão',
    ['objective','start','end'].every(role => Object.values(wb.board().items || {}).some(it => it.assistantSessionId === assistant.session().id && it.assistantRole === role)));

  // Persona.
  assistant.act('customer'); await flush(w);
  await submitForm(w, {
    name: 'Profissional com pouco tempo',
    description: 'Trabalha o dia inteiro, valoriza previsibilidade, coleta pontual e pouca fricção.'
  });
  const personas = Object.values(wb.graph.entities?.persona || {});
  assert('7.12', 'Persona confirmada vira entidade canônica e Smart Object no mesmo Whiteboard',
    personas.length === 1 && Object.values(wb.board().items || {}).some(it => it.kind === 'smart' && it.objectKind === 'persona' && it.objectId === personas[0].id));
  assert('7.13', 'Criar Persona ainda não cria Jornada ou Etapa escondida', Object.keys(wb.graph.journeys || {}).length === 0 && Object.keys(wb.graph.stages || {}).length === 0);

  // Jornada + etapa 1.
  assistant.act('stages'); await flush(w);
  assert('7.14', 'Primeira tentativa de criar etapa pede explicitamente a Jornada base', !!$(w, '.bo1190-assistant-modal form input[name="name"]'));
  await submitForm(w, { name: 'Coleta até devolução' });
  await sleep(80); await flush(w);
  assert('7.15', 'Após confirmar a Jornada, o Assistente abre a criação da primeira etapa', !!$(w, '.bo1190-assistant-modal form input[name="title"]'));
  await submitForm(w, { title: 'Agendar coleta', action: 'Escolhe horário e confirma endereço.' });
  await flush(w);

  // Etapa 2.
  assistant.act('stages'); await flush(w);
  await submitForm(w, { title: 'Receber roupas', action: 'Recebe, confere as peças e confirma a entrega.' });
  await flush(w);
  const journeys = Object.values(wb.graph.journeys || {});
  const stages = journeys[0] ? (journeys[0].stageIds || []).map(id => wb.graph.stages[id]).filter(Boolean) : [];
  assert('7.16', 'Jornada e duas etapas são criadas somente após confirmação explícita', journeys.length === 1 && stages.length === 2,
    `journeys=${journeys.length}; stages=${stages.map(s => s.title).join(' → ')}`);
  assert('7.17', 'As etapas aparecem no Whiteboard como Smart Objects sem converter o quadro para Journey/Blueprint',
    wb.board().viewKind === 'free' && (wb.pref().layoutMode || 'free') === 'free' &&
    stages.every(st => Object.values(wb.board().items || {}).some(it => it.kind === 'smart' && it.objectKind === 'stage' && it.objectId === st.id && it.assistantSessionId === assistant.session().id)));
  assert('7.17b', 'Etapas da sessão são organizadas horizontalmente e conectadas visualmente',
    stages.map(st => Object.values(wb.board().items || {}).find(it => it.objectKind === 'stage' && it.objectId === st.id)).every(Boolean) &&
    Object.values(wb.board().edges || {}).some(e => e.assistantSessionId === assistant.session().id && e.assistantRole === 'stage-sequence'));

  async function addFromStageFlow(rowLabel, title) {
    await flush(w);
    const rows = $$(w, '.rt1812-stageflow-row');
    const row = rows.find(r => r.querySelector('b')?.textContent.trim() === rowLabel);
    if (!row) throw new Error(`linha do stage flow não encontrada: ${rowLabel}`);
    const add = row.querySelector('button');
    add.click(); await flush(w);
    await submitForm(w, { title });
    await sleep(70); await flush(w);
  }

  // Experiência nas duas etapas: touchpoint + emoção. A ação do cliente já veio da criação da etapa.
  for (let i = 0; i < stages.length; i++) {
    assistant.act('experience'); await flush(w);
    assert(`7.18.${i+1}`, `Assistente abre Stage Flow para completar experiência da etapa ${i+1}`, !!$(w, '.rt1812-stageflow-modal'));
    await addFromStageFlow('Ponto de contato', i === 0 ? 'WhatsApp de agendamento' : 'Entrega na residência');
    // O add de touchpoint reabre Stage Flow no fluxo do assistente.
    await addFromStageFlow('Emoção', i === 0 ? 'Ansiedade leve' : 'Alívio');
    // Volta ao assistente para escolher o próximo gap.
    const back = buttonByText(w, 'Voltar ao assistente');
    if (back) { back.click(); await flush(w); }
  }
  assert('7.19', 'Experiência fica estruturada nas duas etapas sem trocar o Whiteboard para Journey',
    assistant.progress().steps.find(x => x.key === 'experience')?.done === true && wb.board().viewKind === 'free' && (wb.pref().layoutMode || 'free') === 'free');

  // Operação: o Assistant escolhe a primeira lacuna. Repetimos até completar as quatro camadas nas duas etapas.
  const operationLabels = [
    ['Ação visível', ['Confirma coleta e horário', 'Confirma entrega e orienta conferência']],
    ['Ação de bastidor', ['Valida endereço e agenda rota', 'Conclui rota e baixa a ordem']],
    ['Processo', ['Planejar coleta', 'Executar entrega']],
    ['Sistema', ['Agenda operacional', 'Painel de entregas']]
  ];
  for (let si = 0; si < stages.length; si++) {
    for (const [label, titles] of operationLabels) {
      assistant.act('operation'); await flush(w);
      const modal = $(w, '.rt1812-stageflow-modal');
      assert(`7.20.${si+1}.${label.replace(/\W+/g,'-')}`, `Stage Flow oferece ${label} para a etapa ${si+1}`, !!modal);
      const row = $$(w, '.rt1812-stageflow-row').find(r => r.querySelector('b')?.textContent.trim() === label && !r.classList.contains('done'))
        || $$(w, '.rt1812-stageflow-row').find(r => r.querySelector('b')?.textContent.trim() === label);
      if (!row) throw new Error(`linha operacional não encontrada: ${label}`);
      row.querySelector('button').click(); await flush(w);
      await submitForm(w, { title: titles[si] });
      await sleep(20); await flush(w);
    }
  }
  assert('7.21', 'Operação completa Frontstage + Backstage + Processo + Sistema nas duas etapas',
    assistant.progress().steps.find(x => x.key === 'operation')?.done === true,
    `progress=${assistant.progress().percent}%`);

  async function addOptional(step, title) {
    assistant.act(step); await flush(w);
    await submitForm(w, { title });
    await sleep(30); await flush(w);
  }
  await addOptional('evidence', '18% dos clientes perguntam quando a coleta chegará');
  await addOptional('problems', 'Cliente não recebe previsão confiável de coleta');
  await addOptional('metrics', 'Tempo entre solicitação e coleta');
  await addOptional('improvements', 'Enviar janela dinâmica e atualização automática');

  const pBeforeReview = assistant.progress();
  assert('7.22', 'Evidência, problema, métrica e melhoria entram no Service Graph pelo Assistente',
    pBeforeReview.steps.find(x => x.key === 'evidence')?.done &&
    pBeforeReview.steps.find(x => x.key === 'problems')?.done &&
    pBeforeReview.steps.find(x => x.key === 'metrics')?.done &&
    pBeforeReview.steps.find(x => x.key === 'improvements')?.done);
  assert('7.22b', 'Objetos criados pelo Assistente permanecem visuais e vinculados à mesma sessão',
    ['evidence','problem','metric','opportunity'].every(kind => Object.values(wb.board().items || {}).some(it => it.kind === 'smart' && it.objectKind === kind && it.assistantSessionId === assistant.session().id)));

  assistant.act('review'); await flush(w);
  const finish = buttonByText(w, 'Concluir primeira versão');
  assert('7.23', 'Revisão final só oferece conclusão quando os blocos anteriores estão resolvidos', !!finish,
    `pending=${assistant.progress().steps.filter(x => !x.done && x.key !== 'review').map(x => x.key).join(',')}`);
  if (finish) { finish.click(); await flush(w); }
  assert('7.24', 'Concluir primeira versão grava completedAt sem alterar viewKind do Whiteboard',
    !!assistant.state().completedAt && wb.board().viewKind === 'free');

  // Persistência entre uma instância de navegador e outra.
  const boardId = wb.boardId;
  const snapshot = storageSnapshot(w);
  const { w: w2 } = makeEnv({ storage: snapshot });
  const wc2 = w2.BlueOceanRuntime.api('whiteboardCore');
  const opened = await wc2.openBoard(boardId); await flush(w2);
  const a2 = w2.BlueOceanRuntime.api('serviceBuilderAssistant');
  assert('7.25', 'Whiteboard criado pelo Assistente reabre após nova instância de navegador', opened === true && w2.__wb.boardId === boardId);
  assert('7.26', 'Estado do Assistente persiste por Whiteboard', !!a2.state().startedAt && !!a2.state().completedAt && a2.state().serviceContext.objective.includes('roupas limpas'));
  assert('7.27', 'Service Graph persiste Persona, Jornada e duas etapas após reabrir',
    Object.keys(w2.__wb.graph.entities?.persona || {}).length === 1 && Object.keys(w2.__wb.graph.journeys || {}).length === 1 && Object.keys(w2.__wb.graph.stages || {}).length === 2);
  assert('7.28', 'Reabrir o trabalho não injeta conteúdo adicional',
    Object.keys(w2.__wb.graph.journeys || {}).length === 1 && Object.keys(w2.__wb.graph.stages || {}).length === 2,
    `items=${Object.keys(w2.__wb.board().items || {}).length}; edges=${Object.keys(w2.__wb.board().edges || {}).length}`);

  diagnostic('7.29', 'Resumo do serviço construído no Sim Kit',
    `progress=${a2.progress().percent}% · personas=${Object.keys(w2.__wb.graph.entities?.persona || {}).length} · journeys=${Object.keys(w2.__wb.graph.journeys || {}).length} · stages=${Object.keys(w2.__wb.graph.stages || {}).length} · items=${Object.keys(w2.__wb.board().items || {}).length}`);

  // Importante: não fingir que o modal React da Home foi coberto pelo jsdom do núcleo.
  knownIssue('7.30', 'Fluxo visual Home → Criar serviço ainda exige navegador real/Playwright', true,
    'A Fase 7 começa na fronteira canônica createServiceGraph(); ela valida o Service Builder no Whiteboard, não a composição React da Home.');

  save('r7'); process.exit(0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });

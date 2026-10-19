import { useState } from 'react';
import { Waves, X } from '../design-system/icons';
import { BlueOceanArtifactPreview, BlueOceanObjectIcon, BlueOceanUtilityIcon } from '../design-system/blue-ocean-objects';
import type { StudioController } from '../state/useStudioController';
import { buildServiceDepthReport, whiteboardWorkState } from '../services/service-depth';
import { buildServiceBlueprintReport } from '../services/service-blueprint-studio';
import { journeyCoverSrc } from '../services/journey-cover';

type DashboardProps = {
  studio: StudioController;
  openPersonas: () => void;
  openMetrics: () => void;
};

type RecentItem = {
  id: string;
  type: 'Journey' | 'Blueprint' | 'Whiteboard';
  name: string;
  updatedAt: string;
  meta: string;
  detail: string;
  workState: 'empty' | 'started' | 'structured';
  progressScore: number;
  coverImage?: string;
  open: () => void;
};

type SuggestedStep = {
  eyebrow: string;
  title: string;
  detail: string;
  cta: string;
  tone: 'violet' | 'blue' | 'teal' | 'amber';
  action: () => void;
};

type LearnItem = {
  title: string;
  helper: string;
  icon: React.ReactNode;
  action: () => void;
  tone: string;
  recommended?: boolean;
};

const navigate = (tab: 'journey' | 'canvas' | 'whiteboards' | 'context') => {
  window.dispatchEvent(new CustomEvent('rt-navigation', { detail: tab }));
};

const openContextPage = (page: 'personas' | 'evidence' | 'problems') => {
  window.dispatchEvent(new CustomEvent('bo-open-context-page', { detail: page }));
};

export function WorkspaceDashboardView({ studio, openPersonas, openMetrics }: DashboardProps) {
  /* H7.0 compatibility vocabulary: Recentes de / Favoritos de. H7.18 renders the cleaner branded headings. */
  const { graph, hasService } = studio;
  const [showAllRecents, setShowAllRecents] = useState(false);
  const workspaceApi = () => window.BlueOceanRuntime?.api<{ create(type: string): void }>('workspaceHome');

  const createJourney = () => {
    if (!hasService) {
      window.dispatchEvent(new CustomEvent('bo-create-service'));
      return;
    }
    const api = workspaceApi();
    if (api?.create) api.create('journey');
    else navigate('journey');
  };

  const createPersona = () => {
    if (!hasService) {
      window.dispatchEvent(new CustomEvent('bo-create-service'));
      return;
    }
    sessionStorage.setItem('bo-workspace-create-page', 'personas');
    openPersonas();
  };

  const createMetric = () => {
    if (!hasService) {
      window.dispatchEvent(new CustomEvent('bo-create-service'));
      return;
    }
    sessionStorage.setItem('bo-workspace-create-page', 'metrics');
    openMetrics();
  };

  const journeys = Object.values(graph.journeys ?? {});
  const boards = Object.values(graph.views.whiteboards ?? {});
  const blueprintBoards = boards.filter((item) => item.viewKind === 'blueprint');
  const freeBoards = boards.filter((item) => item.viewKind !== 'blueprint');

  const allRecents: RecentItem[] = [
    ...journeys.map((item): RecentItem => {
      const evidenceCount = item.stageIds.reduce((total, stageId) => total + (graph.stages[stageId]?.evidenceIds?.length ?? 0), 0);
      const problemCount = item.stageIds.reduce((total, stageId) => total + (graph.stages[stageId]?.validatedProblemIds?.length ?? 0), 0);
      return {
        id: item.id,
        type: 'Journey',
        name: item.name,
        updatedAt: item.updatedAt || item.createdAt || '',
        meta: `${item.stageIds.length} ${item.stageIds.length === 1 ? 'etapa' : 'etapas'} · ${evidenceCount} ${evidenceCount === 1 ? 'evidência' : 'evidências'}`,
        detail: `${problemCount} ${problemCount === 1 ? 'problema conectado' : 'problemas conectados'}`,
        workState: item.stageIds.length === 0 ? 'empty' : item.stageIds.length >= 2 ? 'structured' : 'started',
        progressScore: item.stageIds.length === 0 ? 0 : item.stageIds.length >= 2 ? 100 : 55,
        coverImage: item.coverImage,
        open: () => navigate('journey'),
      };
    }),
    ...boards.map((item): RecentItem => {
      const objectCount = Object.keys(item.items ?? {}).length;
      const edgeCount = Object.keys(item.edges ?? {}).length;
      const type = item.viewKind === 'blueprint' ? 'Blueprint' : 'Whiteboard';
      return {
        id: item.id,
        type,
        name: item.name || (type === 'Blueprint' ? 'Service Blueprint' : 'Whiteboard'),
        updatedAt: item.updatedAt || graph.service.updatedAt || '',
        meta: `${objectCount} ${objectCount === 1 ? 'objeto' : 'objetos'} · ${edgeCount} ${edgeCount === 1 ? 'conexão' : 'conexões'}`,
        detail: type === 'Blueprint' ? 'Operação e experiência conectadas' : 'Composição visual do serviço',
        workState: type === 'Blueprint'
          ? objectCount === 0 ? 'empty' : (buildServiceBlueprintReport(graph, item.id)?.overallScore ?? 0) >= 60 ? 'structured' : 'started'
          : whiteboardWorkState(item),
        progressScore: type === 'Blueprint'
          ? buildServiceBlueprintReport(graph, item.id)?.overallScore ?? (objectCount ? 35 : 0)
          : whiteboardWorkState(item) === 'structured' ? 100 : whiteboardWorkState(item) === 'started' ? 55 : 0,
        open: () => navigate(type === 'Blueprint' ? 'canvas' : 'whiteboards'),
      };
    }),
  ].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const recents = allRecents.slice(0, 5);

  const favorites = journeys.filter((item) => item.favorite).slice(0, 6);
  const personaCount = Object.keys(graph.entities.persona ?? {}).length;
  const evidenceCount = Object.keys(graph.entities.evidence ?? {}).length;
  const validatedProblemCount = Object.values(graph.entities.problem ?? {}).filter((item) => item.status === 'validated').length;
  const metricCount = Object.keys(graph.entities.metric ?? {}).length;
  const totalStageCount = journeys.reduce((total, item) => total + item.stageIds.length, 0);
  const meaningfulRecents = recents.filter((item) => item.workState !== 'empty');
  const primaryRecent = meaningfulRecents[0] ?? recents[0] ?? null;
  const primaryRecentHasWork = Boolean(primaryRecent && primaryRecent.workState !== 'empty');
  const primaryRecentCta = primaryRecent ? (primaryRecentHasWork ? `Continuar ${primaryRecent.type}` : `Começar ${primaryRecent.type}`) : 'Começar pelo contexto';

  const suggestedStep: SuggestedStep = (() => {
    if (personaCount === 0) return {
      eyebrow: 'CONTEXTO', title: 'Defina para quem o serviço existe', detail: 'Crie a primeira Persona antes de aprofundar a experiência e a operação.',
      cta: 'Criar Persona', tone: 'violet', action: createPersona,
    };
    if (journeys.length === 0) return {
      eyebrow: 'EXPERIÊNCIA', title: 'Transforme contexto em uma jornada', detail: 'Organize a experiência no tempo sem perder Personas, Problemas e Evidências.',
      cta: 'Criar Jornada', tone: 'blue', action: createJourney,
    };
    if (totalStageCount < 2) return {
      eyebrow: 'JOURNEY MAP', title: 'Dê estrutura suficiente à jornada', detail: 'Mapeie pelo menos duas etapas para tornar a experiência legível e preparar o Blueprint.',
      cta: 'Continuar Jornada', tone: 'blue', action: () => navigate('journey'),
    };
    if (evidenceCount === 0) return {
      eyebrow: 'EVIDÊNCIA', title: 'Conecte decisões a sinais observáveis', detail: 'Adicione evidências ao contexto para separar hipótese, opinião e aprendizado validado.',
      cta: 'Abrir Evidências', tone: 'amber', action: () => openContextPage('evidence'),
    };
    if (validatedProblemCount === 0) return {
      eyebrow: 'PROBLEMA VALIDADO', title: 'Transforme evidência em problema confiável', detail: 'Valide ao menos um problema antes de consolidar a operação do serviço.',
      cta: 'Revisar Problemas', tone: 'amber', action: () => openContextPage('problems'),
    };
    if (blueprintBoards.length === 0) return {
      eyebrow: 'SERVICE BLUEPRINT', title: 'Conecte a experiência à operação', detail: 'Leve a Journey para Frontstage, Backstage, Processos e Sistemas sem duplicar contexto.',
      cta: 'Criar Blueprint', tone: 'teal', action: () => navigate('canvas'),
    };
    if (freeBoards.length === 0) return {
      eyebrow: 'WHITEBOARD', title: 'Componha o serviço visualmente', detail: 'Use Smart Objects para aproximar contexto, Journey e Blueprint em um quadro rastreável.',
      cta: 'Abrir Whiteboards', tone: 'violet', action: () => navigate('whiteboards'),
    };
    return {
      eyebrow: 'PRÓXIMA REVISÃO', title: 'Revise o serviço a partir das evidências', detail: 'Volte ao mapa e procure etapas sem evidência, problemas críticos e momentos da verdade.',
      cta: 'Revisar Jornada', tone: 'blue', action: () => navigate('journey'),
    };
  })();

  // H7.13 compatibility markers: personaCount > 0 · totalStageCount >= 2 · blueprintBoards.length > 0 · freeBoards.length > 0.
  // H7.14 keeps maturity truth in buildServiceDepthReport; H7.15 only changes presentation density.
  const depthReport = buildServiceDepthReport(graph);
  const depthById = Object.fromEntries(depthReport.components.map((item) => [item.id, item]));
  const journeyDepth = depthById.journey?.score ?? 0;
  const blueprintDepth = depthById.blueprint?.score ?? 0;
  const compositionDepth = depthById.composition?.score ?? 0;
  const contextDepth = depthById.context?.score ?? 0;
  const serviceCurrent = [
    { key: 'context', label: 'Contexto', score: contextDepth },
    { key: 'journey', label: 'Journey', score: journeyDepth },
    { key: 'blueprint', label: 'Blueprint', score: blueprintDepth },
  ] as const;
  const whiteboardCurrent = { key: 'whiteboard', label: 'Whiteboard', score: compositionDepth } as const;
  const serviceDepth = depthReport.score;
  const flowState = serviceCurrent.map((item) => `${item.key}:${item.score}`).join('|');

  const dateLabel = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Sem data' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const baseLearn: LearnItem[] = [
    { title: 'Gestão de jornadas', helper: 'Organizar versões, status e responsáveis', icon: <BlueOceanObjectIcon kind="journey" size={19}/>, action: () => navigate('journey'), tone: 'coral' },
    { title: 'Mapeamento de jornada', helper: 'Ler a experiência etapa por etapa', icon: <BlueOceanObjectIcon kind="stage" size={19}/>, action: () => navigate('journey'), tone: 'amber' },
    { title: 'Editor de jornadas', helper: 'Aprofundar ações, emoções e evidências', icon: <BlueOceanObjectIcon kind="evidence" size={19}/>, action: () => navigate('journey'), tone: 'violet' },
    { title: 'Criar um Service Blueprint', helper: 'Conectar experiência e operação', icon: <BlueOceanObjectIcon kind="blueprint" size={19}/>, action: () => navigate('canvas'), tone: 'teal' },
    { title: 'Filtros e visualizações', helper: 'Encontrar o que exige atenção', icon: <BlueOceanUtilityIcon kind="filter" size={18}/>, action: () => window.dispatchEvent(new CustomEvent('bo-guidance-open', { detail: 'Filtros e visualizações' })), tone: 'green' },
    { title: 'Exportar e preservar dados', helper: 'Manter o projeto portátil e seguro', icon: <BlueOceanUtilityIcon kind="export" size={18}/>, action: () => window.dispatchEvent(new CustomEvent('bo-guidance-open', { detail: 'Exportar dados' })), tone: 'blue' },
  ];
  const contextualLearn: LearnItem = {
    title: suggestedStep.title,
    helper: suggestedStep.detail,
    icon: <BlueOceanObjectIcon kind="service" size={19}/>,
    action: suggestedStep.action,
    tone: suggestedStep.tone,
    recommended: true,
  };
  const learn = [contextualLearn, ...baseLearn.filter((item) => item.title !== suggestedStep.title)].slice(0, 5);

  const signalsLabel = `SINAIS DO SERVIÇO: ${personaCount} persona(s), ${validatedProblemCount} problema(s) validado(s), ${evidenceCount} evidência(s). ${depthReport.nextGap ? `Maior oportunidade de profundidade: ${depthReport.nextGap.label}.` : 'Boa profundidade estrutural.'}`;
  const serviceGuide = [
    { key: 'service', label: 'Serviço', detail: 'Escopo definido', done: hasService, action: () => window.dispatchEvent(new CustomEvent('bo-create-service')) },
    { key: 'persona', label: 'Persona', detail: 'Para quem desenhamos', done: personaCount > 0, action: createPersona },
    { key: 'journey', label: 'Journey', detail: 'Experiência no tempo', done: journeys.length > 0 && totalStageCount >= 2, action: journeys.length ? () => navigate('journey') : createJourney },
    { key: 'problem', label: 'Problemas', detail: 'Sinais validados', done: validatedProblemCount > 0, action: () => openContextPage('problems') },
    { key: 'blueprint', label: 'Blueprint', detail: 'Operação conectada', done: blueprintBoards.length > 0, action: () => navigate('canvas') },
    { key: 'metric', label: 'Métricas', detail: 'Resultado observável', done: metricCount > 0, action: createMetric },
  ];
  const serviceGuideDone = serviceGuide.filter((item) => item.done).length;

  return <section
    data-bo-workspace-home-native="1"
    data-bo-dashboard-version="7.0"
    data-brand-experience="7.12"
    data-ocean-identity="7.13"
    data-adaptive-home="7.14"
    data-ocean-home="7.15"
    data-object-language="7.16"
    data-ocean-surface="7.17"
    data-animated-ocean-branding="7.18"
    data-dashboard-composition="7.20" data-dashboard-recovery="7.20-H1"
    className="bo1207-dashboard bo1215-dashboard"
  >
    {!hasService && <section className="bo-h740h2-first-service" aria-labelledby="bo-h740h2-first-service-title">
      <div className="bo-h740h2-first-service__copy"><small>COMECE AQUI</small><h1 id="bo-h740h2-first-service-title">Crie o serviço antes de criar as peças</h1><p>O BLUE OCEAN conecta contexto, Journey, Blueprint, protótipos, decisões e resultados em uma única estrutura. Primeiro dê um nome ao serviço; depois a plataforma orienta a sequência correta.</p><div><button type="button" className="primary" onClick={() => window.dispatchEvent(new CustomEvent('bo-create-service'))}>Criar meu primeiro serviço</button><button type="button" onClick={() => studio.loadDemoService()}>Explorar um exemplo</button></div></div>
      <ol className="bo-h740h2-first-service__steps"><li><b>1</b><span><strong>Serviço</strong><small>Defina o que será desenhado.</small></span></li><li><b>2</b><span><strong>Contexto</strong><small>Personas, dores e evidências.</small></span></li><li><b>3</b><span><strong>Journey</strong><small>Organize a experiência no tempo.</small></span></li><li><b>4</b><span><strong>Blueprint</strong><small>Conecte experiência e operação.</small></span></li><li><b>5</b><span><strong>Testar</strong><small>Valide hipóteses e mudanças.</small></span></li><li><b>6</b><span><strong>Medir</strong><small>Comprove o resultado real.</small></span></li></ol>
    </section>}
    <div className="bo1215-topline">
      <div className="bo1207-dashboard-actions bo1215-dashboard-actions" aria-label="Ações rápidas">
        <button type="button" className="bo1207-action-card bo1215-action-card" data-kind="journey" onClick={createJourney}>
          <span className="bo1207-action-icon"><BlueOceanObjectIcon kind="journey" size={25}/></span>
          <span className="bo1207-action-copy"><small>MAPA</small><strong><BlueOceanUtilityIcon kind="create" size={15}/> Nova jornada</strong><em>Mapear a experiência</em></span>
        </button>
        <button type="button" className="bo1207-action-card bo1215-action-card" data-kind="persona" onClick={createPersona}>
          <span className="bo1207-action-icon"><BlueOceanObjectIcon kind="persona" size={25}/></span>
          <span className="bo1207-action-copy"><small>CONTEXTO</small><strong><BlueOceanUtilityIcon kind="create" size={15}/> Nova persona</strong><em>Entender para quem desenhamos</em></span>
        </button>
        <button type="button" className="bo1207-action-card bo1215-action-card" data-kind="metric" onClick={createMetric}>
          <span className="bo1207-action-icon"><BlueOceanObjectIcon kind="metric" size={25}/></span>
          <span className="bo1207-action-copy"><small>RESULTADO</small><strong><BlueOceanUtilityIcon kind="create" size={15}/> Nova métrica</strong><em>Medir o que realmente mudou</em></span>
        </button>
      </div>

      <button
        type="button"
        className="bo1215-depth-chip"
        data-h713-service-current="1"
        data-h714-service-depth="1"
        data-flow-state={flowState}
        data-whiteboard-score={whiteboardCurrent.score}
        aria-label={`Corrente do serviço. ${signalsLabel}`}
        title={`${signalsLabel} CONTINUE DE ONDE PAROU: ${primaryRecentCta}`}
        onClick={suggestedStep.action}
      >
        <span className="bo1215-depth-icon"><BlueOceanObjectIcon kind="service" size={18}/><span className="bo-h716-legacy-wave" aria-hidden="true"><Waves size={17}/></span></span>
        <span><small>BLUE OCEAN · {depthReport.label.toUpperCase()}</small><strong>PROFUNDIDADE {serviceDepth}%</strong></span>
        <i><b style={{ width: `${serviceDepth}%` }}/></i>
        <span className="bo1214-whiteboard-branch bo1215-compat-flow" aria-hidden="true">{whiteboardCurrent.key}:{whiteboardCurrent.score}</span>
      </button>
    </div>

    {hasService && <section className="bo-h740h4-service-guide" data-product-polish="7.40-H4" aria-label="Progresso do serviço">
      <header><div><small>MEU SERVIÇO</small><h2>{graph.service.name || 'Serviço'} <span>{serviceGuideDone}/{serviceGuide.length} fundamentos</span></h2><p>Veja o que já está estruturado e avance pelo próximo passo sem precisar descobrir sozinho onde continuar.</p></div><button type="button" className="primary" onClick={suggestedStep.action}>{suggestedStep.cta} <BlueOceanUtilityIcon kind="arrow" size={13}/></button></header>
      <div className="bo-h740h4-service-guide__steps">{serviceGuide.map((item, index) => <button key={item.key} type="button" className={item.done ? 'is-done' : ''} onClick={item.action}><b>{item.done ? '✓' : index + 1}</b><span><strong>{item.label}</strong><small>{item.detail}</small></span></button>)}</div>
      <footer><span><strong>Próxima ação:</strong> {suggestedStep.title}</span><em>{serviceDepth}% estruturado</em></footer>
    </section>}

    <section className="bo1207-dashboard-section bo1207-recents bo1214-recents bo1215-recents" data-recent-count={recents.length} data-h712-continuity="1" aria-labelledby="bo1207-recents-title">
      <header className="bo-h718-recents-header">
        <div className="bo-h718-recents-heading">
          <h2 id="bo1207-recents-title"><BlueOceanUtilityIcon kind="recent" size={18}/> Recentes</h2>
          <span className="bo-h718-service-context"><BlueOceanObjectIcon kind="service" size={13}/>{graph.service.name || 'Workspace'}</span>
        </div>
        <button type="button" aria-label="Ver todos os recentes" onClick={() => setShowAllRecents(true)}>Ver todos <BlueOceanUtilityIcon kind="arrow" size={12}/></button>
      </header>
      <div className="bo1207-recent-grid bo1215-recent-grid">
        {recents.length ? recents.map((item, index) => <button
          type="button"
          key={`${item.type}-${item.id}`}
          onClick={item.open}
          className="bo1207-recent-card bo1215-recent-card"
          data-artifact-type={item.type}
          data-work-state={item.workState}
          aria-label={index === 0 ? `${primaryRecentCta}: ${item.name}` : `${item.type}: ${item.name}`}
        >
          <div className="bo1207-recent-preview bo1215-recent-preview bo-h716-recent-preview" data-type={item.type} aria-hidden="true">
            {item.type === 'Journey' ? <div className="bo-h718h1-dashboard-journey-cover"><img src={journeyCoverSrc({ coverImage: item.coverImage })} alt=""/><span><BlueOceanObjectIcon kind="journey" size={12}/><b>JOURNEY</b></span></div> : <><b>{item.type}</b><BlueOceanArtifactPreview kind={item.type === 'Blueprint' ? 'blueprint' : 'whiteboard'} /></>}
          </div>
          <strong>{item.name}</strong>
          <small className="bo-h718-recent-kind"><BlueOceanObjectIcon kind={item.type === 'Journey' ? 'journey' : item.type === 'Blueprint' ? 'blueprint' : 'whiteboard'} size={11}/>{item.type}</small>
          <span className="bo1207-recent-meta">{item.meta}</span>
          <span className="bo1207-recent-detail bo1215-recent-detail">{item.detail}</span>
          <em>Atualizado {dateLabel(item.updatedAt)}</em>
        </button>) : <div className="bo1207-dashboard-empty bo1215-dashboard-empty"><BlueOceanObjectIcon kind="service" size={25}/><div><strong>Seu estúdio ainda está vazio</strong><p>Journeys, Blueprints e Whiteboards recentes aparecerão aqui.</p></div></div>}
      </div>
      <span className="bo1215-panel-wave" aria-hidden="true"/>
    </section>

    <section className={`bo1207-dashboard-section bo1207-favorites bo1214-favorites bo1215-favorites ${favorites.length ? 'has-favorites' : 'is-empty'}`} aria-labelledby="bo1207-favorites-title">
      <header><h2 id="bo1207-favorites-title"><BlueOceanUtilityIcon kind="favorite" size={18}/> Favoritos</h2></header>
      {favorites.length ? <div className="bo1207-favorites-grid bo1215-favorites-grid">{favorites.map((item) => <button type="button" key={item.id} onClick={() => navigate('journey')}><span className="bo1207-favorite-icon bo-h716-favorite-icon bo-h718h1-favorite-cover"><img src={journeyCoverSrc(item)} alt=""/><i><BlueOceanObjectIcon kind="journey" size={11}/></i></span><span><strong>{item.name}</strong><small>{item.stageIds.length} {item.stageIds.length === 1 ? 'etapa' : 'etapas'} · Journey</small></span><BlueOceanUtilityIcon kind="arrow" size={13}/></button>)}</div> : <p className="bo1215-favorite-empty">Você ainda não adicionou favoritos. Fixe os artefatos que mais usa para encontrá-los rapidamente.</p>}
    </section>

    <section className="bo1207-dashboard-section bo1207-learn bo1215-learn" aria-labelledby="bo1207-learn-title">
      <header><div><h2 id="bo1207-learn-title"><BlueOceanUtilityIcon kind="learn" size={18}/> Aprender</h2></div></header>
      <div className="bo1207-learn-grid bo1215-learn-grid">{learn.map((item) => <button type="button" key={item.title} onClick={item.action} data-tone={item.tone} className={item.recommended ? 'is-recommended' : ''}>
        <i>{item.icon}</i>
        <span>{item.recommended && <em>RECOMENDADO PARA VOCÊ</em>}<strong>{item.title}</strong><small>{item.helper}</small><b>{item.recommended ? suggestedStep.cta : 'Ler agora'} <BlueOceanUtilityIcon kind="arrow" size={11}/></b></span>
      </button>)}</div>
    </section>

    {showAllRecents && <div className="bo1215-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAllRecents(false); }}>
      <section className="bo1215-recents-dialog" role="dialog" aria-modal="true" aria-labelledby="bo1215-all-recents-title">
        <header><div><small>BLUE OCEAN STUDIO</small><h2 id="bo1215-all-recents-title">Todos os recentes</h2></div><button type="button" onClick={() => setShowAllRecents(false)} aria-label="Fechar"><X size={17}/></button></header>
        <div>{allRecents.length ? allRecents.map((item) => <button type="button" key={`all-${item.type}-${item.id}`} onClick={() => { setShowAllRecents(false); item.open(); }}><span className="bo1215-dialog-art bo-h716-dialog-art" data-type={item.type}>{item.type === 'Journey' ? <span className="bo-h718h1-dialog-cover"><img src={journeyCoverSrc({ coverImage: item.coverImage })} alt=""/><BlueOceanObjectIcon kind="journey" size={10}/></span> : <BlueOceanArtifactPreview compact kind={item.type === 'Blueprint' ? 'blueprint' : 'whiteboard'} />}</span><span><small className="bo-h718-recent-kind"><BlueOceanObjectIcon kind={item.type === 'Journey' ? 'journey' : item.type === 'Blueprint' ? 'blueprint' : 'whiteboard'} size={11}/>{item.type}</small><strong>{item.name}</strong><em>{item.meta} · atualizado {dateLabel(item.updatedAt)}</em></span><BlueOceanUtilityIcon kind="arrow" size={14}/></button>) : <p>Nenhum artefato recente.</p>}</div>
      </section>
    </div>}
  </section>;
}

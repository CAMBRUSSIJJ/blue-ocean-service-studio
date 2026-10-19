import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BarChart3, BookOpen, CheckCircle2, Clock3, Download,
  GraduationCap, LayoutTemplate, Map as MapIcon, Network, Pin, Search,
  Sparkles, Star, X,
} from '../design-system/icons';
import type { ActiveTab, GraphEntity, ServiceProjectPhase } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import { buildServiceHealthReport } from '../services/service-health';
import type { HealthDimensionId } from '../services/service-health';
import { buildAttentionReport } from '../services/attention-engine';
import type { AttentionActionId } from '../services/attention-engine';
import { buildServiceArchitectureReport } from '../services/service-architecture-engine';
import type { ArchitectureActionId } from '../services/service-architecture-engine';
import { buildContinueReport, resolvePreferenceReferences, workspaceReferenceKey } from '../services/continue-engine';
import type { ContinueItem, ContinueTarget } from '../services/continue-engine';
import {
  loadWorkspacePreferences, pruneWorkspacePreferences, readCachedWorkspacePreferences,
  recordRecentContext, saveWorkspacePreferences, setFavorite, setPinned,
} from '../services/workspace-preferences';
import type { WorkspacePreferences, WorkspaceReference, WorkspaceTargetType } from '../services/workspace-preferences';
import { getStoredUser } from '../auth/auth';
import { buildServiceProjectReport, setServiceProjectPhase, touchServiceProject, updateServiceProjectDefinition } from '../services/service-project';
import { buildDiscoveryWorkspaceReport, createDiscoveryEntity } from '../services/discovery-workspace';
import type { DiscoveryKind } from '../services/discovery-workspace';
import type { ContextKind } from '../services/context-library';
import { buildPersonaStudioReport, personaProfileFromEntity, personaRelationOptions, removePersonaFromGraph, updatePersonaProfile } from '../services/persona-studio';
import type { PersonaProfileDraft, PersonaRelationKind } from '../services/persona-studio';
import { buildProblemEvidenceStudioReport, evidenceDraftFromEntity, problemContextOptions, problemEvidenceOptions, problemHypothesisDraftFromEntity, updateEvidenceRecord, updateProblemHypothesis, validateProblemHypothesis } from '../services/problem-evidence-studio';
import type { EvidenceDraft, EvidenceStance, HypothesisEvidenceLink, ProblemHypothesisDraft } from '../services/problem-evidence-studio';
import { buildServiceDefinitionStudioReport, normalizeServiceDefinitionDraft, serviceDefinitionDraftFromDefinition } from '../services/service-definition';
import type { ServiceDefinitionDraft } from '../services/service-definition';
import { buildServiceReadinessReport } from '../services/service-readiness';
import type { ServiceReadinessCriterion } from '../services/service-readiness';
import { buildDesignHandoffReport, prepareBlueprintFromDefinition, prepareJourneyFromDefinition, prepareWhiteboardFromDefinition } from '../services/design-handoff';
import { JOURNEY_DEFAULT_COVER_SRC, journeyCoverSrc } from '../services/journey-cover';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';

type Props = { studio: StudioController; onImport: () => void; onExport: () => void };
type JourneyRecord = { id: string; name: string; updatedAt?: string; lastOpenedAt?: string | null; health?: number; favorite?: boolean; stageCount?: number; coverImage?: string };
type BlueprintRecord = { boardId: string; name: string; updatedAt?: string; lastOpenedAt?: string | null; coverage?: number; favorite?: boolean };
type ResearchSource = { id: string; title: string; updatedAt?: string; createdAt?: string; type?: string };
type ReadinessReport = { score: number; done: number; total: number; next?: { key: string; label: string; detail: string } | null };

const fmtRelative = (value?: string | null) => {
  if (!value) return 'sem registro recente';
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return 'sem registro recente';
  const minutes = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (minutes < 2) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'ontem' : `há ${days} dias`;
};


const fmtDate = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(parsed);
};

const targetLabel = (type: WorkspaceTargetType) => ({
  journey: 'Jornada', blueprint: 'Blueprint', whiteboard: 'Whiteboard', research: 'Pesquisa',
  opportunity: 'Oportunidade', initiative: 'Iniciativa', metric: 'Métrica',
} satisfies Record<WorkspaceTargetType, string>)[type];

function runtimeApi<T>(name: string): T | null {
  return window.BlueOceanRuntime?.api<T>(name) ?? null;
}

const listFromText = (value: string) => [...new Set(value.split('\n').map((item) => item.trim()).filter(Boolean))];

function previewVariant(target: ContinueTarget, index: number) {
  if (target.targetType === 'blueprint') return 'blueprint';
  if (target.targetType === 'research') return 'research';
  if (target.targetType === 'metric') return 'metric';
  return `journey-${(index % 3) + 1}`;
}

function PreviewArt({ target, index, journeyCoverImage }: { target: ContinueTarget; index: number; journeyCoverImage?: string }) {
  if (target.targetType === 'journey') {
    return <div className="bo-h718h1-journey-cover-preview" aria-hidden="true">
      <img src={journeyCoverImage || JOURNEY_DEFAULT_COVER_SRC} alt="" />
      <span><BlueOceanObjectIcon kind="journey" size={14}/><b>JOURNEY</b></span>
    </div>;
  }
  return (
    <div className={`bo1187-preview-art ${previewVariant(target, index)}`} aria-hidden="true">
      <i className="a" /><i className="b" /><i className="c" /><i className="d" />
    </div>
  );
}

export function WorkspaceHome({ studio, onImport, onExport }: Props) {
  const { graph, setGraph, setActiveTab, hasService, createService, loadDemoService, showToast } = studio;
  const preferenceScope = useMemo(() => ({ userId: getStoredUser()?.id ?? 'local_guest', workspaceId: graph.service.id }), [graph.service.id]);
  const [workspacePreferences, setWorkspacePreferencesState] = useState<WorkspacePreferences>(() => readCachedWorkspacePreferences(preferenceScope));
  const [showAllRecents, setShowAllRecents] = useState(false);
  const [showHealthDetails, setShowHealthDetails] = useState(false);
  const [showAttentionDetails, setShowAttentionDetails] = useState(false);
  const [showArchitectureDetails, setShowArchitectureDetails] = useState(false);
  const [showCreateService, setShowCreateService] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [discoveryCreate, setDiscoveryCreate] = useState<DiscoveryKind | null>(null);
  const [discoveryTitle, setDiscoveryTitle] = useState('');
  const [discoveryDetail, setDiscoveryDetail] = useState('');
  const [discoveryRelatedId, setDiscoveryRelatedId] = useState('');
  const [discoveryConfidence, setDiscoveryConfidence] = useState<'low' | 'medium' | 'high'>('medium');
  const [personaStudioId, setPersonaStudioId] = useState<string | null>(null);
  const [personaDraft, setPersonaDraft] = useState<PersonaProfileDraft | null>(null);
  const [personaConnectedIds, setPersonaConnectedIds] = useState<string[]>([]);
  const [personaDeleteConfirm, setPersonaDeleteConfirm] = useState(false);
  const [problemEvidenceView, setProblemEvidenceView] = useState<'problem' | 'evidence'>('problem');
  const [problemStudioId, setProblemStudioId] = useState<string | null>(null);
  const [problemDraft, setProblemDraft] = useState<ProblemHypothesisDraft | null>(null);
  const [problemContextIds, setProblemContextIds] = useState<string[]>([]);
  const [problemEvidenceLinks, setProblemEvidenceLinks] = useState<HypothesisEvidenceLink[]>([]);
  const [evidenceStudioId, setEvidenceStudioId] = useState<string | null>(null);
  const [evidenceDraft, setEvidenceDraft] = useState<EvidenceDraft | null>(null);

  const journeyModel = runtimeApi<{ model(): { records?: JourneyRecord[] } }>('journeyHome')?.model?.();
  const blueprintModel = runtimeApi<{ model(): { records?: BlueprintRecord[] } }>('blueprintHome')?.model?.();
  const researchModel = runtimeApi<{ model(): { sources?: ResearchSource[] } }>('researchWorkspace')?.model?.();
  const readiness = runtimeApi<{ readiness(): ReadinessReport }>('whiteboardUx')?.readiness?.() ?? { score: 0, done: 0, total: 8, next: null };

  const journeyRecords: JourneyRecord[] = journeyModel?.records ?? Object.values(graph.journeys).map((item): JourneyRecord => ({
    id: item.id, name: item.name, updatedAt: item.updatedAt, lastOpenedAt: item.lastOpenedAt,
    favorite: item.favorite, stageCount: item.stageIds.length, coverImage: item.coverImage,
  }));
  const blueprintRecords: BlueprintRecord[] = blueprintModel?.records ?? [];
  const researchSources: ResearchSource[] = researchModel?.sources ?? Object.values(graph.research?.sources ?? {}).map((item): ResearchSource => ({
    id: item.id, title: item.title, updatedAt: item.updatedAt, createdAt: item.createdAt, type: item.type,
  }));
  const whiteboardRecords = Object.values(graph.views?.whiteboards ?? {}).filter((item) => item.viewKind === 'free');
  const stagedProblems = Object.values(graph.problems ?? {});
  const serviceProjectReport = useMemo(() => buildServiceProjectReport(graph), [graph]);
  const serviceProject = serviceProjectReport.project;
  const discoveryWorkspace = useMemo(() => buildDiscoveryWorkspaceReport(graph), [graph]);
  const personas = discoveryWorkspace.collections.persona.items;
  const needs = discoveryWorkspace.collections.need.items;
  const discoveryProblemHypotheses = discoveryWorkspace.collections.problemHypothesis.items;
  const evidenceRecords = discoveryWorkspace.collections.evidence.items;
  const validatedProblems = Object.values(graph.entities?.problem ?? {}).filter((item) => item.status === 'validated');
  const discoveryProblemCount = discoveryProblemHypotheses.length + stagedProblems.length + validatedProblems.length;
  const evidenceCount = evidenceRecords.length + researchSources.length;
  const discoveryReady = discoveryWorkspace.minimumContextReady || serviceProjectReport.discoveryReady;
  const discoveryScore = discoveryWorkspace.score;
  const personaRelationChoices = useMemo(() => personaRelationOptions(graph), [graph]);
  const selectedPersonaEntity = personaStudioId ? graph.entities?.persona?.[personaStudioId] : undefined;
  const personaStudioReport = useMemo(() => personaStudioId ? buildPersonaStudioReport(graph, personaStudioId) : null, [graph, personaStudioId]);
  const problemContextChoices = useMemo(() => problemContextOptions(graph), [graph]);
  const problemEvidenceChoices = useMemo(() => problemEvidenceOptions(graph), [graph]);
  const selectedProblemHypothesis = problemStudioId ? graph.entities?.problemHypothesis?.[problemStudioId] : undefined;
  const problemEvidenceReport = useMemo(() => problemStudioId ? buildProblemEvidenceStudioReport(graph, problemStudioId) : null, [graph, problemStudioId]);
  const problemEvidencePreview = useMemo(() => {
    if (!problemStudioId || !problemDraft) return problemEvidenceReport;
    const preview = updateProblemHypothesis({ graph, hypothesisId: problemStudioId, draft: problemDraft, contextIds: problemContextIds, evidenceLinks: problemEvidenceLinks, now: String(selectedProblemHypothesis?.updatedAt ?? graph.service.updatedAt) });
    return buildProblemEvidenceStudioReport(preview, problemStudioId);
  }, [graph, problemStudioId, problemDraft, problemContextIds, problemEvidenceLinks, problemEvidenceReport, selectedProblemHypothesis?.updatedAt]);

  // Render-safe editor snapshots. The UI still guards on the real nullable state, but
  // field access uses typed fallbacks so strict TypeScript does not lose narrowing across
  // nested JSX callbacks.
  const activePersonaDraft: PersonaProfileDraft = personaDraft ?? personaStudioReport?.draft ?? {
    title: '', description: '', mode: 'simple', layout: 'profile-left', sections: ['identity', 'goal', 'needs', 'situation', 'quote', 'channels', 'evidence'], context: '', primaryGoal: '', situation: '', quote: '',
    behaviors: [], expectations: [], constraints: [], triggers: [], alternatives: [], channels: [],
  };
  const personaFoundationScore = personaStudioReport?.foundationScore ?? 0;
  const personaReadyForDefinition = personaStudioReport?.readyForDefinition ?? false;
  const personaProfessionalScore = personaStudioReport?.professionalScore ?? 0;
  const personaFoundationChecks = personaStudioReport?.foundationChecks ?? [];
  const personaEvidenceCount = personaStudioReport?.connectionCounts.evidence ?? 0;
  const personaEvidenceConfidence = personaStudioReport?.evidenceConfidence ?? { high: 0, medium: 0, low: 0 };

  const activeProblemDraft: ProblemHypothesisDraft = problemDraft ?? { title: '', description: '', impact: '' };
  const problemPreviewStatus = problemEvidencePreview?.status ?? 'hypothesis';
  const problemReadyToValidate = problemEvidencePreview?.readyToValidate ?? false;
  const problemValidationScore = problemEvidencePreview?.validationScore ?? 0;
  const problemValidationChecks = problemEvidencePreview?.validationChecks ?? [];
  const problemSupportCount = problemEvidencePreview?.supportCount ?? 0;
  const problemContradictionCount = problemEvidencePreview?.contradictionCount ?? 0;
  const problemNeutralCount = problemEvidencePreview?.neutralCount ?? 0;
  const problemHighConfidenceSupportCount = problemEvidencePreview?.highConfidenceSupportCount ?? 0;
  const activeValidatedProblem = problemEvidencePreview?.validatedProblem ?? null;
  const hasValidatedProblem = activeValidatedProblem !== null;
  const validatedProblemTitle = String(activeValidatedProblem?.title ?? 'Problema');
  const validatedProblemDate = String(activeValidatedProblem?.validatedAt ?? '').slice(0, 10) || 'validado';

  const activeEvidenceDraft: EvidenceDraft = evidenceDraft ?? {
    title: '', description: '', confidence: 'medium', sourceType: 'observation',
  };
  const selectedEvidenceEntity = evidenceStudioId ? graph.entities?.evidence?.[evidenceStudioId] : undefined;
  const [definitionDraft, setDefinitionDraft] = useState<ServiceDefinitionDraft>(() => serviceDefinitionDraftFromDefinition(serviceProject.definition));
  const [definitionPrinciplesText, setDefinitionPrinciplesText] = useState(() => serviceProject.definition.principles.join('\n'));
  const [definitionSuccessText, setDefinitionSuccessText] = useState(() => serviceProject.definition.successCriteria.join('\n'));
  const [definitionOutOfScopeText, setDefinitionOutOfScopeText] = useState(() => serviceProject.definition.outOfScope.join('\n'));
  const [definitionAssumptionsText, setDefinitionAssumptionsText] = useState(() => serviceProject.definition.assumptions.join('\n'));
  const definitionPreviewDraft = useMemo(() => normalizeServiceDefinitionDraft({
    ...definitionDraft,
    principles: listFromText(definitionPrinciplesText),
    successCriteria: listFromText(definitionSuccessText),
    outOfScope: listFromText(definitionOutOfScopeText),
    assumptions: listFromText(definitionAssumptionsText),
  }), [definitionDraft, definitionPrinciplesText, definitionSuccessText, definitionOutOfScopeText, definitionAssumptionsText]);
  const definitionStudioReport = useMemo(() => buildServiceDefinitionStudioReport(graph, definitionPreviewDraft), [graph, definitionPreviewDraft]);
  const serviceReadinessReport = useMemo(() => buildServiceReadinessReport(graph), [graph]);
  const designHandoffReport = useMemo(() => buildDesignHandoffReport(graph), [graph]);

  useEffect(() => {
    const next = serviceDefinitionDraftFromDefinition(serviceProject.definition);
    setDefinitionDraft(next);
    setDefinitionPrinciplesText(next.principles.join('\n'));
    setDefinitionSuccessText(next.successCriteria.join('\n'));
    setDefinitionOutOfScopeText(next.outOfScope.join('\n'));
    setDefinitionAssumptionsText(next.assumptions.join('\n'));
  }, [serviceProject.id, serviceProject.updatedAt]);

  useEffect(() => {
    if (!personas.length) { if (personaStudioId) setPersonaStudioId(null); return; }
    if (!personaStudioId || !personas.some((item) => item.id === personaStudioId)) setPersonaStudioId(personas[0].id);
  }, [personas, personaStudioId]);

  useEffect(() => {
    if (!selectedPersonaEntity || !personaStudioReport) { setPersonaDraft(null); setPersonaConnectedIds([]); return; }
    setPersonaDraft(personaProfileFromEntity(selectedPersonaEntity));
    setPersonaConnectedIds(personaStudioReport.connections.map((item) => item.id));
  }, [personaStudioId, selectedPersonaEntity?.updatedAt]);

  useEffect(() => {
    if (!discoveryProblemHypotheses.length) { if (problemStudioId) setProblemStudioId(null); return; }
    if (!problemStudioId || !discoveryProblemHypotheses.some((item) => item.id === problemStudioId)) setProblemStudioId(discoveryProblemHypotheses[0].id);
  }, [discoveryProblemHypotheses, problemStudioId]);

  useEffect(() => {
    if (!selectedProblemHypothesis || !problemEvidenceReport) { setProblemDraft(null); setProblemContextIds([]); setProblemEvidenceLinks([]); return; }
    setProblemDraft(problemHypothesisDraftFromEntity(selectedProblemHypothesis));
    setProblemContextIds(problemEvidenceReport.contextConnections.map((item) => item.id));
    setProblemEvidenceLinks(problemEvidenceReport.evidenceConnections.map((item) => ({ evidenceId: item.id, stance: item.stance })));
  }, [problemStudioId, selectedProblemHypothesis?.updatedAt]);

  useEffect(() => {
    if (!evidenceRecords.length) { if (evidenceStudioId) setEvidenceStudioId(null); return; }
    if (!evidenceStudioId || !evidenceRecords.some((item) => item.id === evidenceStudioId)) setEvidenceStudioId(evidenceRecords[0].id);
  }, [evidenceRecords, evidenceStudioId]);

  useEffect(() => {
    if (!selectedEvidenceEntity) { setEvidenceDraft(null); return; }
    setEvidenceDraft(evidenceDraftFromEntity(selectedEvidenceEntity));
  }, [evidenceStudioId, selectedEvidenceEntity?.updatedAt]);

  const discoveryCopy: Record<DiscoveryKind, { eyebrow: string; title: string; detail: string; placeholder: string; helper: string }> = {
    persona: { eyebrow: 'CLIENTE', title: 'Adicionar Persona', detail: 'Registre quem vive a experiência antes de desenhar a Jornada.', placeholder: 'Ex.: Profissional que mora em apartamento', helper: 'Quem é essa pessoa e em qual contexto ela vive este serviço?' },
    need: { eyebrow: 'NECESSIDADE', title: 'Adicionar necessidade', detail: 'Capture o que precisa ser resolvido sem antecipar a solução.', placeholder: 'Ex.: Resolver a lavagem de roupas sem perder tempo', helper: 'Descreva a necessidade do ponto de vista do cliente.' },
    job: { eyebrow: 'JOB TO BE DONE', title: 'Adicionar Job', detail: 'Registre o progresso que a pessoa tenta realizar em determinada situação.', placeholder: 'Ex.: Ter roupas prontas para a semana', helper: 'Use verbo + contexto + resultado desejado.' },
    pain: { eyebrow: 'DOR / FRICÇÃO', title: 'Adicionar dor', detail: 'Capture o que dificulta o progresso hoje, antes de transformar isso em solução.', placeholder: 'Ex.: Deslocamento até a lavanderia consome tempo', helper: 'Descreva a fricção observável e seu contexto.' },
    problemHypothesis: { eyebrow: 'HIPÓTESE', title: 'Adicionar hipótese', detail: 'Registre uma explicação provisória que precisa de evidência para ser validada.', placeholder: 'Ex.: A principal fricção é o deslocamento', helper: 'Escreva como hipótese, não como fato confirmado.' },
    evidence: { eyebrow: 'EVIDÊNCIA', title: 'Adicionar evidência', detail: 'Registre um sinal que sustenta ou contradiz o entendimento atual.', placeholder: 'Ex.: 7 de 10 entrevistados citam falta de tempo', helper: 'Informe o que foi observado e, se possível, relacione com a hipótese ou dor.' },
  };
  const discoveryLabel: Record<DiscoveryKind, string> = { persona: 'Persona', need: 'Necessidade', job: 'Job', pain: 'Dor', problemHypothesis: 'Hipótese', evidence: 'Evidência' };
  const discoveryRelations = (['persona', 'need', 'job', 'pain', 'problemHypothesis', 'evidence'] as DiscoveryKind[])
    .flatMap((kind) => discoveryWorkspace.collections[kind].items.map((item) => ({ id: item.id, kind, title: String(item.title ?? item.name ?? 'Sem título') })))
    .filter((item) => item.kind !== discoveryCreate);
  const openDiscoveryCreate = (kind: DiscoveryKind) => { setDiscoveryCreate(kind); setDiscoveryTitle(''); setDiscoveryDetail(''); setDiscoveryRelatedId(''); setDiscoveryConfidence('medium'); };
  const discoveryQuickActions: Array<{ kind: DiscoveryKind; action: () => void }> = [
    { kind: 'persona', action: () => openDiscoveryCreate('persona') },
    { kind: 'need', action: () => openDiscoveryCreate('need') },
    { kind: 'job', action: () => openDiscoveryCreate('job') },
    { kind: 'pain', action: () => openDiscoveryCreate('pain') },
    { kind: 'problemHypothesis', action: () => openDiscoveryCreate('problemHypothesis') },
    { kind: 'evidence', action: () => openDiscoveryCreate('evidence') },
  ];
  const submitDiscoveryCreate = () => {
    if (!discoveryCreate || !discoveryTitle.trim()) return;
    const createdKind = discoveryCreate;
    let createdId = '';
    setGraph((current) => {
      const entity: GraphEntity = { ...createDiscoveryEntity({ graph: current, kind: createdKind, title: discoveryTitle, description: discoveryDetail, relatedIds: discoveryRelatedId ? [discoveryRelatedId] : [], confidence: discoveryConfidence }), type: discoveryCreate };
      createdId = entity.id;
      const entities = structuredClone(current.entities ?? {});
      entities[createdKind] ||= {};
      entities[createdKind][entity.id] = entity;
      return touchServiceProject({ ...current, entities, service: { ...current.service, updatedAt: String(entity.updatedAt) } }, { currentPhase: 'discovery' });
    }, `Discovery: ${createdKind}`);
    showToast(`${discoveryLabel[createdKind]} adicionada ao Discovery Workspace.`);
    if (createdKind === 'persona' && createdId) setPersonaStudioId(createdId);
    setDiscoveryCreate(null); setDiscoveryTitle(''); setDiscoveryDetail(''); setDiscoveryRelatedId('');
  };

  const savePersonaStudio = () => {
    if (!personaStudioId || !personaDraft || !personaDraft.title.trim()) return;
    setGraph((current) => touchServiceProject(updatePersonaProfile({ graph: current, personaId: personaStudioId, draft: personaDraft, connectedIds: personaConnectedIds }), { currentPhase: 'discovery' }), 'Persona Studio');
    showToast('Persona atualizada no Service Graph.');
  };
  const discardPersonaStudio = () => {
    if (!selectedPersonaEntity || !personaStudioReport) return;
    setPersonaDraft(personaProfileFromEntity(selectedPersonaEntity));
    setPersonaConnectedIds(personaStudioReport.connections.map((item) => item.id));
  };
  const togglePersonaRelation = (id: string) => setPersonaConnectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const updatePersonaList = (field: 'behaviors' | 'expectations' | 'constraints' | 'triggers' | 'alternatives' | 'channels', value: string) => setPersonaDraft((current) => current ? { ...current, [field]: [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))] } : current);
  const deletePersonaStudio = () => {
    if (!personaStudioId || !selectedPersonaEntity) return;
    const removedId = personaStudioId;
    setGraph((current) => touchServiceProject(removePersonaFromGraph(current, removedId), { currentPhase: 'discovery' }), 'Remover Persona');
    setPersonaDeleteConfirm(false); setPersonaStudioId(null); setPersonaDraft(null); setPersonaConnectedIds([]);
    showToast('Persona removida. Necessidades, Jobs, dores, hipóteses e evidências foram preservados.');
  };

  const toggleProblemContext = (id: string) => setProblemContextIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const setProblemEvidenceStance = (evidenceId: string, stance: EvidenceStance | null) => setProblemEvidenceLinks((current) => {
    const without = current.filter((item) => item.evidenceId !== evidenceId);
    return stance ? [...without, { evidenceId, stance }] : without;
  });
  const saveProblemHypothesis = () => {
    if (!problemStudioId || !problemDraft || !problemDraft.title.trim()) return;
    setGraph((current) => touchServiceProject(updateProblemHypothesis({ graph: current, hypothesisId: problemStudioId, draft: problemDraft, contextIds: problemContextIds, evidenceLinks: problemEvidenceLinks }), { currentPhase: 'discovery' }), 'Problem & Evidence Studio');
    showToast('Hipótese e relações salvas no Service Graph.');
  };
  const discardProblemHypothesis = () => {
    if (!selectedProblemHypothesis || !problemEvidenceReport) return;
    setProblemDraft(problemHypothesisDraftFromEntity(selectedProblemHypothesis));
    setProblemContextIds(problemEvidenceReport.contextConnections.map((item) => item.id));
    setProblemEvidenceLinks(problemEvidenceReport.evidenceConnections.map((item) => ({ evidenceId: item.id, stance: item.stance })));
  };
  const validateCurrentProblem = () => {
    if (!problemStudioId || !problemDraft) return;
    setGraph((current) => {
      const saved = updateProblemHypothesis({ graph: current, hypothesisId: problemStudioId, draft: problemDraft, contextIds: problemContextIds, evidenceLinks: problemEvidenceLinks });
      return touchServiceProject(validateProblemHypothesis(saved, problemStudioId), { currentPhase: 'discovery' });
    }, 'Validar problema');
    showToast('Hipótese promovida a problema validado com rastreabilidade de evidências.');
  };
  const saveEvidenceStudio = () => {
    if (!evidenceStudioId || !evidenceDraft || !evidenceDraft.title.trim()) return;
    setGraph((current) => touchServiceProject(updateEvidenceRecord({ graph: current, evidenceId: evidenceStudioId, draft: evidenceDraft }), { currentPhase: 'discovery' }), 'Evidence Studio');
    showToast('Evidência atualizada no Service Graph.');
  };
  const discardEvidenceStudio = () => {
    if (!selectedEvidenceEntity) return;
    setEvidenceDraft(evidenceDraftFromEntity(selectedEvidenceEntity));
  };
  const changeProjectPhase = (phase: ServiceProjectPhase) => setGraph((current) => setServiceProjectPhase(current, phase), `Service Project: ${phase}`);
  const startDesign = () => {
    if (!definitionStudioReport.readyToDesign) { showToast(`Definição ainda incompleta: ${definitionStudioReport.completed}/${definitionStudioReport.total} critérios.`); return; }
    setGraph((current) => setServiceProjectPhase(current, 'design'), 'Service Project: iniciar desenho');
  };
  const toggleDefinitionConnection = (kind: 'persona' | 'problem' | 'evidence', id: string) => setDefinitionDraft((current) => {
    const key = kind === 'persona' ? 'personaIds' : kind === 'problem' ? 'problemIds' : 'evidenceIds';
    const values = current[key];
    return { ...current, [key]: values.includes(id) ? values.filter((item) => item !== id) : [...values, id] };
  });
  const saveDefinition = () => {
    const next = normalizeServiceDefinitionDraft(definitionPreviewDraft);
    setGraph((current) => updateServiceProjectDefinition(current, next), 'Service Project: salvar definição');
    setDefinitionDraft(next);
    showToast(definitionStudioReport.readyToDesign ? 'Definição salva e pronta para orientar o desenho.' : 'Definição salva como rascunho. Complete os critérios antes de iniciar o desenho.');
  };
  const discardDefinition = () => {
    const next = serviceDefinitionDraftFromDefinition(serviceProject.definition);
    setDefinitionDraft(next);
    setDefinitionPrinciplesText(next.principles.join('\n'));
    setDefinitionSuccessText(next.successCriteria.join('\n'));
    setDefinitionOutOfScopeText(next.outOfScope.join('\n'));
    setDefinitionAssumptionsText(next.assumptions.join('\n'));
  };

  const openJourney = async (id: string) => {
    const api = runtimeApi<{ open(id: string): Promise<boolean> | boolean }>('journeyHome');
    if (api?.open) await api.open(id); else setActiveTab('journey');
  };
  const openBlueprint = async (id: string) => {
    const api = runtimeApi<{ open(id: string): Promise<boolean> | boolean }>('blueprintHome');
    if (api?.open) await api.open(id); else setActiveTab('canvas');
  };
  const openWhiteboard = async (id: string) => {
    const api = runtimeApi<{ openBoard(id: string): Promise<boolean> | boolean }>('whiteboardCore');
    if (api?.openBoard) await api.openBoard(id); else setActiveTab('whiteboards');
  };
  const openResearch = () => runtimeApi<{ show(): void }>('researchWorkspace')?.show?.();
  const openIntelligence = () => runtimeApi<{ show(): void }>('serviceIntelligence')?.show?.();
  const openSimulation = () => runtimeApi<{ show(): void }>('practicalSimulation')?.show?.();
  const openBenefits = () => runtimeApi<{ show(): void }>('benefitsRealization')?.show?.();
  const openReview = () => runtimeApi<{ show(): void }>('operatingReview')?.show?.();
  const openCollaboration = () => runtimeApi<{ show(tab?: string): void }>('collaboration')?.show?.('comments');
  const prepareJourneyWithContext = () => {
    const prepared = prepareJourneyFromDefinition(graph);
    if (!prepared.journeyId) { showToast('Feche a Service Definition e conecte Persona, Problema e Evidência antes de preparar a Journey.'); return; }
    setGraph(() => prepared.graph, 'H7.8: preparar Journey com contexto');
    setActiveTab('journey');
    showToast('Journey preparada com referências canônicas da Service Definition.');
  };
  const prepareWhiteboardWithContext = () => {
    const prepared = prepareWhiteboardFromDefinition(graph);
    if (!prepared.boardId) { showToast('O contexto ainda não está pronto para ser levado ao Whiteboard.'); return; }
    setGraph(() => prepared.graph, 'H7.8: preparar Whiteboard com contexto');
    setActiveTab('whiteboards');
    showToast('Whiteboard de contexto criado sem duplicar Persona, Problema ou Evidência.');
  };
  const prepareBlueprintWithContext = () => {
    const prepared = prepareBlueprintFromDefinition(graph);
    if (!prepared.boardId) { showToast('Feche a Service Definition antes de preparar o Blueprint.'); return; }
    setGraph(() => prepared.graph, 'H7.8: preparar Blueprint com contexto');
    setActiveTab('canvas');
    showToast(prepared.graph.journeys[prepared.journeyId ?? '']?.stageIds.length
      ? 'Blueprint preparado e ligado à Journey + contexto da Definition.'
      : 'Blueprint preparado. Defina as etapas da Journey para estruturar Frontstage e Backstage.');
  };

  const openGuidedBuilder = async () => {
    const assistant = runtimeApi<{ startFromDefinition?(): boolean; start?(): boolean; open?(): boolean }>('serviceBuilderAssistant');
    const core = runtimeApi<{ createBlank?(name?: string): Promise<{ id: string; name: string } | null> | { id: string; name: string } | null; openBoard?(id: string): Promise<boolean> | boolean }>('whiteboardCore');
    if (core?.createBlank) {
      const created = await core.createBlank(`${graph.service.name || 'Serviço'} · construção`);
      if (!created) return;
    }
    if (assistant?.startFromDefinition && designHandoffReport.readyForJourney) assistant.startFromDefinition();
    else if (assistant?.start) assistant.start();
    else if (assistant?.open) assistant.open();
    else runtimeApi<{ open(): void }>('guidedBuilder')?.open?.();
  };
  const go = (tab: ActiveTab) => setActiveTab(tab);
  const openContext = (kind?: ContextKind) => {
    if (kind) sessionStorage.setItem('bo-context-kind', kind);
    setActiveTab('context');
  };
  const resolveReadinessGap = (criterion: ServiceReadinessCriterion | null) => {
    if (!criterion) return;
    const action = criterion.action;
    if (action.target === 'context') { openContext(action.contextKind as ContextKind | undefined); return; }
    if (action.target === 'definition') { changeProjectPhase('definition'); return; }
    if (action.boardId) { void openWhiteboard(action.boardId); return; }
    go('whiteboards');
  };
  const openNextStep = () => {
    const guided = runtimeApi<{ act(key: string): void; open(): void }>('guidedBuilder');
    if (readiness.next?.key && guided?.act) guided.act(readiness.next.key); else guided?.open?.();
  };

  const workspaceTargets: ContinueTarget[] = [
    ...journeyRecords.map((item) => ({
      targetId: item.id, targetType: 'journey' as const, title: item.name,
      subtitle: `${item.health ?? item.stageCount ?? 0}${item.health != null ? '% de completude' : ' etapas'}`,
      updatedAt: item.updatedAt, lastOpenedAt: item.lastOpenedAt, lastEditedAt: item.updatedAt, progress: item.health,
      destination: 'journey', context: { serviceId: graph.service.id, journeyId: item.id },
    })),
    ...blueprintRecords.map((item) => ({
      targetId: item.boardId, targetType: 'blueprint' as const, title: item.name,
      subtitle: item.coverage != null ? `${item.coverage}% de cobertura` : 'Blueprint',
      updatedAt: item.updatedAt, lastOpenedAt: item.lastOpenedAt, lastEditedAt: item.updatedAt, progress: item.coverage,
      destination: 'canvas', context: { serviceId: graph.service.id },
    })),
    ...whiteboardRecords.map((item) => ({
      targetId: item.id, targetType: 'whiteboard' as const, title: item.name,
      subtitle: `${Object.keys(item.items ?? {}).length} objetos · ${Object.keys(item.edges ?? {}).length} conexões`,
      updatedAt: graph.service.updatedAt, lastEditedAt: graph.service.updatedAt,
      destination: 'whiteboards', context: { serviceId: graph.service.id },
    })),
    ...researchSources.map((item) => ({
      targetId: item.id, targetType: 'research' as const, title: item.title, subtitle: item.type || 'Pesquisa',
      updatedAt: item.updatedAt || item.createdAt, lastEditedAt: item.updatedAt || item.createdAt,
      destination: 'research', context: { serviceId: graph.service.id },
    })),
  ];

  useEffect(() => {
    let mounted = true;
    void loadWorkspacePreferences(preferenceScope).then((loaded) => {
      let next = loaded;
      for (const item of journeyRecords.filter((record) => record.favorite)) {
        if (!next.favorites.some((ref) => ref.targetType === 'journey' && ref.targetId === item.id)) {
          next = setFavorite(next, { targetType: 'journey', targetId: item.id, title: item.name, context: { serviceId: graph.service.id, journeyId: item.id } }, true);
        }
      }
      for (const item of blueprintRecords.filter((record) => record.favorite)) {
        if (!next.favorites.some((ref) => ref.targetType === 'blueprint' && ref.targetId === item.boardId)) {
          next = setFavorite(next, { targetType: 'blueprint', targetId: item.boardId, title: item.name, context: { serviceId: graph.service.id } }, true);
        }
      }
      const existingKeys = new Set(workspaceTargets.map((target) => workspaceReferenceKey(target.targetType, target.targetId)));
      next = pruneWorkspacePreferences(next, existingKeys);
      if (!mounted) return;
      setWorkspacePreferencesState((current) => {
        const currentAt = Date.parse(current.updatedAt);
        const loadedAt = Date.parse(next.updatedAt);
        const resolved = Number.isFinite(currentAt) && (!Number.isFinite(loadedAt) || currentAt > loadedAt) ? current : next;
        void saveWorkspacePreferences(resolved);
        return resolved;
      });
    });
    return () => { mounted = false; };
  // Graph revision intentionally rehydrates legacy favorite flags and prunes deleted references.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferenceScope.userId, preferenceScope.workspaceId, graph.persistenceRevision]);

  useEffect(() => {
    const attention = () => setShowAttentionDetails(true);
    const architecture = () => setShowArchitectureDetails(true);
    const health = () => setShowHealthDetails(true);
    const createServiceRequest = () => setShowCreateService(true);
    window.addEventListener('bo-dashboard-attention', attention);
    window.addEventListener('bo-dashboard-architecture', architecture);
    window.addEventListener('bo-dashboard-health', health);
    window.addEventListener('bo-create-service', createServiceRequest);
    return () => {
      window.removeEventListener('bo-dashboard-attention', attention);
      window.removeEventListener('bo-dashboard-architecture', architecture);
      window.removeEventListener('bo-dashboard-health', health);
      window.removeEventListener('bo-create-service', createServiceRequest);
    };
  }, []);

  const continueReport = buildContinueReport(workspaceTargets, workspacePreferences, 50);
  const continueItem = continueReport.top;
  const favoriteItems = resolvePreferenceReferences(workspacePreferences.favorites, workspaceTargets).slice(0, 8);
  const pinnedItems = resolvePreferenceReferences([...workspacePreferences.pins].sort((a, b) => a.order - b.order), workspaceTargets);
  const fallbackTargets = [...workspaceTargets].sort((a, b) => Date.parse(b.updatedAt || b.lastOpenedAt || '') - Date.parse(a.updatedAt || a.lastOpenedAt || ''));
  const recentItems: ContinueTarget[] = [];
  const seenRecent = new Set<string>();
  for (const item of [...continueReport.items, ...fallbackTargets]) {
    const key = workspaceReferenceKey(item.targetType, item.targetId);
    if (seenRecent.has(key)) continue;
    seenRecent.add(key);
    recentItems.push(item);
  }

  const healthReport = useMemo(() => buildServiceHealthReport(graph), [graph]);
  const attentionReport = useMemo(() => buildAttentionReport(graph), [graph]);
  const architectureReport = useMemo(() => buildServiceArchitectureReport(graph), [graph]);

  const submitService = () => {
    if (!serviceName.trim()) return;
    const created = createService(serviceName, serviceDescription);
    if (!created) return;
    setShowCreateService(false);
    setServiceName('');
    setServiceDescription('');
  };

  if (!hasService) {
    return (
      <section className="bo1189-empty-home" data-creation-reset="1" data-workspace-empty="1">
        <div className="bo1189-empty-home__hero">
          <span className="bo1189-kicker">BLUE OCEAN · SERVICE CREATION</span>
          <h1>Crie seu primeiro serviço</h1>
          <p>Seu workspace está vazio. Crie o projeto do serviço e comece entendendo cliente, necessidade e problema antes de desenhar a solução.</p>
          <div className="bo1189-empty-home__actions">
            <button type="button" className="primary" onClick={() => setShowCreateService(true)}>+ Criar serviço</button>
            <button type="button" onClick={onImport}>Importar serviço</button>
            <button type="button" onClick={() => loadDemoService()}>Explorar serviço de exemplo</button>
          </div>
        </div>
        <div className="bo1189-empty-home__principles" aria-label="Como começar">
          <article><strong>1. Serviço</strong><span>Defina o que será desenhado e dirigido.</span></article>
          <article><strong>2. Começo livre</strong><span>Abra um Whiteboard 100% vazio quando quiser pensar sem estrutura.</span></article>
          <article><strong>3. Estruture depois</strong><span>Journey e Blueprint só aparecem quando você decidir criá-los.</span></article>
        </div>
        {showCreateService && <div className="bo1189-service-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreateService(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="bo1189-create-service-title">
            <header><div><span>NOVO SERVIÇO</span><h2 id="bo1189-create-service-title">O que vamos construir?</h2><p>Nada além do projeto do serviço será criado. O próximo passo é entender cliente, necessidade e problema.</p></div><button type="button" onClick={() => setShowCreateService(false)} aria-label="Fechar"><X size={18} /></button></header>
            <label><span>Nome do serviço</span><input autoFocus value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Ex.: Lavanderia Express" /></label>
            <label><span>Descrição <small>opcional</small></span><textarea value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} placeholder="O que este serviço entrega e para quem?" rows={4} /></label>
            <footer><button type="button" onClick={() => setShowCreateService(false)}>Cancelar</button><button type="button" className="primary" disabled={!serviceName.trim()} onClick={submitService}>Criar serviço</button></footer>
          </section>
        </div>}
      </section>
    );
  }

  const referenceFor = (target: ContinueTarget): WorkspaceReference => ({
    targetId: target.targetId, targetType: target.targetType, title: target.title, subtitle: target.subtitle,
    destination: target.destination, context: target.context,
  });
  const updatePreferences = (mutate: (current: WorkspacePreferences) => WorkspacePreferences) => {
    setWorkspacePreferencesState((current) => {
      const next = mutate(current);
      void saveWorkspacePreferences(next);
      return next;
    });
  };
  const isFavorite = (target: ContinueTarget) => workspacePreferences.favorites.some((item) => item.targetType === target.targetType && item.targetId === target.targetId);
  const isPinned = (target: ContinueTarget) => workspacePreferences.pins.some((item) => item.targetType === target.targetType && item.targetId === target.targetId);
  const toggleFavoriteTarget = (target: ContinueTarget) => updatePreferences((current) => {
    const enabled = !current.favorites.some((item) => item.targetType === target.targetType && item.targetId === target.targetId);
    return setFavorite(current, referenceFor(target), enabled);
  });
  const togglePinnedTarget = (target: ContinueTarget) => updatePreferences((current) => {
    const enabled = !current.pins.some((item) => item.targetType === target.targetType && item.targetId === target.targetId);
    return setPinned(current, referenceFor(target), enabled);
  });
  const openTarget = (target: ContinueTarget) => {
    updatePreferences((current) => recordRecentContext(current, referenceFor(target), 'opened'));
    if (target.targetType === 'journey') void openJourney(target.targetId);
    else if (target.targetType === 'blueprint') void openBlueprint(target.targetId);
    else if (target.targetType === 'research') openResearch();
    else if (target.targetType === 'whiteboard') void openWhiteboard(target.targetId);
    else if (target.targetType === 'opportunity' || target.targetType === 'metric') openIntelligence();
    else go('action');
  };

  const recentTimestamp = (target: ContinueTarget) => {
    const item = continueReport.items.find((candidate) => candidate.targetId === target.targetId && candidate.targetType === target.targetType) as ContinueItem | undefined;
    return item?.activityAt || target.lastOpenedAt || target.lastEditedAt || target.updatedAt;
  };

  const actOnHealthDimension = (id: HealthDimensionId) => {
    setShowHealthDetails(false);
    const actions: Record<HealthDimensionId, () => void> = {
      structure: openNextStep, evidence: openResearch, governance: openReview,
      experience: () => go('journey'), operation: () => go('canvas'), execution: () => go('action'), metrics: openIntelligence,
    };
    actions[id]();
  };
  const actOnAttention = (id: AttentionActionId) => {
    setShowAttentionDetails(false);
    const actions: Record<AttentionActionId, () => void> = {
      'action-plan': () => go('action'), collaboration: openCollaboration, journey: () => go('journey'), intelligence: openIntelligence,
      benefits: openBenefits, review: openReview, research: openResearch, blueprint: () => go('canvas'), metrics: openIntelligence,
    };
    actions[id]();
  };
  const actOnArchitecture = (id: ArchitectureActionId) => {
    setShowArchitectureDetails(false);
    const actions: Record<ArchitectureActionId, () => void> = {
      journey: () => go('journey'), blueprint: () => go('canvas'), action: () => go('action'), intelligence: openIntelligence, research: openResearch,
    };
    actions[id]();
  };

  const userName = (getStoredUser()?.name || 'você').trim().split(/\s+/)[0] || 'você';
  const learnCards = [
    { label: 'Gerenciar jornadas', icon: <MapIcon size={21} />, action: () => go('journey'), tone: 'coral' },
    { label: 'Mapear uma jornada', icon: <BookOpen size={21} />, action: () => go('journey'), tone: 'amber' },
    { label: 'Visão do Blueprint', icon: <LayoutTemplate size={21} />, action: () => go('canvas'), tone: 'violet' },
    { label: 'Montar serviço guiado', helper: 'Estruturar um serviço passo a passo', icon: <Network size={21} />, action: () => void openGuidedBuilder(), tone: 'green' },
    { label: 'Métricas e resultados', icon: <BarChart3 size={21} />, action: openIntelligence, tone: 'mint' },
    { label: 'Exportar dados', icon: <Download size={21} />, action: onExport, tone: 'blue' },
  ];

  return (
    <section className="bo1187-dashboard" data-bo-workspace-home-native="1" data-home-state="active" data-home-version="3" data-dashboard-parity="1">
      <section className="bo1195-service-project bo1198-service-home" data-service-project-home="1" data-ux-truth-surface="service-home" data-service-home-version="1.19.8" data-overall-score={serviceProjectReport.overallScore}>
        <header className="bo1195-service-project__hero" data-project-id={serviceProject.id} data-project-version={serviceProject.version}>
          <div>
            <small>SERVICE HOME</small>
            <h1>{graph.service.name}</h1>
            <p>{graph.service.description || 'Entenda o cliente, defina o serviço e só então escolha como desenhá-lo.'}</p>
            
          </div>
          
        </header>

        <nav className="bo1195-project-phases bo1197-project-phases" aria-label="Ciclo de construção do serviço" data-current-phase={serviceProject.currentPhase}>
          {([
            ['discovery', '01', 'ENTENDER', 'Cliente e problema', 'Personas, necessidades, jobs, dores e evidências.'],
            ['definition', '02', 'DEFINIR', 'Resultado e escopo', 'Promessa, resultado, limites e princípios.'],
            ['design', '03', 'DESENHAR', 'Montar o serviço', 'Whiteboards, Journeys, Blueprints e composição.'],
            ['validation', '04', 'VALIDAR', 'Provar que funciona', 'Evidências, métricas, experimentos e simulação.'],
            ['improvement', '05', 'MELHORAR', 'Evoluir o serviço', 'Problemas, oportunidades e iniciativas.'],
          ] as Array<[ServiceProjectPhase, string, string, string, string]>).map(([key, number, label, title, detail]) => (
            <button type="button" key={key} onClick={() => changeProjectPhase(key)} className={`${serviceProject.currentPhase === key ? 'is-active ' : ''}${serviceProjectReport.phases[key].state === 'complete' ? 'is-complete' : ''}`} data-phase={key} aria-current={serviceProject.currentPhase === key ? 'step' : undefined}>
              <span>{number}</span><div><small>{label}</small><strong>{title}</strong><p>{detail}</p></div><b>{key === 'discovery' ? discoveryScore : serviceProjectReport.phases[key].score}%</b>
            </button>
          ))}
        </nav>

        <section className={`bo1204-readiness is-${serviceReadinessReport.state}`} data-service-readiness="1" data-ready-for-design={serviceReadinessReport.readyForDesign ? '1' : '0'} data-blocking-gaps={serviceReadinessReport.blockingGaps.length}>
          <header className="bo1204-readiness-head">
            <div><small>SERVICE READINESS · V1</small><h2>{serviceReadinessReport.readyForDesign ? 'Contexto suficiente para avançar com confiança' : 'Feche as lacunas antes de consolidar o desenho'}</h2><p>Readiness mede preparo para desenhar. Não é Health e não é Coverage: cada critério aponta para uma evidência concreta no Service Graph.</p></div>
            <div className="bo1204-readiness-score"><span>PRONTIDÃO</span><strong>{serviceReadinessReport.score}%</strong><small>{serviceReadinessReport.complete} / {serviceReadinessReport.total} critérios</small><i><b style={{ width: `${serviceReadinessReport.score}%` }} /></i></div>
          </header>
          <div className="bo1204-readiness-sections">
            {(['context', 'definition', 'structure'] as const).map((key) => { const section = serviceReadinessReport.sections[key]; const gaps = section.criteria.filter((item) => !item.complete); return <article key={key} data-readiness-section={key}>
              <header><div><small>{key === 'context' ? '01 · ENTENDER' : key === 'definition' ? '02 · DEFINIR' : '03 · ESTRUTURAR'}</small><strong>{section.label}</strong></div><b>{section.score}%</b></header>
              <p>{section.description}</p><i className="bo1204-section-progress"><b style={{ width: `${section.score}%` }} /></i>
              <div className="bo1204-section-status"><span>{section.complete}/{section.total} completos</span><em>{gaps.length ? `${gaps.length} lacuna(s)` : 'Sem bloqueios'}</em></div>
              <details><summary>Ver critérios</summary>{section.criteria.map((item) => <button type="button" key={item.id} className={item.complete ? 'is-done' : 'is-gap'} onClick={() => !item.complete && resolveReadinessGap(item)}><b>{item.complete ? '✓' : '—'}</b><span><strong>{item.label}</strong><small>{item.detail}</small></span>{!item.complete && <em>{item.action.label} →</em>}</button>)}</details>
            </article>; })}
          </div>
          <footer className="bo1204-readiness-next">
            <div><small>{serviceReadinessReport.readyForDesign ? 'GATE LIBERADO' : 'PRÓXIMA LACUNA'}</small><strong>{serviceReadinessReport.readyForDesign ? 'Ready to Design' : serviceReadinessReport.nextAction?.label}</strong><p>{serviceReadinessReport.readyForDesign ? `Discovery, Definition e Service Frame atendem os ${serviceReadinessReport.total} critérios mínimos.` : serviceReadinessReport.nextAction?.detail}</p></div>
            {serviceReadinessReport.readyForDesign ? <button type="button" className="primary" onClick={() => changeProjectPhase('design')}>Ir para Desenhar <ArrowRight size={14}/></button> : <button type="button" className="primary" onClick={() => resolveReadinessGap(serviceReadinessReport.nextAction)}>{serviceReadinessReport.nextAction?.action.label ?? 'Resolver próxima lacuna'} <ArrowRight size={14}/></button>}
          </footer>
        </section>

        <div className="bo1195-project-layout bo1197-project-layout">
          <section className="bo1197-phase-workspace" data-phase-workspace={serviceProject.currentPhase}>
            {serviceProject.currentPhase === 'discovery' && <section className="bo1202-home-context" aria-labelledby="bo1202-home-context-title" data-service-context-entry="1">
              <header><div><small>FASE 01 · ENTENDER</small><h2 id="bo1202-home-context-title">Construa o contexto do serviço</h2><p>Personas, necessidades, Jobs, dores, hipóteses, problemas e evidências agora vivem em uma biblioteca própria. A Home mostra apenas o progresso e o próximo passo.</p></div><button type="button" className="primary" onClick={() => openContext()}>Abrir Context Library <ArrowRight size={14}/></button></header>
              <div className="bo1202-home-context-grid">
                {([['persona','Personas'],['need','Necessidades'],['job','Jobs'],['pain','Dores'],['problemHypothesis','Hipóteses'],['evidence','Evidências']] as Array<[DiscoveryKind,string]>).map(([kind,label]) => <button type="button" key={kind} onClick={() => openContext(kind)}><span>{label}</span><strong>{kind === 'evidence' ? evidenceCount : discoveryWorkspace.collections[kind].count}</strong><small>{discoveryWorkspace.collections[kind].question}</small></button>)}
                <button type="button" onClick={() => openContext('problem')}><span>Problemas</span><strong>{validatedProblems.length}</strong><small>Problemas validados a partir das hipóteses e evidências.</small></button>
              </div>
              <div className="bo1202-home-context-status"><div><small>COBERTURA DO DISCOVERY</small><strong>{discoveryScore}%</strong><i><b style={{ width: `${discoveryScore}%` }} /></i></div><p>{discoveryReady ? 'Existe contexto mínimo para avançar à definição. Continue refinando os objetos na Context Library conforme surgirem novas evidências.' : 'Ainda faltam dimensões essenciais de contexto. Comece pela Persona e conecte necessidades, fricções e evidências antes do desenho.'}</p><button type="button" onClick={() => changeProjectPhase('definition')}>Ir para Definir <ArrowRight size={13}/></button></div>
            </section>}

            {false && <section className="bo1198-discovery-workspace" aria-labelledby="bo1198-discovery-title" data-discovery-workspace="1">
              <header className="bo1198-workspace-header"><div><small>FASE 01 · ENTENDER</small><h2 id="bo1198-discovery-title">Descoberta antes do desenho</h2><p>Organize o raciocínio que sustenta o serviço. Cada objeto continua canônico no Service Graph e pode ser relacionado sem duplicação.</p></div><button type="button" onClick={openResearch}>Abrir pesquisa <ArrowRight size={13} /></button></header>

              <div className="bo1198-discovery-flow" aria-label="Fluxo de descoberta">
                {(['persona', 'need', 'job', 'pain', 'problemHypothesis', 'evidence'] as DiscoveryKind[]).map((kind, index) => <div key={kind}><span>{String(index + 1).padStart(2, '0')}</span><strong>{discoveryLabel[kind]}</strong>{index < 5 && <i>→</i>}</div>)}
              </div>

              <div className="bo1198-discovery-grid">
                {discoveryQuickActions.map(({ kind, action }) => {
                  const collection = discoveryWorkspace.collections[kind];
                  const count = kind === 'evidence' ? evidenceCount : collection.count;
                  return <article key={kind} data-kind={kind}><span>{collection.label.toUpperCase()}</span><strong>{count}</strong><p>{collection.question}</p><button type="button" onClick={action}>+ {kind === 'problemHypothesis' ? 'Adicionar hipótese' : `Adicionar ${collection.singular.toLowerCase()}`}</button></article>;
                })}
              </div>

              <section className="bo1199-persona-studio" data-persona-studio="1" aria-labelledby="bo1199-persona-title">
                <header className="bo1199-persona-header">
                  <div><small>PERSONA STUDIO</small><h3 id="bo1199-persona-title">Entenda a pessoa sem inventar um personagem</h3><p>Comece simples. Aprofunde apenas quando houver contexto e conecte a Persona às necessidades, Jobs, dores, hipóteses e evidências reais.</p></div>
                  <button type="button" onClick={() => openDiscoveryCreate('persona')}>+ Nova Persona</button>
                </header>
                {personas.length ? <div className="bo1199-persona-layout">
                  <aside className="bo1199-persona-list" aria-label="Personas do serviço">
                    <span>PERSONAS · {personas.length}</span>
                    {personas.map((persona) => {
                      const report = buildPersonaStudioReport(graph, persona.id);
                      return <button type="button" key={persona.id} className={personaStudioId === persona.id ? 'is-active' : ''} onClick={() => setPersonaStudioId(persona.id)}>
                        <strong>{String(persona.title ?? persona.name ?? 'Sem título')}</strong>
                        <small>{String(persona.context ?? persona.description ?? 'Contexto ainda não registrado')}</small>
                        <i><b style={{ width: `${report?.foundationScore ?? 0}%` }} /></i><em>{report?.foundationScore ?? 0}% base</em>
                      </button>;
                    })}
                  </aside>
                  <div className="bo1199-persona-editor">
                    {personaDraft && personaStudioReport ? <>
                      <div className="bo1199-persona-toolbar">
                        <div className="bo1199-mode-switch" role="group" aria-label="Profundidade da Persona">
                          <button type="button" className={activePersonaDraft.mode === 'simple' ? 'is-active' : ''} onClick={() => setPersonaDraft((current) => current ? { ...current, mode: 'simple' } : current)}>Simples</button>
                          <button type="button" className={activePersonaDraft.mode === 'professional' ? 'is-active' : ''} onClick={() => setPersonaDraft((current) => current ? { ...current, mode: 'professional' } : current)}>Profissional</button>
                        </div>
                        <div className="bo1199-persona-score"><span>BASE</span><strong>{personaFoundationScore}%</strong><small>{personaReadyForDefinition ? 'Contexto mínimo conectado' : 'Ainda há lacunas de contexto'}</small></div>
                      </div>

                      <div className="bo1199-persona-form">
                        <label className="wide"><span>Nome da Persona</span><input value={activePersonaDraft.title} onChange={(event) => setPersonaDraft((current) => current ? { ...current, title: event.target.value } : current)} placeholder="Ex.: Profissional que mora sozinho" /></label>
                        <label className="wide"><span>Resumo</span><textarea rows={2} value={activePersonaDraft.description} onChange={(event) => setPersonaDraft((current) => current ? { ...current, description: event.target.value } : current)} placeholder="Uma síntese curta baseada no que sabemos até agora." /></label>
                        <label><span>Contexto</span><textarea rows={3} value={activePersonaDraft.context} onChange={(event) => setPersonaDraft((current) => current ? { ...current, context: event.target.value } : current)} placeholder="Em que contexto essa pessoa vive ou usa o serviço?" /></label>
                        <label><span>Objetivo principal</span><textarea rows={3} value={activePersonaDraft.primaryGoal} onChange={(event) => setPersonaDraft((current) => current ? { ...current, primaryGoal: event.target.value } : current)} placeholder="Que progresso ela tenta alcançar?" /></label>
                        <label><span>Situação / momento</span><textarea rows={3} value={activePersonaDraft.situation} onChange={(event) => setPersonaDraft((current) => current ? { ...current, situation: event.target.value } : current)} placeholder="Quando essa necessidade aparece?" /></label>
                        <label><span>Frase representativa <small>opcional</small></span><textarea rows={3} value={activePersonaDraft.quote} onChange={(event) => setPersonaDraft((current) => current ? { ...current, quote: event.target.value } : current)} placeholder="Use somente quando houver fala ou evidência real." /></label>
                      </div>

                      {activePersonaDraft.mode === 'professional' && <section className="bo1199-professional-depth" aria-label="Profundidade profissional">
                        <header><div><small>MODO PROFISSIONAL</small><strong>Aprofundamento comportamental e operacional</strong></div><span>{personaProfessionalScore}% completo</span></header>
                        <div>
                          <label><span>Comportamentos <small>um por linha</small></span><textarea rows={4} value={activePersonaDraft.behaviors.join('\n')} onChange={(event) => updatePersonaList('behaviors', event.target.value)} placeholder="Compara avaliações antes de comprar\nPrefere resolver pelo celular" /></label>
                          <label><span>Expectativas</span><textarea rows={4} value={activePersonaDraft.expectations.join('\n')} onChange={(event) => updatePersonaList('expectations', event.target.value)} placeholder="Rapidez\nPrevisibilidade" /></label>
                          <label><span>Restrições</span><textarea rows={4} value={activePersonaDraft.constraints.join('\n')} onChange={(event) => updatePersonaList('constraints', event.target.value)} placeholder="Pouco tempo\nOrçamento limitado" /></label>
                          <label><span>Gatilhos</span><textarea rows={4} value={activePersonaDraft.triggers.join('\n')} onChange={(event) => updatePersonaList('triggers', event.target.value)} placeholder="Acúmulo de roupa\nSemana muito corrida" /></label>
                          <label><span>Alternativas atuais</span><textarea rows={4} value={activePersonaDraft.alternatives.join('\n')} onChange={(event) => updatePersonaList('alternatives', event.target.value)} placeholder="Fazer em casa\nPedir ajuda a alguém" /></label>
                          <label><span>Canais / ambientes</span><textarea rows={4} value={activePersonaDraft.channels.join('\n')} onChange={(event) => updatePersonaList('channels', event.target.value)} placeholder="WhatsApp\nAplicativo\nLoja física" /></label>
                        </div>
                      </section>}

                      <section className="bo1199-persona-relations" aria-labelledby="bo1199-relations-title">
                        <header><div><small>SERVICE GRAPH</small><h4 id="bo1199-relations-title">Contexto conectado à Persona</h4></div><span>{personaConnectedIds.length} conexão(ões) selecionada(s)</span></header>
                        <div className="bo1199-relation-columns">
                          {(['need', 'job', 'pain', 'problemHypothesis', 'evidence'] as PersonaRelationKind[]).map((kind) => {
                            const options = personaRelationChoices.filter((item) => item.kind === kind);
                            return <section key={kind} data-kind={kind}><header><strong>{discoveryLabel[kind]}</strong><small>{options.filter((item) => personaConnectedIds.includes(item.id)).length}/{options.length}</small></header>
                              {options.length ? <div>{options.map((item) => <button type="button" key={item.id} className={personaConnectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => togglePersonaRelation(item.id)} aria-pressed={personaConnectedIds.includes(item.id)}><span>{personaConnectedIds.includes(item.id) ? '✓' : '+'}</span><strong>{item.title}</strong>{item.kind === 'evidence' && <small>Confiança {item.confidence === 'high' ? 'alta' : item.confidence === 'low' ? 'baixa' : 'média'}</small>}</button>)}</div> : <p>Nenhum item criado ainda.</p>}
                            </section>;
                          })}
                        </div>
                      </section>

                      <div className="bo1199-persona-readiness">
                        <div><small>FUNDAÇÃO DA PERSONA</small>{personaFoundationChecks.map((check) => <span key={check.id} className={check.complete ? 'is-done' : ''}><b>{check.complete ? '✓' : '—'}</b>{check.label}</span>)}</div>
                        <div><small>EVIDÊNCIA</small><strong>{personaEvidenceCount} conectada(s)</strong><p>{personaEvidenceConfidence.high} alta · {personaEvidenceConfidence.medium} média · {personaEvidenceConfidence.low} baixa confiança</p></div>
                      </div>

                      <footer className="bo1199-persona-actions"><button type="button" className="danger" onClick={() => setPersonaDeleteConfirm(true)}>Remover Persona</button><span /><button type="button" onClick={discardPersonaStudio}>Descartar alterações</button><button type="button" className="primary" disabled={!activePersonaDraft.title.trim()} onClick={savePersonaStudio}>Salvar Persona</button></footer>
                    </> : <div className="bo1199-persona-empty"><strong>Selecione uma Persona</strong><p>Escolha uma Persona ao lado ou crie a primeira para começar.</p></div>}
                  </div>
                </div> : <div className="bo1199-persona-empty is-first"><strong>Nenhuma Persona criada ainda.</strong><p>O Discovery fica mais útil quando existe uma pessoa ou grupo concreto para orientar necessidades, Jobs e evidências.</p><button type="button" onClick={() => openDiscoveryCreate('persona')}>Criar primeira Persona</button></div>}
              </section>

              <section className="bo1200-problem-evidence-studio" data-problem-evidence-studio="1" aria-labelledby="bo1200-problem-evidence-title">
                <header className="bo1200-studio-header">
                  <div><small>PROBLEM &amp; EVIDENCE STUDIO</small><h3 id="bo1200-problem-evidence-title">Transforme suposição em problema rastreável</h3><p>Conecte dor, contexto e evidências. O sistema mostra os critérios usados; a promoção para problema validado acontece somente por uma ação explícita.</p></div>
                  <div><button type="button" onClick={() => openDiscoveryCreate('problemHypothesis')}>+ Nova hipótese</button><button type="button" onClick={() => openDiscoveryCreate('evidence')}>+ Nova evidência</button></div>
                </header>

                <nav className="bo1200-studio-tabs" aria-label="Problem & Evidence Studio">
                  <button type="button" className={problemEvidenceView === 'problem' ? 'is-active' : ''} onClick={() => setProblemEvidenceView('problem')}>Hipóteses e problemas <b>{discoveryProblemHypotheses.length}</b></button>
                  <button type="button" className={problemEvidenceView === 'evidence' ? 'is-active' : ''} onClick={() => setProblemEvidenceView('evidence')}>Evidências <b>{evidenceRecords.length}</b></button>
                  <span>{validatedProblems.length} problema(s) validado(s)</span>
                </nav>

                {problemEvidenceView === 'problem' && (discoveryProblemHypotheses.length ? <div className="bo1200-problem-layout">
                  <aside className="bo1200-hypothesis-list" aria-label="Hipóteses do serviço">
                    <span>HIPÓTESES · {discoveryProblemHypotheses.length}</span>
                    {discoveryProblemHypotheses.map((hypothesis) => {
                      const report = buildProblemEvidenceStudioReport(graph, hypothesis.id);
                      return <button type="button" key={hypothesis.id} className={problemStudioId === hypothesis.id ? 'is-active' : ''} onClick={() => setProblemStudioId(hypothesis.id)}>
                        <div><strong>{String(hypothesis.title ?? 'Sem título')}</strong><small>{report?.status === 'validated' ? 'Problema validado' : report?.status === 'testing' ? 'Em validação' : 'Hipótese'}</small></div>
                        <i><b style={{ width: `${report?.validationScore ?? 0}%` }} /></i><em>{report?.validationScore ?? 0}% prontidão</em>
                      </button>;
                    })}
                  </aside>

                  <div className="bo1200-problem-editor">
                    {problemDraft && problemEvidencePreview ? <>
                      <div className="bo1200-problem-toolbar">
                        <div><small>ESTADO ATUAL</small><strong>{problemPreviewStatus === 'validated' ? 'Problema validado' : problemPreviewStatus === 'testing' ? 'Hipótese em validação' : 'Hipótese ainda sem evidência'}</strong></div>
                        <div className={`bo1200-readiness-badge ${problemReadyToValidate ? 'is-ready' : ''}`}><span>PRONTIDÃO</span><strong>{problemValidationScore}%</strong><small>{problemReadyToValidate ? 'Critérios mínimos atendidos' : 'Existem lacunas antes de validar'}</small></div>
                      </div>

                      <div className="bo1200-problem-form">
                        <label className="wide"><span>Hipótese de problema</span><input value={activeProblemDraft.title} onChange={(event) => setProblemDraft((current) => current ? { ...current, title: event.target.value } : current)} placeholder="Ex.: O deslocamento até a lavanderia é a principal fricção" /></label>
                        <label className="wide"><span>Descrição / mecanismo observado</span><textarea rows={3} value={activeProblemDraft.description} onChange={(event) => setProblemDraft((current) => current ? { ...current, description: event.target.value } : current)} placeholder="O que acreditamos estar acontecendo, em qual contexto e por quê?" /></label>
                        <label className="wide"><span>Impacto percebido <small>opcional</small></span><textarea rows={2} value={activeProblemDraft.impact} onChange={(event) => setProblemDraft((current) => current ? { ...current, impact: event.target.value } : current)} placeholder="Ex.: aumenta o tempo total, gera abandono ou força uma alternativa manual." /></label>
                      </div>

                      <section className="bo1200-context-links" aria-labelledby="bo1200-context-links-title">
                        <header><div><small>CONTEXTO</small><h4 id="bo1200-context-links-title">Onde esse problema acontece?</h4></div><span>{problemContextIds.length} conexão(ões)</span></header>
                        <div>{(['persona', 'need', 'job', 'pain'] as const).map((kind) => {
                          const options = problemContextChoices.filter((item) => item.kind === kind);
                          return <section key={kind} data-kind={kind}><strong>{kind === 'persona' ? 'Personas' : kind === 'need' ? 'Necessidades' : kind === 'job' ? 'Jobs' : 'Dores'}</strong>{options.length ? options.map((item) => <button type="button" key={item.id} className={problemContextIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleProblemContext(item.id)} aria-pressed={problemContextIds.includes(item.id)}><span>{problemContextIds.includes(item.id) ? '✓' : '+'}</span><b>{item.title}</b></button>) : <p>Nenhum item criado.</p>}</section>;
                        })}</div>
                      </section>

                      <section className="bo1200-evidence-matrix" aria-labelledby="bo1200-evidence-matrix-title">
                        <header><div><small>EVIDÊNCIA × HIPÓTESE</small><h4 id="bo1200-evidence-matrix-title">O que sustenta ou contradiz esta hipótese?</h4><p>“Confiança” descreve a qualidade da evidência. “Relação” descreve o que ela diz sobre esta hipótese específica.</p></div><span>{problemEvidenceLinks.length}/{evidenceRecords.length} relacionada(s)</span></header>
                        {problemEvidenceChoices.length ? <div>{problemEvidenceChoices.map((item) => {
                          const active = problemEvidenceLinks.find((link) => link.evidenceId === item.id)?.stance ?? null;
                          return <article key={item.id} className={active ? 'is-linked' : ''}>
                            <div><span>{item.sourceType} · confiança {item.confidence === 'high' ? 'alta' : item.confidence === 'low' ? 'baixa' : 'média'}</span><strong>{item.title}</strong><p>{item.description || 'Sem descrição adicional.'}</p></div>
                            <div className="bo1200-stance-control" role="group" aria-label={`Relação da evidência ${item.title}`}>
                              <button type="button" className={!active ? 'is-active' : ''} onClick={() => setProblemEvidenceStance(item.id, null)}>Não ligada</button>
                              <button type="button" className={active === 'supports' ? 'is-active supports' : ''} onClick={() => setProblemEvidenceStance(item.id, 'supports')}>Sustenta</button>
                              <button type="button" className={active === 'contradicts' ? 'is-active contradicts' : ''} onClick={() => setProblemEvidenceStance(item.id, 'contradicts')}>Contradiz</button>
                              <button type="button" className={active === 'neutral' ? 'is-active neutral' : ''} onClick={() => setProblemEvidenceStance(item.id, 'neutral')}>Contextual</button>
                            </div>
                          </article>;
                        })}</div> : <div className="bo1200-studio-empty"><strong>Nenhuma evidência criada.</strong><p>Adicione uma evidência observável antes de validar a hipótese.</p><button type="button" onClick={() => openDiscoveryCreate('evidence')}>Criar evidência</button></div>}
                      </section>

                      <section className="bo1200-validation-panel">
                        <div className="bo1200-validation-checks"><small>CRITÉRIOS DE VALIDAÇÃO</small>{problemValidationChecks.map((check) => <article key={check.id} className={check.complete ? 'is-done' : ''}><b>{check.complete ? '✓' : '—'}</b><div><strong>{check.label}</strong><span>{check.detail}</span></div></article>)}</div>
                        <aside><small>BALANÇO DE EVIDÊNCIAS</small><dl><div><dt>Sustentam</dt><dd>{problemSupportCount}</dd></div><div><dt>Contradizem</dt><dd>{problemContradictionCount}</dd></div><div><dt>Contextuais</dt><dd>{problemNeutralCount}</dd></div><div><dt>Suporte de alta confiança</dt><dd>{problemHighConfidenceSupportCount}</dd></div></dl><p>A prontidão é determinística e explicável; ela não substitui julgamento de pesquisa.</p></aside>
                      </section>

                      {hasValidatedProblem && <section className={`bo1200-validated-problem ${selectedProblemHypothesis?.validationNeedsReview ? 'needs-review' : ''}`}><div><small>PROBLEMA VALIDADO</small><strong>{validatedProblemTitle}</strong><p>{selectedProblemHypothesis?.validationNeedsReview ? 'A hipótese mudou desde a última validação. Revise os critérios e atualize o problema validado.' : 'A hipótese foi promovida preservando a origem e as evidências utilizadas.'}</p></div><span>{validatedProblemDate}</span></section>}

                      <footer className="bo1200-problem-actions"><button type="button" onClick={discardProblemHypothesis}>Descartar alterações</button><span /><button type="button" onClick={saveProblemHypothesis} disabled={!activeProblemDraft.title.trim()}>Salvar hipótese</button><button type="button" className="primary" disabled={!problemReadyToValidate || !activeProblemDraft.title.trim()} onClick={validateCurrentProblem}>{hasValidatedProblem ? 'Atualizar problema validado' : 'Validar como problema'}</button></footer>
                    </> : <div className="bo1200-studio-empty"><strong>Selecione uma hipótese</strong><p>Escolha uma hipótese ao lado ou crie uma nova para iniciar a validação.</p></div>}
                  </div>
                </div> : <div className="bo1200-studio-empty is-first"><strong>Nenhuma hipótese criada ainda.</strong><p>Comece por uma dor observável e formule uma hipótese que possa ser confrontada com evidências.</p><button type="button" onClick={() => openDiscoveryCreate('problemHypothesis')}>Criar primeira hipótese</button></div>)}

                {problemEvidenceView === 'evidence' && (evidenceRecords.length ? <div className="bo1200-evidence-layout">
                  <aside className="bo1200-evidence-list" aria-label="Evidências do serviço"><span>EVIDÊNCIAS · {evidenceRecords.length}</span>{evidenceRecords.map((evidence) => <button type="button" key={evidence.id} className={evidenceStudioId === evidence.id ? 'is-active' : ''} onClick={() => setEvidenceStudioId(evidence.id)}><strong>{String(evidence.title ?? 'Sem título')}</strong><small>{String(evidence.sourceType ?? 'observation')} · confiança {String(evidence.confidence ?? 'medium') === 'high' ? 'alta' : String(evidence.confidence ?? 'medium') === 'low' ? 'baixa' : 'média'}</small><em>{Array.isArray(evidence.hypothesisIds) ? evidence.hypothesisIds.length : 0} hipótese(s)</em></button>)}</aside>
                  <div className="bo1200-evidence-editor">{evidenceDraft ? <>
                    <div className="bo1200-evidence-editor-head"><div><small>EVIDENCE DESK</small><strong>Registre o que foi observado, não a conclusão desejada</strong></div><button type="button" onClick={() => openDiscoveryCreate('evidence')}>+ Nova evidência</button></div>
                    <div className="bo1200-evidence-form"><label className="wide"><span>Título da evidência</span><input value={activeEvidenceDraft.title} onChange={(event) => setEvidenceDraft((current) => current ? { ...current, title: event.target.value } : current)} /></label><label className="wide"><span>Observação / descrição</span><textarea rows={5} value={activeEvidenceDraft.description} onChange={(event) => setEvidenceDraft((current) => current ? { ...current, description: event.target.value } : current)} placeholder="O que foi realmente observado, medido, dito ou registrado?" /></label><label><span>Confiança</span><select value={activeEvidenceDraft.confidence} onChange={(event) => setEvidenceDraft((current) => current ? { ...current, confidence: event.target.value as EvidenceDraft['confidence'] } : current)}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label><label><span>Tipo de fonte</span><select value={activeEvidenceDraft.sourceType} onChange={(event) => setEvidenceDraft((current) => current ? { ...current, sourceType: event.target.value } : current)}><option value="observation">Observação</option><option value="interview">Entrevista</option><option value="survey">Pesquisa / survey</option><option value="analytics">Analytics</option><option value="support">Atendimento / suporte</option><option value="document">Documento</option><option value="workshop">Workshop</option><option value="other">Outro</option></select></label></div>
                    <section className="bo1200-evidence-usage"><small>USO DESTA EVIDÊNCIA</small>{discoveryProblemHypotheses.length ? discoveryProblemHypotheses.map((hypothesis) => { const report = buildProblemEvidenceStudioReport(graph, hypothesis.id); const link = report?.evidenceConnections.find((item) => item.id === evidenceStudioId); return <article key={hypothesis.id}><div><strong>{String(hypothesis.title ?? 'Hipótese')}</strong><span>{link ? (link.stance === 'supports' ? 'Sustenta' : link.stance === 'contradicts' ? 'Contradiz' : 'Contextual') : 'Não relacionada'}</span></div><small>{report?.status === 'validated' ? 'Problema validado' : report?.status === 'testing' ? 'Em validação' : 'Hipótese'}</small></article>; }) : <p>Nenhuma hipótese criada ainda.</p>}</section>
                    <footer className="bo1200-evidence-actions"><button type="button" onClick={discardEvidenceStudio}>Descartar alterações</button><button type="button" className="primary" disabled={!activeEvidenceDraft.title.trim()} onClick={saveEvidenceStudio}>Salvar evidência</button></footer>
                  </> : <div className="bo1200-studio-empty"><strong>Selecione uma evidência</strong><p>Escolha um registro para revisar qualidade, fonte e descrição.</p></div>}</div>
                </div> : <div className="bo1200-studio-empty is-first"><strong>Nenhuma evidência criada ainda.</strong><p>Adicione observações, entrevistas, métricas ou outros sinais que possam sustentar ou contradizer hipóteses.</p><button type="button" onClick={() => openDiscoveryCreate('evidence')}>Criar primeira evidência</button></div>)}
              </section>

              <div className="bo1198-discovery-body">
                <section className="bo1198-context-stream" aria-labelledby="bo1198-context-title">
                  <header><div><small>CONTEXTO CONECTADO</small><h3 id="bo1198-context-title">O que já sabemos</h3></div><span>{discoveryWorkspace.totalObjects} objetos · {discoveryWorkspace.relationshipCount} relações</span></header>
                  {discoveryWorkspace.recent.length ? <div className="bo1198-context-list">{discoveryWorkspace.recent.map((item) => {
                    const related = Array.isArray(item.relatedIds) ? item.relatedIds.length : 0;
                    return <article key={`${item.discoveryKind}-${item.id}`} data-kind={item.discoveryKind}><div><span>{discoveryLabel[item.discoveryKind]}</span><strong>{String(item.title ?? item.name ?? 'Sem título')}</strong><p>{String(item.description ?? 'Sem contexto adicional.')}</p></div><small>{related ? `${related} relação(ões)` : 'Ainda sem relação'}</small></article>;
                  })}</div> : <div className="bo1198-context-empty"><strong>O Discovery ainda está vazio.</strong><span>Comece por uma Persona e conecte os próximos objetos conforme o entendimento evoluir.</span><button type="button" onClick={() => openDiscoveryCreate('persona')}>Criar primeira Persona</button></div>}
                </section>

                <aside className="bo1198-discovery-progress">
                  <small>COBERTURA DE DESCOBERTA</small><strong>{discoveryScore}%</strong><i><b style={{ width: `${discoveryScore}%` }} /></i>
                  <dl>{(['persona', 'need', 'job', 'pain', 'problemHypothesis', 'evidence'] as DiscoveryKind[]).map((kind) => <div key={kind}><dt>{discoveryLabel[kind]}</dt><dd>{discoveryWorkspace.collections[kind].count > 0 ? '✓' : '—'}</dd></div>)}</dl>
                  <p>{discoveryWorkspace.minimumContextReady ? 'Existe contexto mínimo conectado para avançar à definição do serviço.' : 'Preencha o contexto progressivamente. Não é necessário ter tudo perfeito para aprender, mas o desenho estruturado não deve começar no vazio.'}</p>
                  <p className="bo1198-legacy-context">Base atual: {personas.length} persona(s) · {needs.length} necessidade(s) · {discoveryProblemCount} problema(s)/hipótese(s) · {evidenceCount} evidência(s).</p>
                </aside>
              </div>

              <div className={`bo1195-discovery-gate bo1198-discovery-gate ${discoveryReady ? 'is-ready' : ''}`}>
                <div><small>PRÓXIMO PASSO</small><strong>{discoveryReady ? 'Contexto mínimo disponível. Agora defina o serviço.' : `Discovery em construção · ${discoveryWorkspace.completedChecks}/${discoveryWorkspace.totalChecks} dimensões iniciadas.`}</strong><span>{discoveryReady ? 'Transforme o entendimento em promessa, resultado, escopo e limites antes de desenhar.' : 'Você pode continuar adicionando e conectando objetos. A fase Definir continua acessível para rascunho.'}</span></div>
                <button type="button" onClick={() => changeProjectPhase('definition')}>Ir para Definir <ArrowRight size={14} /></button>
              </div>
            </section>}

            {serviceProject.currentPhase === 'definition' && <section className="bo1197-definition bo1201-definition-studio" data-service-definition-studio="1" aria-labelledby="bo1197-definition-title">
              <header className="bo1198-workspace-header bo1201-definition-header"><div><small>FASE 02 · DEFINIR</small><h2 id="bo1197-definition-title">Service Definition Studio</h2><p>Transforme o que foi aprendido no Discovery em um contrato de intenção para orientar Journey, Blueprint e operação.</p></div><div className={`bo1201-definition-score ${definitionStudioReport.readyToDesign ? 'is-ready' : ''}`}><span>PRONTIDÃO</span><strong>{definitionStudioReport.score}%</strong><small>{definitionStudioReport.completed}/{definitionStudioReport.total} critérios</small></div></header>
              <div className="bo1201-definition-layout">
                <div className="bo1201-definition-main">
                  <section className="bo1201-definition-card"><header><small>01 · PROPOSTA</small><strong>O que este serviço existe para entregar?</strong></header><div className="bo1197-definition-form">
                    <label><span>Promessa do serviço</span><textarea rows={3} value={definitionDraft.promise} onChange={(event) => setDefinitionDraft((current) => ({ ...current, promise: event.target.value }))} placeholder="Que valor este serviço promete entregar?" /></label>
                    <label><span>Outcome esperado</span><textarea rows={3} value={definitionDraft.outcome} onChange={(event) => setDefinitionDraft((current) => ({ ...current, outcome: event.target.value }))} placeholder="O que deve ser diferente quando o serviço funciona bem?" /></label>
                    <label><span>Escopo do serviço</span><textarea rows={3} value={definitionDraft.scope} onChange={(event) => setDefinitionDraft((current) => ({ ...current, scope: event.target.value }))} placeholder="O que faz parte deste serviço?" /></label>
                    <label><span>Fora do escopo <small>um por linha</small></span><textarea rows={3} value={definitionOutOfScopeText} onChange={(event) => setDefinitionOutOfScopeText(event.target.value)} placeholder={'Suporte após 30 dias\nServiços de terceiros'} /></label>
                    <div className="bo1197-definition-boundaries"><label><span>Onde começa?</span><input value={definitionDraft.startBoundary} onChange={(event) => setDefinitionDraft((current) => ({ ...current, startBoundary: event.target.value }))} placeholder="Ex.: cliente solicita coleta" /></label><label><span>Onde termina?</span><input value={definitionDraft.endBoundary} onChange={(event) => setDefinitionDraft((current) => ({ ...current, endBoundary: event.target.value }))} placeholder="Ex.: entrega confirmada" /></label></div>
                  </div></section>
                  <section className="bo1201-definition-card"><header><small>02 · REGRAS DE DECISÃO</small><strong>Como saber se o desenho permanece fiel à definição?</strong></header><div className="bo1201-definition-lists"><label><span>Princípios <small>um por linha</small></span><textarea rows={5} value={definitionPrinciplesText} onChange={(event) => setDefinitionPrinciplesText(event.target.value)} placeholder={'Simplicidade\nTransparência\nConfiabilidade'} /></label><label><span>Critérios de sucesso <small>um por linha</small></span><textarea rows={5} value={definitionSuccessText} onChange={(event) => setDefinitionSuccessText(event.target.value)} placeholder={'Cliente conclui sem ajuda\nTempo total abaixo de 24h'} /></label><label><span>Premissas a validar <small>um por linha</small></span><textarea rows={4} value={definitionAssumptionsText} onChange={(event) => setDefinitionAssumptionsText(event.target.value)} placeholder={'Cliente aceita janela de coleta\nOperação comporta pico de demanda'} /></label></div></section>
                </div>
                <aside className="bo1201-definition-context">
                  <section><header><small>03 · RASTREABILIDADE</small><strong>Discovery que sustenta esta definição</strong><p>A definição aponta para objetos canônicos; não cria cópias.</p></header>{(['persona','problem','evidence'] as const).map((kind) => { const labels = kind === 'persona' ? ['PERSONAS-ALVO','Quem deve receber a promessa'] : kind === 'problem' ? ['PROBLEMAS VALIDADOS','Por que este serviço precisa existir'] : ['EVIDÊNCIAS','O que sustenta as decisões']; const items = definitionStudioReport.connections.filter((item) => item.kind === kind); return <div className="bo1201-context-group" key={kind}><div><span>{labels[0]}</span><small>{labels[1]}</small></div>{items.length ? items.map((item) => <button type="button" key={item.id} className={item.selected ? 'is-selected' : ''} onClick={() => toggleDefinitionConnection(kind, item.id)}><i>{item.selected ? '✓' : '+'}</i><b>{item.title}</b>{item.confidence && <em>{item.confidence}</em>}</button>) : <p>Nenhum objeto disponível no Discovery.</p>}</div>; })}</section>
                  <section className="bo1201-definition-readiness"><header><small>READINESS DE DEFINIÇÃO</small><strong>{definitionStudioReport.readyToDesign ? 'Pronta para orientar o desenho' : 'Ainda existem lacunas'}</strong></header>{definitionStudioReport.checks.map((check) => <article key={check.id} className={check.complete ? 'is-done' : ''}><b>{check.complete ? '✓' : '—'}</b><div><strong>{check.label}</strong><span>{check.detail}</span></div></article>)}</section>
                </aside>
              </div>
              <footer className="bo1197-phase-actions bo1201-definition-actions"><span>{definitionStudioReport.readyToDesign ? 'A definição tem contexto suficiente para iniciar a composição.' : 'Você pode salvar como rascunho; o desenho é liberado quando os critérios essenciais estiverem completos.'}</span><button type="button" onClick={discardDefinition}>Descartar alterações</button><button type="button" className="primary" onClick={saveDefinition}>Salvar definição</button><button type="button" disabled={!definitionStudioReport.readyToDesign} onClick={startDesign}>Ir para desenho <ArrowRight size={13}/></button></footer>
            </section>}

            {serviceProject.currentPhase === 'design' && <section className="bo1197-composition bo-h78-design" data-design-handoff="1" aria-labelledby="bo1197-design-title">
              <header className="bo1198-workspace-header bo-h78-design-head"><div><small>FASE 03 · DESENHAR</small><h2 id="bo1197-design-title">Central de composição do serviço</h2><p>Journey, Blueprint e Whiteboard agora partem do mesmo contexto canônico definido no Discovery + Service Definition.</p></div><div className={`bo-h78-score ${designHandoffReport.readyForJourney ? 'is-ready' : ''}`}><span>HANDOFF</span><strong>{designHandoffReport.score}%</strong><small>{designHandoffReport.primary.length} entradas principais</small></div></header>

              <section className="bo-h78-handoff">
                <div className="bo-h78-definition-brief"><small>SERVICE DEFINITION · FONTE</small><div><article><span>Promessa</span><strong>{serviceProject.definition.promise || 'Ainda não definida'}</strong></article><article><span>Outcome</span><strong>{serviceProject.definition.outcome || 'Ainda não definido'}</strong></article><article><span>Limites</span><strong>{serviceProject.definition.startBoundary && serviceProject.definition.endBoundary ? `${serviceProject.definition.startBoundary} → ${serviceProject.definition.endBoundary}` : 'Início e fim ainda incompletos'}</strong></article></div><p>Este bloco é lido diretamente da Definition atual. Nenhum texto é duplicado em Journey, Blueprint ou Whiteboard.</p></div>
                <div className="bo-h78-context-strip">
                  <div><small>PARA QUEM</small><strong>{designHandoffReport.counts.persona}</strong><span>Persona(s)</span></div>
                  <div><small>POR QUÊ</small><strong>{designHandoffReport.counts.problem}</strong><span>Problema(s) validado(s)</span></div>
                  <div><small>COM BASE EM</small><strong>{designHandoffReport.counts.evidence}</strong><span>Evidência(s)</span></div>
                  <div><small>CONTEXTO RELACIONADO</small><strong>{designHandoffReport.counts.need + designHandoffReport.counts.job + designHandoffReport.counts.pain}</strong><span>Necessidades · Jobs · Dores</span></div>
                </div>
                <div className="bo-h78-input-grid">
                  {designHandoffReport.primary.length ? designHandoffReport.primary.map((input) => <article key={`${input.kind}-${input.id}`} data-kind={input.kind}><small>{input.kind === 'persona' ? 'PERSONA' : input.kind === 'problem' ? 'PROBLEMA VALIDADO' : 'EVIDÊNCIA'}</small><strong>{input.title}</strong><p>{input.description || 'Sem descrição adicional.'}</p>{input.confidence && <span>Confiança: {input.confidence}</span>}</article>) : <div className="bo-h78-empty"><strong>Nenhuma entrada de desenho conectada.</strong><span>Volte para Definir e conecte Persona, Problema e Evidência.</span></div>}
                </div>
                {designHandoffReport.supporting.length > 0 && <details className="bo-h78-support"><summary>Ver contexto secundário recuperado automaticamente ({designHandoffReport.supporting.length})</summary><div>{designHandoffReport.supporting.map((input) => <span key={`${input.kind}-${input.id}`}><b>{input.kind === 'need' ? 'Necessidade' : input.kind === 'job' ? 'Job' : 'Dor'}</b>{input.title}</span>)}</div></details>}
              </section>

              <div className="bo-h78-tool-launcher">
                <article><div><MapIcon size={19}/><span>JOURNEY MAP</span></div><strong>Organizar a experiência no tempo</strong><p>Cria uma Journey vazia, mas já vinculada às Personas, Problemas e Evidências da Definition. As etapas continuam sendo decisão do time.</p><small>{designHandoffReport.readyForJourney ? 'Contexto pronto para entrar' : 'Definition incompleta'}</small><button type="button" disabled={!designHandoffReport.readyForJourney} onClick={prepareJourneyWithContext}>Preparar Journey <ArrowRight size={13}/></button></article>
                <article><div><LayoutTemplate size={19}/><span>SERVICE BLUEPRINT</span></div><strong>Conectar experiência e operação</strong><p>Prepara um Blueprint ligado à Journey e ao mesmo pacote de contexto, sem presumir em qual etapa cada problema acontece.</p><small>{designHandoffReport.journeyStageCount >= 2 ? `${designHandoffReport.journeyStageCount} etapas já disponíveis` : 'Etapas serão definidas na Journey'}</small><button type="button" disabled={!designHandoffReport.readyForJourney} onClick={prepareBlueprintWithContext}>Preparar Blueprint <ArrowRight size={13}/></button></article>
                <article><div><Network size={19}/><span>WHITEBOARD</span></div><strong>Explorar sem perder a rastreabilidade</strong><p>Cria um quadro com Smart Objects canônicos de Persona, Necessidades/Jobs/Dores, Problemas e Evidências organizados por contexto.</p><small>{designHandoffReport.readyForWhiteboard ? 'Sem cópias dos objetos' : 'Contexto insuficiente'}</small><button type="button" disabled={!designHandoffReport.readyForWhiteboard} onClick={prepareWhiteboardWithContext}>Preparar Whiteboard <ArrowRight size={13}/></button></article>
              </div>

              <div className="bo-h78-checks">{designHandoffReport.checks.map((check) => <article key={check.id} className={check.complete ? 'is-done' : ''}><b>{check.complete ? '✓' : '—'}</b><div><strong>{check.label}</strong><span>{check.detail}</span></div></article>)}</div>

              <div className="bo1197-tool-stats"><article><span>WHITEBOARDS</span><strong>{whiteboardRecords.length}</strong><p>Exploração livre e raciocínio visual.</p><button type="button" onClick={() => go('whiteboards')}>Abrir Whiteboards</button></article><article><span>JOURNEYS</span><strong>{journeyRecords.length}</strong><p>{journeyRecords.reduce((sum, item) => sum + (item.stageCount ?? 0), 0)} etapas mapeadas.</p><button type="button" onClick={() => go('journey')}>Abrir Journeys</button></article><article><span>BLUEPRINTS</span><strong>{blueprintRecords.length}</strong><p>Frontstage, backstage e operação.</p><button type="button" onClick={() => go('canvas')}>Abrir Blueprints</button></article></div>
              <div className="bo1197-guided-entry bo-h78-guided"><div><small>COMPOSIÇÃO ASSISTIDA</small><strong>Montar com o contexto já criado</strong><p>O Assistente continua disponível para orientar a composição; o handoff acima garante que o contexto não desapareça quando você entra nas ferramentas.</p></div><button type="button" title={serviceReadinessReport.readyForDesign ? 'Abrir construção guiada' : 'Feche os critérios de Service Readiness antes da composição assistida'} disabled={!serviceReadinessReport.readyForDesign} onClick={() => void openGuidedBuilder()}><Sparkles size={14}/> Montar com assistente</button></div>
            </section>}

            {serviceProject.currentPhase === 'validation' && <section className="bo1197-validation" aria-labelledby="bo1197-validation-title">
              <header className="bo1198-workspace-header"><div><small>FASE 04 · VALIDAR</small><h2 id="bo1197-validation-title">Prove que o desenho funciona</h2><p>Confronte o serviço com evidências, métricas, experimentos e simulações.</p></div></header>
              <div className="bo1197-tool-stats"><article><span>EVIDÊNCIAS</span><strong>{evidenceCount}</strong><p>Base observável para sustentar decisões.</p><button type="button" onClick={openResearch}>Abrir evidências</button></article><article><span>MÉTRICAS</span><strong>{Object.keys(graph.entities?.metric ?? {}).length}</strong><p>Resultados e sinais do serviço.</p><button type="button" onClick={openIntelligence}>Abrir métricas</button></article><article><span>EXPERIMENTOS</span><strong>{Object.keys(graph.entities?.experiment ?? {}).length}</strong><p>Testes para reduzir incerteza.</p><button type="button" onClick={openSimulation}>Simular serviço</button></article></div>
            </section>}

            {serviceProject.currentPhase === 'improvement' && <section className="bo1197-improvement" aria-labelledby="bo1197-improvement-title">
              <header className="bo1198-workspace-header"><div><small>FASE 05 · MELHORAR</small><h2 id="bo1197-improvement-title">Transforme aprendizado em mudança</h2><p>Problemas validados geram oportunidades; oportunidades viram iniciativas acompanháveis.</p></div></header>
              <div className="bo1197-tool-stats"><article><span>PROBLEMAS</span><strong>{discoveryProblemCount}</strong><p>Dores, hipóteses e problemas identificados.</p><button type="button" onClick={() => changeProjectPhase('discovery')}>Revisar contexto</button></article><article><span>OPORTUNIDADES</span><strong>{Object.keys(graph.opportunities ?? {}).length + Object.keys(graph.entities?.opportunity ?? {}).length}</strong><p>Espaços de melhoria priorizáveis.</p><button type="button" onClick={openIntelligence}>Abrir oportunidades</button></article><article><span>INICIATIVAS</span><strong>{Object.keys(graph.tasks ?? {}).length}</strong><p>{Object.values(graph.tasks ?? {}).filter((item) => item.status === 'done').length} concluídas · {Object.values(graph.tasks ?? {}).filter((item) => item.status !== 'done').length} em aberto.</p><button type="button" onClick={() => go('action')}>Abrir plano de ação</button></article></div>
              <div className="bo1197-cycle-loop"><span>Melhorar</span><i>→</i><span>Nova evidência</span><i>→</i><button type="button" onClick={() => changeProjectPhase('discovery')}>Entender novamente</button></div>
            </section>}
          </section>


        </div>
      </section>

      <section className="bo1187-recents" aria-labelledby="bo1187-recents-title">
        <header>
          <h2 id="bo1187-recents-title"><Clock3 size={18} />Recentes de {userName}</h2>
          <button type="button" onClick={() => setShowAllRecents(true)}>Ver todos os recentes</button>
        </header>
        {recentItems.length ? (
          <div className="bo1187-recent-grid">
            {recentItems.slice(0, 5).map((item, index) => (
              <article className="bo1187-recent-card" key={`${item.targetType}-${item.targetId}`}>
                <button type="button" className="bo1187-recent-main" onClick={() => openTarget(item)}>
                  <div className="bo1187-recent-preview">
                    {(item.targetType === 'blueprint' || item.targetType === 'research') && <span className="bo1187-preview-badge">{targetLabel(item.targetType)}</span>}
                    <PreviewArt target={item} index={index} journeyCoverImage={item.targetType === 'journey' ? journeyCoverSrc(graph.journeys[item.targetId]) : undefined} />
                  </div>
                  <strong>{item.title}</strong>
                  <small>{targetLabel(item.targetType)} · {fmtRelative(recentTimestamp(item))}</small>
                </button>
                <div className="bo1187-card-actions" aria-label="Ações do item">
                  <button type="button" className={isFavorite(item) ? 'active' : ''} onClick={() => toggleFavoriteTarget(item)} aria-label={isFavorite(item) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} title={isFavorite(item) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Star size={14} fill={isFavorite(item) ? 'currentColor' : 'none'} /></button>
                  <button type="button" className={isPinned(item) ? 'active' : ''} onClick={() => togglePinnedTarget(item)} aria-label={isPinned(item) ? 'Desafixar da Home' : 'Fixar na Home'} title={isPinned(item) ? 'Desafixar da Home' : 'Fixar na Home'}><Pin size={14} fill={isPinned(item) ? 'currentColor' : 'none'} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="bo1187-recent-empty"><Sparkles size={22} /><div><strong>Seu serviço ainda está vazio</strong><span>Comece entendendo Persona e Problema. O desenho do serviço vem depois.</span></div><button type="button" onClick={() => openContext('persona')}>Abrir Personas</button></div>
        )}
      </section>

      <section className="bo1187-favorites" aria-labelledby="bo1187-favorites-title">
        <h2 id="bo1187-favorites-title"><Star size={18} />Favoritos de {userName}</h2>
        {favoriteItems.length ? (
          <div className="bo1187-favorite-grid">
            {favoriteItems.slice(0, 5).map((item, index) => (
              <article key={`favorite-${item.targetType}-${item.targetId}`}>
                <button type="button" className="bo1187-favorite-main" onClick={() => openTarget(item)}>
                  <PreviewArt target={item} index={index + 1} journeyCoverImage={item.targetType === 'journey' ? journeyCoverSrc(graph.journeys[item.targetId]) : undefined} />
                  <span><strong>{item.title}</strong><small>{targetLabel(item.targetType)} · {item.subtitle}</small></span>
                </button>
                <button type="button" className="bo1187-favorite-remove" onClick={() => toggleFavoriteTarget(item)} aria-label="Remover dos favoritos" title="Remover dos favoritos"><X size={13} /></button>
              </article>
            ))}
          </div>
        ) : <p>Você ainda não adicionou nenhum favorito.</p>}
        {pinnedItems.length > 0 && <small className="bo1187-pins-note"><Pin size={12} />{pinnedItems.length} {pinnedItems.length === 1 ? 'item fixado permanece priorizado' : 'itens fixados permanecem priorizados'} no seu workspace.</small>}
      </section>

      <section className="bo1187-learn" aria-labelledby="bo1187-learn-title">
        <h2 id="bo1187-learn-title"><GraduationCap size={18} />Aprender</h2>
        <div className="bo1187-learn-grid">
          {learnCards.map((card) => (
            <button type="button" key={card.label} onClick={card.action}>
              <span className={`bo1187-learn-icon ${card.tone}`}>{card.icon}</span>
              <span><strong>{card.label}</strong><small>{'helper' in card ? card.helper : 'Ler agora'}</small></span>
              <i aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <div className="bo1187-dashboard-footnote">
        <button type="button" onClick={onImport}>Importar projeto</button>
        <span>Service Graph local · Saúde {healthReport.score}/100 · Cobertura estrutural {architectureReport.score}%</span>
      </div>

      {discoveryCreate && <div className="bo1187-overlay bo1195-discovery-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDiscoveryCreate(null); }}>
        <form className="bo1195-discovery-modal" onSubmit={(event) => { event.preventDefault(); submitDiscoveryCreate(); }} role="dialog" aria-modal="true" aria-labelledby="bo1195-discovery-create-title">
          <header><div><span>{discoveryCopy[discoveryCreate].eyebrow}</span><h2 id="bo1195-discovery-create-title">{discoveryCopy[discoveryCreate].title}</h2><p>{discoveryCopy[discoveryCreate].detail}</p></div><button type="button" onClick={() => setDiscoveryCreate(null)} aria-label="Fechar"><X size={18} /></button></header>
          <label><span>Título</span><input autoFocus value={discoveryTitle} onChange={(event) => setDiscoveryTitle(event.target.value)} placeholder={discoveryCopy[discoveryCreate].placeholder} /></label>
          <label><span>Contexto <small>opcional</small></span><textarea rows={4} value={discoveryDetail} onChange={(event) => setDiscoveryDetail(event.target.value)} placeholder={discoveryCopy[discoveryCreate].helper} /></label>
          <label><span>Relacionar com <small>opcional</small></span><select value={discoveryRelatedId} onChange={(event) => setDiscoveryRelatedId(event.target.value)}><option value="">Sem relação por enquanto</option>{discoveryRelations.map((item) => <option key={`${item.kind}-${item.id}`} value={item.id}>{discoveryLabel[item.kind]} · {item.title}</option>)}</select></label>
          {discoveryCreate === 'evidence' && <label><span>Confiança da evidência</span><select value={discoveryConfidence} onChange={(event) => setDiscoveryConfidence(event.target.value as 'low' | 'medium' | 'high')}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label>}
          <footer><button type="button" onClick={() => setDiscoveryCreate(null)}>Cancelar</button><button type="submit" className="primary" disabled={!discoveryTitle.trim()}>Adicionar ao contexto</button></footer>
        </form>
      </div>}

      {personaDeleteConfirm && selectedPersonaEntity && <div className="bo1187-overlay bo1199-delete-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPersonaDeleteConfirm(false); }}>
        <section className="bo1187-dialog bo1199-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="bo1199-delete-persona-title">
          <header><div><span>Persona Studio</span><h2 id="bo1199-delete-persona-title">Remover Persona?</h2><p>A Persona será removida do Service Graph. Necessidades, Jobs, dores, hipóteses e evidências continuam preservados; apenas as relações com esta Persona serão limpas.</p></div><button type="button" aria-label="Fechar" onClick={() => setPersonaDeleteConfirm(false)}><X size={18} /></button></header>
          <div className="bo1199-delete-summary"><span>PERSONA</span><strong>{String(selectedPersonaEntity.title ?? selectedPersonaEntity.name ?? 'Sem título')}</strong><small>{personaStudioReport?.connections.length ?? 0} relação(ões) serão desvinculadas.</small></div>
          <footer><button type="button" onClick={() => setPersonaDeleteConfirm(false)}>Cancelar</button><button type="button" className="danger" onClick={deletePersonaStudio}>Remover Persona</button></footer>
        </section>
      </div>}

      {showAllRecents && <div className="bo1187-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAllRecents(false); }}>
        <section className="bo1187-dialog bo1187-recents-dialog" role="dialog" aria-modal="true" aria-labelledby="bo1187-all-recents-title">
          <header><div><span>Histórico</span><h2 id="bo1187-all-recents-title">Todos os recentes</h2><p>Últimos contextos deste usuário, sem misturar favoritos ou itens fixados.</p></div><button type="button" aria-label="Fechar" onClick={() => setShowAllRecents(false)}><X size={18} /></button></header>
          <div className="bo1187-all-recents-list">{recentItems.length ? recentItems.slice(0, 30).map((item, index) => <article key={`all-${item.targetType}-${item.targetId}`}><PreviewArt target={item} index={index} journeyCoverImage={item.targetType === 'journey' ? journeyCoverSrc(graph.journeys[item.targetId]) : undefined} /><button type="button" onClick={() => { setShowAllRecents(false); openTarget(item); }}><span>{targetLabel(item.targetType)}</span><strong>{item.title}</strong><small>{item.subtitle} · {fmtRelative(recentTimestamp(item))}</small></button><button type="button" className={isFavorite(item) ? 'active' : ''} onClick={() => toggleFavoriteTarget(item)} aria-label="Alternar favorito"><Star size={15} fill={isFavorite(item) ? 'currentColor' : 'none'} /></button></article>) : <p>Nenhum histórico disponível.</p>}</div>
        </section>
      </div>}

      {showAttentionDetails && <div className="bo1187-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAttentionDetails(false); }}>
        <section className="bo1187-dialog bo1187-insight-dialog" role="dialog" aria-modal="true" aria-labelledby="bo1187-attention-title">
          <header><div><span>Attention Engine</span><h2 id="bo1187-attention-title">Central de atenção</h2><p>Prioridade determinística por severidade, prazo, ownership e impacto.</p></div><button type="button" aria-label="Fechar" onClick={() => setShowAttentionDetails(false)}><X size={18} /></button></header>
          <div className="bo1187-summary-row"><div><span>Total</span><strong>{attentionReport.summary.total}</strong></div><div><span>Críticos</span><strong>{attentionReport.summary.critical}</strong></div><div><span>Altos</span><strong>{attentionReport.summary.high}</strong></div><div><span>Vencidos</span><strong>{attentionReport.summary.overdue}</strong></div></div>
          <div className="bo1187-insight-list">{attentionReport.items.length ? attentionReport.items.map((item) => (
            <article key={item.id} data-severity={item.severity}>
              <div className="bo1187-attention-main">
                <span>{item.statusLabel} · {item.category} · Prioridade {item.priority}</span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
                <div className="bo1187-attention-context">
                  <p><b>Causa</b><span>{item.cause}</span></p>
                  <p><b>Impacto</b><span>{item.impact}</span></p>
                  <p><b>Owner</b><span>{item.owner || 'Não atribuído'}</span></p>
                  <p><b>Prazo</b><span>{fmtDate(item.dueDate)}</span></p>
                  <p><b>Regra</b><span>{item.ruleId}</span></p>
                  <p><b>Quantidade</b><span>{item.targetCount}</span></p>
                </div>
                <em><b>Ação recomendada</b>{item.recommendation}</em>
              </div>
              <button type="button" onClick={() => actOnAttention(item.actionId)}>{item.actionLabel}<ArrowRight size={13} /></button>
            </article>
          )) : <div className="bo1187-dialog-empty"><CheckCircle2 size={19} /><span>Nenhum alerta prioritário agora.</span></div>}</div>
        </section>
      </div>}

      {showArchitectureDetails && <div className="bo1187-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowArchitectureDetails(false); }}>
        <section className="bo1187-dialog bo1187-insight-dialog" role="dialog" aria-modal="true" aria-labelledby="bo1187-architecture-title">
          <header><div><span>Service Architecture</span><h2 id="bo1187-architecture-title">Arquitetura de {architectureReport.serviceName}</h2><p>Cobertura estrutural não substitui o Service Health. O mapa é derivado do Service Graph.</p></div><button type="button" aria-label="Fechar" onClick={() => setShowArchitectureDetails(false)}><X size={18} /></button></header>
          <div className="bo1187-architecture-score"><div><span>Cobertura estrutural</span><strong>{architectureReport.score}%</strong><small>{architectureReport.label}</small></div><p>{architectureReport.formula}</p></div>
          <div className="bo1187-layer-grid">{architectureReport.layers.map((layer, index) => <article key={layer.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{layer.label}</strong><small>{layer.summary}</small><i><b style={{ width: `${layer.score}%` }} /></i></div><b>{layer.score}%</b><button type="button" onClick={() => actOnArchitecture(layer.actionId)}>{layer.actionLabel}</button></article>)}</div>
          <div className="bo1187-architecture-columns"><section><h3>Fluxo principal</h3>{architectureReport.primaryFlow.length ? <div className="bo1187-flow">{architectureReport.primaryFlow.map((item, index) => <button key={item.id} type="button" onClick={() => architectureReport.primaryJourney && void openJourney(architectureReport.primaryJourney.id)}><i>{index + 1}</i><strong>{item.title}</strong><small>{item.touchpoints} touchpoints · {item.opportunities} oportunidades</small></button>)}</div> : <p>Nenhuma Jornada estruturada.</p>}</section><section><h3>Gaps estruturais</h3>{architectureReport.gaps.length ? architectureReport.gaps.slice(0, 6).map((gap) => <button type="button" className="bo1187-gap" key={gap.id} onClick={() => actOnArchitecture(gap.actionId)}><strong>{gap.label}</strong><small>{gap.detail}</small><span>{gap.actionLabel}<ArrowRight size={12} /></span></button>) : <div className="bo1187-dialog-empty"><CheckCircle2 size={18} /><span>Nenhum gap prioritário.</span></div>}</section></div>
          <section className="bo1187-architecture-journeys">
            <h3>Jornadas conectadas</h3>
            <div>{architectureReport.journeys.length ? architectureReport.journeys.slice(0, 6).map((item) => <button key={item.id} type="button" onClick={() => void openJourney(item.id)}><span><strong>{item.name}</strong><small>{item.stageTitles.join(' → ') || 'Sem etapas nomeadas'}</small></span><b>{item.coverage}%</b></button>) : <p>Nenhuma Jornada conectada.</p>}</div>
          </section>
          <section className="bo1187-architecture-inventory">
            <h3>Objetos conectados</h3>
            <div><span><b>{architectureReport.counts.journeys}</b>Jornadas</span><span><b>{architectureReport.counts.blueprints}</b>Blueprints</span><span><b>{architectureReport.counts.processes}</b>Processos</span><span><b>{architectureReport.counts.systems}</b>Sistemas</span><span><b>{architectureReport.counts.opportunities}</b>Oportunidades</span><span><b>{architectureReport.counts.initiatives}</b>Iniciativas</span><span><b>{architectureReport.counts.metrics}</b>Métricas</span><span><b>{architectureReport.counts.benefits}</b>Benefícios</span></div>
          </section>
        </section>
      </div>}

      {showHealthDetails && <div className="bo1187-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHealthDetails(false); }}>
        <section className="bo1187-dialog bo1187-insight-dialog" role="dialog" aria-modal="true" aria-labelledby="bo1187-health-title">
          <header><div><span>Service Pulse</span><h2 id="bo1187-health-title">Saúde do serviço</h2><p>Nenhuma IA decide esta nota. O diagnóstico é derivado deterministicamente do Service Graph.</p></div><button type="button" aria-label="Fechar" onClick={() => setShowHealthDetails(false)}><X size={18} /></button></header>
          <div className="bo1187-health-hero"><strong>{healthReport.score}<small>/100</small></strong><span>{healthReport.status.label}</span><p>{healthReport.formula}</p></div>
          <div className="bo1187-health-dimensions">{healthReport.dimensions.map((item) => <article key={item.id}><div><strong>{item.label}</strong><b>{item.score}%</b></div><i><b style={{ width: `${item.score}%` }} /></i><small>{item.summary}</small><button type="button" onClick={() => actOnHealthDimension(item.id)}>Agir nesta dimensão<ArrowRight size={12} /></button></article>)}</div>
          <div className="bo1187-health-notes"><section><h3>Pontos fortes</h3>{healthReport.strengths.length ? healthReport.strengths.slice(0, 4).map((item) => <p key={item.id}><CheckCircle2 size={14} /><span><strong>{item.label}</strong><small>{item.detail}</small></span></p>) : <p>Sem dimensão acima do limiar de força.</p>}</section><section><h3>Gaps prioritários</h3>{healthReport.gaps.length ? healthReport.gaps.slice(0, 4).map((item) => <p key={item.id}><Search size={14} /><span><strong>{item.label}</strong><small>{item.detail}</small></span></p>) : <p>Nenhum gap prioritário.</p>}</section></div>
          <section className="bo1187-health-related" aria-label="Journey + Blueprint diagnostics">
            <h3>Journey + Blueprint</h3>
            <div>
              <article><span>Blueprint Health</span><strong>{healthReport.blueprint.score}%</strong><small>{healthReport.blueprint.boardCount} blueprints · {healthReport.blueprint.gaps.length} gaps</small></article>
              {healthReport.journeys.slice(0, 4).map((journey) => <article key={journey.id}><span>Journey Health</span><strong>{journey.score}%</strong><small>{journey.name} · {journey.stageCount} etapas · {journey.gaps.length} gaps</small></article>)}
            </div>
          </section>
        </section>
      </div>}

      <span className="sr-only" aria-hidden="true">Continue Engine top: {continueItem?.title || 'none'} · {healthReport.blueprint.score}% Blueprint Health · {healthReport.journeys.length} Journey Health records.</span>
    </section>
  );
}

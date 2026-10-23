import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import {
  ArrowLeft, Check, Filter, MoreVertical, Plus, Search, Table2, Trash2, UserRound, UsersRound, X,
} from '../design-system/icons';
import type { ServiceGraph } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import { ServiceUsageRelations } from '../components/ServiceUsageRelations';
import { createDiscoveryEntity } from '../services/discovery-workspace';
import { contextEntityTitle, contextEntityUsage, listContextEntities } from '../services/context-library';
import {
  ADVANCED_PERSONA_SECTIONS,
  SIMPLE_PERSONA_SECTIONS,
  buildPersonaStudioReport,
  personaProfileFromEntity,
  personaRelationOptions,
  removePersonaFromGraph,
  updatePersonaProfile,
  type PersonaDepth,
  type PersonaLayout,
  type PersonaProfileDraft,
  type PersonaRelationKind,
  type PersonaSectionId,
} from '../services/persona-studio';


type AutoTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> & { minRows?: number };

function AutoTextarea({ minRows = 2, className = '', ...props }: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.max(element.scrollHeight, minRows * 22)}px`;
  }, [props.value, minRows]);
  return <textarea {...props} ref={ref} rows={minRows} className={`bo-h724-autogrow ${className}`.trim()}/>;
}

type DetailTab = 'overview' | 'behavior' | 'relations' | 'evidence' | 'usage';
type FilterMode = 'all' | 'unused' | 'used' | 'evidence' | 'without-evidence' | 'incomplete';
type LibraryViewMode = 'cards' | 'table';


const personaSectionOptions: Array<{ id: PersonaSectionId; label: string; description: string; recommended?: boolean; advanced?: boolean }> = [
  { id: 'identity', label: 'Nome com resumo', description: 'Nome representativo e uma síntese curta.', recommended: true },
  { id: 'needs', label: 'Necessidades', description: 'O que precisa ser resolvido para esta pessoa.', recommended: true },
  { id: 'goal', label: 'Objetivo principal', description: 'O resultado que ela quer alcançar.', recommended: true },
  { id: 'situation', label: 'Situação / momento', description: 'Em que contexto ou etapa essa persona aparece.', recommended: true },
  { id: 'channels', label: 'Canais', description: 'Onde ela se comunica ou vive a experiência.', recommended: true },
  { id: 'quote', label: 'Citação', description: 'Uma frase que represente sua perspectiva.', recommended: true },
  { id: 'bio', label: 'Bio / contexto', description: 'História e contexto relevantes para o serviço.', advanced: true },
  { id: 'behaviors', label: 'Comportamentos', description: 'Padrões de decisão e ação observáveis.', advanced: true },
  { id: 'expectations', label: 'Expectativas', description: 'O que ela espera da experiência.', advanced: true },
  { id: 'constraints', label: 'Restrições', description: 'Limites, barreiras e condicionantes.', advanced: true },
  { id: 'triggers', label: 'Gatilhos', description: 'Eventos que iniciam uma decisão ou ação.', advanced: true },
  { id: 'alternatives', label: 'Alternativas atuais', description: 'Como resolve o problema hoje.', advanced: true },
  { id: 'evidence', label: 'Evidências', description: 'Dados, entrevistas e observações que sustentam a persona.', recommended: true },
  { id: 'relations', label: 'Relações do Service Graph', description: 'Jobs, dores, hipóteses e outros objetos conectados.', advanced: true },
];

const layoutLabel: Record<PersonaLayout, string> = {
  'profile-left': 'Perfil à esquerda',
  balanced: 'Equilibrado',
  'story-first': 'Narrativa primeiro',
};

const relationLabel: Record<PersonaRelationKind, string> = {
  need: 'Necessidades', job: 'Jobs', pain: 'Dores', problemHypothesis: 'Hipóteses', evidence: 'Evidências',
};

const formatDate = (value: unknown) => {
  const date = new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const stringList = (value: string) => value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);

function patchPersonaMeta(graph: ServiceGraph, personaId: string, owner: string, tags: string[]): ServiceGraph {
  const current = graph.entities?.persona?.[personaId];
  if (!current) return graph;
  const now = new Date().toISOString();
  return {
    ...graph,
    service: { ...graph.service, updatedAt: now },
    entities: {
      ...graph.entities,
      persona: {
        ...(graph.entities?.persona ?? {}),
        [personaId]: { ...current, owner: owner.trim(), tags, updatedAt: now },
      },
    },
  };
}

export function PersonasView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const personas = useMemo(() => listContextEntities(graph, 'persona'), [graph]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<LibraryViewMode>(() => {
    try { return sessionStorage.getItem('bo-personas-library-view') === 'table' ? 'table' : 'cards'; }
    catch { return 'cards'; }
  });
  const changeViewMode = (mode: LibraryViewMode) => {
    setViewMode(mode);
    try { sessionStorage.setItem('bo-personas-library-view', mode); } catch { /* preference is optional */ }
  };
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [draft, setDraft] = useState<PersonaProfileDraft | null>(null);
  const [owner, setOwner] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [tagEntry, setTagEntry] = useState('');
  const [channelEntry, setChannelEntry] = useState('');
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createMode, setCreateMode] = useState<PersonaDepth>('simple');
  const [createLayout, setCreateLayout] = useState<PersonaLayout>('profile-left');
  const [createSections, setCreateSections] = useState<PersonaSectionId[]>([...SIMPLE_PERSONA_SECTIONS]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selected = selectedId ? graph.entities?.persona?.[selectedId] : undefined;
  const report = useMemo(() => selectedId ? buildPersonaStudioReport(graph, selectedId) : null, [graph, selectedId]);
  const previewReport = useMemo(() => {
    if (!selectedId || !draft) return report;
    const previewGraph = updatePersonaProfile({ graph, personaId: selectedId, draft, connectedIds, now: String(selected?.updatedAt ?? graph.service.updatedAt) });
    return buildPersonaStudioReport(previewGraph, selectedId);
  }, [graph, selectedId, draft, connectedIds, report, selected?.updatedAt]);
  const relationOptions = useMemo(() => personaRelationOptions(graph), [graph]);

  useEffect(() => {
    if (!selected || !report) {
      setDraft(null); setOwner(''); setTagsText(''); setConnectedIds([]);
      return;
    }
    setDraft(personaProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setTagEntry(''); setChannelEntry('');
    setConnectedIds(report.connections.map((item) => item.id));
  }, [selectedId, selected?.updatedAt]);

  useEffect(() => {
    const requested = sessionStorage.getItem('bo-workspace-create-page');
    if (requested !== 'personas') return;
    sessionStorage.removeItem('bo-workspace-create-page');
    setCreateOpen(true);
  }, []);


  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; id?: string }>).detail || {};
      if (detail.kind !== 'persona' || !detail.id) return;
      if (!graph.entities?.persona?.[detail.id]) return;
      setSelectedId(detail.id);
      setDetailTab('usage');
    };
    try {
      const raw = sessionStorage.getItem('bo-service-object-focus');
      if (raw) {
        const detail = JSON.parse(raw) as { kind?: string; id?: string };
        if (detail.kind === 'persona' && detail.id && graph.entities?.persona?.[detail.id]) {
          setSelectedId(detail.id); setDetailTab('usage'); sessionStorage.removeItem('bo-service-object-focus');
        }
      }
    } catch { /* optional navigation focus */ }
    window.addEventListener('bo-service-object-focus', focus);
    return () => window.removeEventListener('bo-service-object-focus', focus);
  }, [graph]);

  const rows = useMemo(() => personas.map((persona) => {
    const personaReport = buildPersonaStudioReport(graph, persona.id);
    const usage = contextEntityUsage(graph, 'persona', persona.id);
    const tags = Array.isArray(persona.tags) && persona.tags.length ? persona.tags.map(String).join(', ') : 'Sem tags';
    return {
      persona,
      report: personaReport,
      usage,
      title: contextEntityTitle(persona),
      owner: String(persona.owner || 'Você'),
      tags,
      tagList: Array.isArray(persona.tags) ? persona.tags.map(String).filter(Boolean) : [],
      goal: personaProfileFromEntity(persona).primaryGoal,
    };
  }), [graph, personas]);

  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = `${row.title} ${row.owner} ${row.tags} ${String(row.persona.description ?? '')}`.toLowerCase();
    if (!haystack.includes(query.trim().toLowerCase())) return false;
    if (filter === 'unused') return row.usage.instances === 0 && row.usage.relatedCount === 0;
    if (filter === 'used') return row.usage.instances > 0;
    if (filter === 'evidence') return (row.report?.connectionCounts.evidence ?? 0) > 0;
    if (filter === 'without-evidence') return (row.report?.connectionCounts.evidence ?? 0) === 0;
    if (filter === 'incomplete') return (row.report?.foundationScore ?? 0) < 100;
    return true;
  }), [rows, query, filter]);

  const openPersona = (id: string) => { setSelectedId(id); setDetailTab('overview'); setMenuId(null); };
  const closePersona = () => { setSelectedId(null); setDraft(null); setDetailTab('overview'); };

  const chooseCreateMode = (mode: PersonaDepth) => {
    setCreateMode(mode);
    setCreateSections(mode === 'professional' ? [...ADVANCED_PERSONA_SECTIONS] : [...SIMPLE_PERSONA_SECTIONS]);
  };
  const toggleCreateSection = (section: PersonaSectionId) => {
    if (section === 'identity') return;
    setCreateSections((current) => current.includes(section) ? current.filter((item) => item !== section) : [...current, section]);
  };

  const createPersona = () => {
    if (!createTitle.trim()) return;
    const now = new Date().toISOString();
    const baseEntity = createDiscoveryEntity({ graph, kind: 'persona', title: createTitle, description: createDescription, now });
    const entity = { ...baseEntity, personaMode: createMode, personaLayout: createLayout, personaSections: [...new Set(createSections)] };
    setGraph((current) => ({
      ...current,
      service: { ...current.service, updatedAt: now },
      entities: { ...current.entities, persona: { ...(current.entities?.persona ?? {}), [entity.id]: entity } },
    }), 'Personas 2.0: criar');
    setCreateOpen(false); setCreateTitle(''); setCreateDescription('');
    setCreateMode('simple'); setCreateLayout('profile-left'); setCreateSections([...SIMPLE_PERSONA_SECTIONS]);
    setSelectedId(entity.id); setDetailTab('overview');
    showToast('Persona criada. Complete o perfil e salve.');
  };

  const savePersona = () => {
    if (!selectedId || !draft?.title.trim()) return;
    const pendingChannel = channelEntry.trim().replace(/,$/, '');
    const effectiveDraft = pendingChannel ? { ...draft, channels: [...new Set([...draft.channels, pendingChannel])] } : draft;
    const tags = stringList([tagsText, tagEntry].filter(Boolean).join(','));
    setGraph((current) => patchPersonaMeta(
      updatePersonaProfile({ graph: current, personaId: selectedId, draft: effectiveDraft, connectedIds }),
      selectedId,
      owner,
      tags,
    ), 'Personas 2.0: salvar');
    setDraft(effectiveDraft);
    setTagsText(tags.join(', '));
    setTagEntry(''); setChannelEntry('');
    showToast('Persona salva.');
  };

  const discardPersona = () => {
    if (!selected || !report) return;
    setDraft(personaProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setTagEntry(''); setChannelEntry('');
    setConnectedIds(report.connections.map((item) => item.id));
    showToast('Alterações descartadas.');
  };

  const removePersona = (id: string) => {
    setGraph((current) => removePersonaFromGraph(current, id), 'Personas 2.0: remover');
    if (selectedId === id) closePersona();
    setDeleteId(null); setMenuId(null);
    showToast('Persona removida e relações desvinculadas.');
  };

  const toggleRelation = (id: string) => setConnectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const updateList = (field: 'behaviors' | 'expectations' | 'constraints' | 'triggers' | 'alternatives' | 'channels', value: string) => setDraft((current) => current ? { ...current, [field]: stringList(value) } : current);
  const tagValues = stringList(tagsText);
  const addTag = (raw = tagEntry) => {
    const value = raw.trim().replace(/,$/, '');
    if (!value) return;
    setTagsText([...new Set([...tagValues, value])].join(', '));
    setTagEntry('');
  };
  const removeTag = (value: string) => setTagsText(tagValues.filter((item) => item !== value).join(', '));
  const addChannel = (raw = channelEntry) => {
    const value = raw.trim().replace(/,$/, '');
    if (!value) return;
    setDraft((current) => current ? { ...current, channels: [...new Set([...current.channels, value])] } : current);
    setChannelEntry('');
  };
  const removeChannel = (value: string) => setDraft((current) => current ? { ...current, channels: current.channels.filter((item) => item !== value) } : current);
  const ownerSuggestions = [...new Set(personas.map((persona) => String(persona.owner ?? '')).filter(Boolean))];
  const suggestedChannels = ['WhatsApp', 'E-mail', 'Instagram', 'Site', 'Telefone', 'Presencial'];

  if (selected && draft && report) {
    const evidenceConnections = relationOptions.filter((item) => item.kind === 'evidence' && connectedIds.includes(item.id));
    const usage = contextEntityUsage(graph, 'persona', selected.id);
    const completeness = draft.mode === 'professional' ? (previewReport?.professionalScore ?? report.professionalScore) : (previewReport?.foundationScore ?? report.foundationScore);
    const savedDraft = personaProfileFromEntity(selected);
    const savedConnectedIds = report.connections.map((item) => item.id).sort();
    const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft)
      || owner !== String(selected.owner ?? '')
      || tagsText !== (Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '')
      || Boolean(tagEntry.trim()) || Boolean(channelEntry.trim())
      || JSON.stringify([...connectedIds].sort()) !== JSON.stringify(savedConnectedIds);
    const visibleTags = tagValues.slice(0, 3);
    return <section className={`bo-h71-persona-detail bo-h713-layout-${draft.layout}`} data-personas-h71="detail">
      <header className="bo-h71-detail-head bo-h724-detail-head">
        <button type="button" className="bo-h71-back" onClick={closePersona}><ArrowLeft size={16}/> Personas</button>
        <div className="bo-h71-detail-title bo-h724-detail-title"><span className="bo-h71-avatar bo-h724-avatar"><UserRound size={20}/></span><div><small>PERSONA</small><h1>{draft.title || 'Sem título'}</h1><p>{draft.description || 'Complete o perfil para documentar quem vive essa experiência.'}</p><div className="bo-h724-persona-meta"><span className="mode">{draft.mode === 'professional' ? 'Persona avançada' : 'Persona simples'}</span>{visibleTags.map((tag) => <span key={tag}>{tag}</span>)}{tagValues.length > visibleTags.length && <span>+{tagValues.length - visibleTags.length}</span>}</div></div></div>
        <div className="bo-h724-detail-tools"><span className={isDirty ? 'bo-h724-save-badge is-dirty' : 'bo-h724-save-badge is-saved'}>{isDirty ? 'Alterações pendentes' : 'Tudo salvo'}</span><div className="bo-h724-detail-menu"><button type="button" aria-label="Mais ações" onClick={() => setMenuId(menuId === selected.id ? null : selected.id)}><MoreVertical size={17}/></button>{menuId === selected.id && <div><button type="button" className="danger" onClick={() => { setMenuId(null); setDeleteId(selected.id); }}><Trash2 size={13}/> Remover persona</button></div>}</div></div>
      </header>

      <nav className="bo-h71-detail-tabs" aria-label="Detalhes da Persona">
        {([
          ['overview', 'Visão geral'], ...(draft.mode === 'professional' ? [['behavior', 'Comportamento'] as [DetailTab, string]] : []), ['relations', 'Relações'], ['evidence', 'Evidências'], ['usage', 'Uso'],
        ] as Array<[DetailTab, string]>).map(([id, label]) => <button key={id} type="button" className={detailTab === id ? 'is-active' : ''} onClick={() => setDetailTab(id)}>{label}{id === 'relations' && <b>{connectedIds.length}</b>}{id === 'evidence' && <b>{evidenceConnections.length}</b>}</button>)}
      </nav>

      <div className="bo-h71-detail-body">
        {detailTab === 'overview' && <div className="bo-h724-overview-layout">
          <main className="bo-h724-overview-main">
            <section className="bo-h71-editor-card bo-h724-identity-card">
              <header><div><small>IDENTIDADE</small><strong>Quem é essa persona?</strong><p>Registre apenas o contexto necessário para reconhecer a pessoa e orientar decisões.</p></div><div className="bo-h71-depth-switch bo-h724-depth-switch"><button type="button" className={draft.mode === 'simple' ? 'is-active' : ''} onClick={() => setDraft({ ...draft, mode: 'simple', sections: [...SIMPLE_PERSONA_SECTIONS] })}><strong>Simples</strong><small>Essencial</small></button><button type="button" className={draft.mode === 'professional' ? 'is-active' : ''} onClick={() => setDraft({ ...draft, mode: 'professional', sections: [...ADVANCED_PERSONA_SECTIONS] })}><strong>Avançada</strong><small>Pesquisa profunda</small></button></div></header>
              <div className="bo-h724-form-grid">
                <label className="bo-h724-field bo-h724-field--wide"><span>Nome da Persona</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Profissionais que moram sozinhos"/></label>
                <label className="bo-h724-field bo-h724-field--wide"><span>Resumo <small>curto e observável</small></span><AutoTextarea minRows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Quem é essa pessoa e o que a caracteriza neste serviço?"/></label>
                {draft.sections.includes('bio') && <label className="bo-h724-field bo-h724-field--wide"><span>Bio / contexto</span><AutoTextarea minRows={2} value={draft.context} onChange={(event) => setDraft({ ...draft, context: event.target.value })} placeholder="Contexto relevante, sem transformar em biografia extensa."/></label>}
                {draft.sections.includes('goal') && <label className="bo-h724-field"><span>Objetivo principal</span><AutoTextarea minRows={2} value={draft.primaryGoal} onChange={(event) => setDraft({ ...draft, primaryGoal: event.target.value })} placeholder="O que ela precisa alcançar?"/></label>}
                {draft.sections.includes('situation') && <label className="bo-h724-field"><span>Situação / momento</span><AutoTextarea minRows={2} value={draft.situation} onChange={(event) => setDraft({ ...draft, situation: event.target.value })} placeholder="Quando essa necessidade ou comportamento aparece?"/></label>}
                {draft.sections.includes('quote') && <label className="bo-h724-field bo-h724-field--wide bo-h724-quote-field"><span>Frase representativa</span><AutoTextarea minRows={2} value={draft.quote} onChange={(event) => setDraft({ ...draft, quote: event.target.value })} placeholder="“Uma frase curta que represente sua perspectiva.”"/></label>}
                {draft.mode === 'simple' && draft.sections.includes('channels') && <div className="bo-h724-field bo-h724-field--wide"><span>Canais / ambientes</span><div className="bo-h724-chip-editor">{draft.channels.map((channel) => <button key={channel} type="button" className="bo-h724-chip" onClick={() => removeChannel(channel)}>{channel}<X size={11}/></button>)}<input value={channelEntry} onChange={(event) => setChannelEntry(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addChannel(); } }} placeholder={draft.channels.length ? 'Adicionar canal…' : 'Ex.: WhatsApp'}/></div><div className="bo-h724-suggestions">{suggestedChannels.filter((channel) => !draft.channels.includes(channel)).slice(0, 5).map((channel) => <button key={channel} type="button" onClick={() => addChannel(channel)}>+ {channel}</button>)}</div></div>}
              </div>
            </section>
          </main>
          <aside className="bo-h724-overview-aside">
            <section className="bo-h724-completeness-card"><header><div><small>COMPLETUDE</small><strong>{completeness}%</strong></div><span>{draft.mode === 'professional' ? 'Avançada' : 'Simples'}</span></header><i><b style={{ width: `${completeness}%` }}/></i><div className="bo-h71-check-list bo-h724-check-list">{(previewReport?.foundationChecks ?? report.foundationChecks).map((check) => <div key={check.id} className={check.complete ? 'is-done' : ''}><b>{check.complete ? <Check size={12}/> : '—'}</b><span>{check.label}</span></div>)}</div></section>
            <section className="bo-h724-organization-card"><header><small>ORGANIZAÇÃO</small><strong>Responsabilidade e tags</strong></header><label><span>Responsável</span><div className="bo-h724-owner-field"><UserRound size={14}/><input list="bo-h724-owner-options" value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Nome ou papel"/></div><datalist id="bo-h724-owner-options">{ownerSuggestions.map((item) => <option key={item} value={item}/>)}</datalist></label><div className="bo-h724-tags-field"><span>Tags</span><div className="bo-h724-chip-editor">{tagValues.map((tag) => <button key={tag} type="button" className="bo-h724-chip" onClick={() => removeTag(tag)}>{tag}<X size={11}/></button>)}<input value={tagEntry} onChange={(event) => setTagEntry(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addTag(); } }} placeholder={tagValues.length ? 'Adicionar tag…' : 'Ex.: B2C'}/></div></div></section>
            <section className="bo-h724-context-card"><small>BASE ATUAL</small><strong>{connectedIds.length} conexões</strong><p>{evidenceConnections.length} evidência(s) · {usage.instances} instância(s) visual(is)</p><button type="button" onClick={() => setDetailTab('relations')}>Ver relações</button></section>
          </aside>
        </div>}

        {detailTab === 'behavior' && <div className="bo-h71-editor-grid"><section className="bo-h71-editor-card bo-h71-editor-card--wide"><header><div><small>COMPORTAMENTO</small><strong>Como essa pessoa decide e age?</strong></div><span>{previewReport?.professionalScore ?? report.professionalScore}% profissional</span></header><div className="bo-h71-form two-col">{draft.sections.includes('behaviors') && <label><span>Comportamentos <small>um por linha</small></span><textarea rows={6} value={draft.behaviors.join('\n')} onChange={(event) => updateList('behaviors', event.target.value)}/></label>}{draft.sections.includes('expectations') && <label><span>Expectativas</span><textarea rows={6} value={draft.expectations.join('\n')} onChange={(event) => updateList('expectations', event.target.value)}/></label>}{draft.sections.includes('constraints') && <label><span>Restrições</span><textarea rows={6} value={draft.constraints.join('\n')} onChange={(event) => updateList('constraints', event.target.value)}/></label>}{draft.sections.includes('triggers') && <label><span>Gatilhos</span><textarea rows={6} value={draft.triggers.join('\n')} onChange={(event) => updateList('triggers', event.target.value)}/></label>}{draft.sections.includes('alternatives') && <label><span>Alternativas atuais</span><textarea rows={6} value={draft.alternatives.join('\n')} onChange={(event) => updateList('alternatives', event.target.value)}/></label>}{draft.sections.includes('channels') && <label><span>Canais / ambientes</span><textarea rows={6} value={draft.channels.join('\n')} onChange={(event) => updateList('channels', event.target.value)}/></label>}</div></section></div>}

        {detailTab === 'relations' && <div className="bo-h71-relations"><div className="bo-h71-section-intro"><div><small>SERVICE GRAPH</small><h2>Contexto conectado à Persona</h2><p>As relações abaixo são canônicas: a mesma necessidade, Job, dor ou hipótese pode aparecer em Journey, Blueprint e Whiteboard sem ser duplicada.</p></div><strong>{connectedIds.length} conexões</strong></div><div className="bo-h71-relation-grid">{(['need', 'job', 'pain', 'problemHypothesis'] as PersonaRelationKind[]).map((kind) => { const options = relationOptions.filter((item) => item.kind === kind); return <section key={kind}><header><strong>{relationLabel[kind]}</strong><span>{options.filter((item) => connectedIds.includes(item.id)).length}/{options.length}</span></header>{options.length ? <div>{options.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={12}/> : <Plus size={12}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <p>Nenhum item criado ainda.</p>}</section>; })}</div></div>}

        {detailTab === 'evidence' && <div className="bo-h71-evidence"><div className="bo-h71-section-intro"><div><small>EVIDÊNCIAS</small><h2>O que sustenta essa persona?</h2><p>Conecte somente evidências que realmente ajudam a explicar contexto, comportamento ou necessidades.</p></div><strong>{evidenceConnections.length} conectada(s)</strong></div>{relationOptions.filter((item) => item.kind === 'evidence').length ? <div className="bo-h71-evidence-list">{relationOptions.filter((item) => item.kind === 'evidence').map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span><em>{item.confidence === 'high' ? 'Alta confiança' : item.confidence === 'low' ? 'Baixa confiança' : 'Média confiança'}</em></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma evidência criada</strong><p>Crie evidências na aba Evidências e depois conecte-as aqui.</p></div>}</div>}

        {detailTab === 'usage' && <ServiceUsageRelations graph={graph} kind="persona" id={selected.id} title="Uso e relações" />}
      </div>

      <footer className="bo-h71-detail-actions bo-h724-detail-actions"><div className="bo-h724-save-state"><b className={isDirty ? 'is-dirty' : 'is-saved'}/><span>{isDirty ? 'Alterações ainda não salvas' : 'Todas as alterações estão salvas'}</span></div><span/><button type="button" disabled={!isDirty} onClick={discardPersona}>Descartar</button><button type="button" className="primary" disabled={!draft.title.trim() || !isDirty} onClick={savePersona}>Salvar alterações</button></footer>

      {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER PERSONA</small><h2>Remover “{contextEntityTitle(graph.entities?.persona?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações com Necessidades, Jobs, Dores, Hipóteses e Evidências serão desvinculadas. Esta ação pode ser desfeita pelo histórico da aplicação.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removePersona(deleteId)}>Remover Persona</button></footer></div></div>}
    </section>;
  }

  const hasSearchOrFilter = Boolean(query.trim()) || filter !== 'all';
  const filters: Array<[FilterMode, string]> = [
    ['all', 'Todas'], ['used', 'Em Jornadas ou mapas'], ['unused', 'Não usadas'],
    ['evidence', 'Com evidência'], ['without-evidence', 'Sem evidências'], ['incomplete', 'Base incompleta'],
  ];

  return <section className="bo-h71-personas bo-p1-personas" data-personas-h71="library" data-persona-view={viewMode}>
    <div className="bo-h71-page-head bo-p1-page-head">
      <div><span>Público-alvo /</span><h1>Personas</h1></div>
      <p>Perfis das pessoas que vivem a experiência do serviço.</p>
    </div>
    <div className="bo-h71-toolbar bo-p1-toolbar">
      <div className="bo-p1-toolbar-summary">
        <strong>{filtered.length} {filtered.length === 1 ? 'persona' : 'personas'}</strong>
        <span>{hasSearchOrFilter ? `de ${rows.length} no serviço` : 'neste serviço'}</span>
      </div>
      <div className="bo-p1-toolbar-actions">
        <label className="bo-h71-search bo-p1-search"><Search size={16}/><input aria-label="Buscar personas" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar personas, tags ou responsáveis"/></label>
        <button type="button" className={showFilters || filter !== 'all' ? 'is-active' : ''} onClick={() => setShowFilters((value) => !value)} aria-label="Filtros de personas" aria-expanded={showFilters} aria-controls="bo-p1-filters"><Filter size={16}/><span>Filtros</span>{filter !== 'all' && <b aria-label="Filtro ativo" className="bo-p1-filter-dot"/>}</button>
        <div className="bo-p1-view-toggle" role="group" aria-label="Visualização de personas">
          <button type="button" className={viewMode === 'cards' ? 'is-active' : ''} aria-pressed={viewMode === 'cards'} onClick={() => changeViewMode('cards')}><UsersRound size={16}/><span>Cartões</span></button>
          <button type="button" className={viewMode === 'table' ? 'is-active' : ''} aria-pressed={viewMode === 'table'} onClick={() => changeViewMode('table')}><Table2 size={16}/><span>Tabela</span></button>
        </div>
        <button type="button" className="primary bo-p1-create" onClick={() => setCreateOpen(true)}><Plus size={16}/> Nova Persona</button>
      </div>
    </div>
    {showFilters && <div id="bo-p1-filters" className="bo-h71-filters bo-p1-filters" role="group" aria-label="Filtrar personas"><span>Mostrar</span>{filters.map(([id, label]) => <button key={id} type="button" className={filter === id ? 'is-active' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>}
    {filtered.length > 0 && viewMode === 'cards' && <div className="bo-p1-card-grid" data-persona-card-grid="1">
      {filtered.map((row) => {
        const evidenceCount = row.report?.connectionCounts.evidence ?? 0;
        const contextUsage = row.usage.instances ?? 0;
        const snippet = String(row.persona.description || '').trim();
        return <article className="bo-p1-card" data-persona-card={row.persona.id} key={row.persona.id}>
          <div className="bo-p1-card-head">
            <span className="bo-p1-avatar" aria-hidden="true"><UserRound size={19}/></span>
            <span className="bo-p1-kind">{personaProfileFromEntity(row.persona).mode === 'professional' ? 'Avançada' : 'Simples'}</span>
            <div className="bo-p1-card-menu">
              <button type="button" aria-label={`Ações da persona ${row.title}`} aria-expanded={menuId === row.persona.id} onClick={() => setMenuId(menuId === row.persona.id ? null : row.persona.id)}><MoreVertical size={17}/></button>
              {menuId === row.persona.id && <div className="bo-h71-row-menu"><button type="button" onClick={() => openPersona(row.persona.id)}>Abrir</button><button type="button" className="danger" onClick={() => { setMenuId(null); setDeleteId(row.persona.id); }}>Remover</button></div>}
            </div>
          </div>
          <button type="button" className="bo-p1-card-title" onClick={() => openPersona(row.persona.id)}>{row.title}</button>
          <p className="bo-p1-card-desc">{snippet || 'Adicione um resumo para identificar melhor esta persona.'}</p>
          {row.goal && <p className="bo-p1-card-goal"><strong>Objetivo</strong><span>{row.goal}</span></p>}
          <div className="bo-p1-card-tags">{row.tagList.slice(0,3).map((tag) => <span key={tag}>{tag}</span>)}{row.tagList.length > 3 && <span>+{row.tagList.length - 3}</span>}</div>
          <div className="bo-p1-card-bottom">
            <div className="bo-p1-card-metrics" aria-label="Conexões e evidências"><span><strong>{evidenceCount}</strong> {evidenceCount === 1 ? 'evidência' : 'evidências'}</span><span><strong>{contextUsage}</strong> {contextUsage === 1 ? 'uso visual' : 'usos visuais'}</span></div>
            <button type="button" className="bo-p1-card-open" onClick={() => openPersona(row.persona.id)}>Abrir Persona <span aria-hidden="true">→</span></button>
          </div>
        </article>;
      })}
    </div>}
    {filtered.length > 0 && viewMode === 'table' && <div className="bo-h71-table-wrap bo-p1-table-wrap" data-persona-table="1">
      <table className="bo-h71-table bo-p1-table"><thead><tr><th>PERSONA</th><th>RESPONSÁVEL</th><th>EVIDÊNCIAS</th><th>USO EM MAPAS</th><th>ATUALIZADO</th><th>AÇÕES</th></tr></thead>
      <tbody>{filtered.map((row) => <tr key={row.persona.id}>
        <td><button type="button" className="bo-h71-persona-name" onClick={() => openPersona(row.persona.id)}><span><UserRound size={14}/></span><strong>{row.title}</strong></button><small className="bo-p1-table-hint">{String(row.persona.description || '').trim() || 'Sem resumo'}</small></td>
        <td>{row.owner}</td><td>{row.report?.connectionCounts.evidence ?? 0}</td><td>{row.usage.instances ?? 0}</td><td>{formatDate(row.persona.updatedAt ?? row.persona.createdAt)}</td>
        <td className="menu-cell"><button type="button" aria-label={`Ações da persona ${row.title}`} aria-expanded={menuId === row.persona.id} onClick={() => setMenuId(menuId === row.persona.id ? null : row.persona.id)}><MoreVertical size={15}/></button>{menuId === row.persona.id && <div className="bo-h71-row-menu"><button type="button" onClick={() => openPersona(row.persona.id)}>Abrir</button><button type="button" className="danger" onClick={() => { setMenuId(null); setDeleteId(row.persona.id); }}>Remover</button></div>}</td>
      </tr>)}</tbody></table>
    </div>}
    {!filtered.length && <div className="bo-h71-empty bo-p1-empty"><UsersRound size={28}/><strong>{hasSearchOrFilter ? 'Nenhuma Persona corresponde à busca' : 'Comece conhecendo seu público-alvo'}</strong><p>{hasSearchOrFilter ? 'Experimente buscar outro termo ou remover os filtros aplicados.' : 'Crie uma Persona para documentar objetivos, necessidades e evidências ligadas ao serviço.'}</p>
      {hasSearchOrFilter ? <button type="button" onClick={() => { setQuery(''); setFilter('all'); }}>Limpar busca e filtros</button> : <button type="button" onClick={() => setCreateOpen(true)}><Plus size={14}/> Criar persona</button>}
    </div>}

    {createOpen && <div className="bo-h71-modal-backdrop bo-h713-builder-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><form className="bo-h713-persona-builder" onSubmit={(event) => { event.preventDefault(); createPersona(); }}>
      <header><div><small>PERSONAS · BLUE OCEAN</small><h2>Personalizar Persona</h2><p>Escolha a profundidade, o layout e os blocos que fazem sentido para este serviço.</p></div><button type="button" onClick={() => setCreateOpen(false)}><X size={18}/></button></header>
      <div className="bo-h713-builder-body">
        <section className="bo-h713-builder-top">
          <label><span>Nome</span><input autoFocus value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder="Ex.: Profissional que mora sozinho"/></label>
          <div className="bo-h713-depth"><span>Profundidade</span><div><button type="button" className={createMode === 'simple' ? 'is-active' : ''} onClick={() => chooseCreateMode('simple')}><strong>Simples</strong><small>Essencial para começar</small></button><button type="button" className={createMode === 'professional' ? 'is-active' : ''} onClick={() => chooseCreateMode('professional')}><strong>Avançada</strong><small>Pesquisa e decisões profundas</small></button></div></div>
        </section>
        <section className="bo-h713-layouts"><div className="bo-h713-section-title"><span>Layout</span><small>{layoutLabel[createLayout]}</small></div><div className="bo-h713-layout-options">{(['profile-left','balanced','story-first'] as PersonaLayout[]).map((layout) => <button key={layout} type="button" className={createLayout === layout ? 'is-active' : ''} onClick={() => setCreateLayout(layout)} aria-label={layoutLabel[layout]}><i className={`preview preview--${layout}`}><b/><b/><b/></i><span>{layoutLabel[layout]}</span></button>)}</div></section>
        <section className="bo-h713-blocks"><div className="bo-h713-section-title"><span>Blocos da Persona</span><small>{createSections.length} selecionados</small></div><div className="bo-h713-block-grid">{personaSectionOptions.filter((option) => createMode === 'professional' || !option.advanced).map((option) => { const checked = createSections.includes(option.id); return <button key={option.id} type="button" className={checked ? 'is-selected' : ''} onClick={() => toggleCreateSection(option.id)}><b className="bo-h713-check">{checked ? <Check size={13}/> : null}</b><span><strong>{option.label}</strong>{option.recommended && <em>Recomendado</em>}<small>{option.description}</small></span></button>; })}</div></section>
        <label className="bo-h713-summary"><span>Resumo <small>opcional</small></span><textarea rows={3} value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} placeholder="Quem é essa pessoa e por que ela importa para o serviço?"/></label>
      </div>
      <footer><div><strong>{createMode === 'professional' ? 'Persona Avançada' : 'Persona Simples'}</strong><span>{layoutLabel[createLayout]} · {createSections.length} blocos</span></div><button type="button" onClick={() => setCreateOpen(false)}>Cancelar</button><button type="submit" className="primary" disabled={!createTitle.trim()}>Criar Persona</button></footer>
    </form></div>}

    {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER PERSONA</small><h2>Remover “{contextEntityTitle(graph.entities?.persona?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações existentes serão desvinculadas do Service Graph.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removePersona(deleteId)}>Remover Persona</button></footer></div></div>}
  </section>;
}

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Check, Filter, MoreVertical, Plus, Search, Table2, Trash2, UserRound, UsersRound, X,
} from '../design-system/icons';
import type { ServiceGraph } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import { ServiceUsageRelations } from '../components/ServiceUsageRelations';
import { PersonaVisualEditor } from './PersonaVisualEditor';
import { QuickEntityCreateDialog } from '../components/QuickEntityCreateDialog';
import './persona-inline.css';
import { PersonaEvidenceTrace } from './PersonaEvidenceTrace';
import { createDiscoveryEntity } from '../services/discovery-workspace';
import { contextEntityTitle, contextEntityUsage, listContextEntities } from '../services/context-library';
import {
  SIMPLE_PERSONA_SECTIONS,
  visiblePersonaSections,
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


type DetailTab = 'overview' | 'behavior' | 'decisions' | 'barriers' | 'relations' | 'evidence' | 'usage';
type FilterMode = 'all' | 'unused' | 'used' | 'evidence' | 'without-evidence' | 'incomplete';
type LibraryViewMode = 'cards' | 'table';
type PersonaFilterField = 'title' | 'owner' | 'mode' | 'tags' | 'evidence' | 'usage' | 'completeness';
type PersonaFilterOperator = 'contains' | 'equals' | 'gte' | 'lte' | 'empty';
type PersonaFilterRule = { id: string; field: PersonaFilterField; operator: PersonaFilterOperator; value: string };
type PersonaSort = 'title' | 'recent' | 'evidence' | 'usage' | 'completeness';
type PersonaColumn = 'owner' | 'evidence' | 'usage' | 'updated';
type PersonaSavedView = { id: string; name: string; query: string; filter: FilterMode; rules: PersonaFilterRule[]; logic: 'all' | 'any'; mode: LibraryViewMode; sort: PersonaSort; columns: PersonaColumn[] };
const PERSONA_COLUMNS: PersonaColumn[] = ['owner','evidence','usage','updated'];
const PERSONA_FIELDS: Array<{ id: PersonaFilterField; label: string; numeric?: boolean }> = [
  { id:'title',label:'Nome' },{ id:'owner',label:'Responsável' },{ id:'mode',label:'Perfil' },
  { id:'tags',label:'Tags' },{ id:'evidence',label:'Evidências',numeric:true },
  { id:'usage',label:'Utilização em mapas',numeric:true },{ id:'completeness',label:'Completude',numeric:true },
];
const personaRule = (): PersonaFilterRule => ({ id: String(Date.now())+'-'+Math.random().toString(36).slice(2,7),field:'evidence',operator:'equals',value:'0' });
const validatePersonaRules = (input: unknown): PersonaFilterRule[] => !Array.isArray(input) ? [] : input.slice(0,8).filter((x):x is PersonaFilterRule =>
  Boolean(x && typeof x === 'object' && typeof x.id === 'string' && PERSONA_FIELDS.some(f=>f.id===x.field)
   && ['contains','equals','gte','lte','empty'].includes(x.operator) && typeof x.value === 'string')
 ).map(x=>({...x,value:x.value.slice(0,150)}));



const personaCustomSections: Array<{id:PersonaSectionId;label:string}> = [
 {id:'identity',label:'Identificação'},{id:'bio',label:'Contexto'},{id:'goal',label:'Objetivos'},{id:'needs',label:'Necessidades'},
 {id:'situation',label:'Situação'},{id:'quote',label:'Citação'},{id:'channels',label:'Canais'},
 {id:'behaviors',label:'Comportamentos'},{id:'expectations',label:'Expectativas'},{id:'constraints',label:'Restrições'},
 {id:'triggers',label:'Gatilhos'},{id:'alternatives',label:'Alternativas'},{id:'evidence',label:'Evidências'},{id:'relations',label:'Relações'},
];
const layoutLabels: Array<[PersonaLayout,string]> = [['profile-left','Perfil à esquerda'],['balanced','Equilibrado'],['story-first','Narrativa primeiro']];
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
  const [filterRules, setFilterRules] = useState<PersonaFilterRule[]>([]);
  const [ruleLogic, setRuleLogic] = useState<'all' | 'any'>('all');
  const [draftRules, setDraftRules] = useState<PersonaFilterRule[]>([]);
  const [draftLogic, setDraftLogic] = useState<'all' | 'any'>('all');
  const [draftQuickFilter, setDraftQuickFilter] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<PersonaSort>('title');
  const [visibleColumns, setVisibleColumns] = useState<PersonaColumn[]>([...PERSONA_COLUMNS]);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [savedViews, setSavedViews] = useState<PersonaSavedView[]>([]);
  const serviceViewKey = 'bo-persona-saved-views-v1:'+String(graph.service.id);
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(serviceViewKey) || '[]') as unknown;
      if (!Array.isArray(value)) { setSavedViews([]); return; }
      setSavedViews(value.slice(0,30).filter((view):view is PersonaSavedView =>
        Boolean(view && typeof view==='object' && typeof view.id==='string' && typeof view.name==='string' && view.name.trim())
      ).map((view)=>({...view,rules:validatePersonaRules(view.rules),columns:PERSONA_COLUMNS.filter(c=>Array.isArray(view.columns)&&view.columns.includes(c))})));
    } catch { setSavedViews([]); }
  }, [serviceViewKey]);
  const persistSavedViews = (next: PersonaSavedView[]) => {
    setSavedViews(next);
    try { localStorage.setItem(serviceViewKey,JSON.stringify(next)); }
    catch { showToast('Sem espaço local para salvar esta visualização.'); }
  };
  const openFilters = () => {
    setDraftRules(filterRules.map(rule=>({...rule})));
    setDraftLogic(ruleLogic);
    setDraftQuickFilter(filter);
    setShowFilters(true);
    setDisplayOpen(false);
    setSavedViewsOpen(false);
  };

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
  const [showDetailCustomize, setShowDetailCustomize] = useState(false);
  const [draft, setDraft] = useState<PersonaProfileDraft | null>(null);
  const [owner, setOwner] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [tagEntry, setTagEntry] = useState('');
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
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
    setTagEntry('');
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
    const haystack = `${row.title} ${row.owner} ${row.tags} ${String(row.persona.description ?? '')}`.toLocaleLowerCase('pt-BR');
    if (!haystack.includes(query.trim().toLocaleLowerCase('pt-BR'))) return false;
    if (filter === 'unused' && !(row.usage.instances === 0 && row.usage.relatedCount === 0)) return false;
    if (filter === 'used' && row.usage.instances === 0) return false;
    if (filter === 'evidence' && (row.report?.connectionCounts.evidence ?? 0) === 0) return false;
    if (filter === 'without-evidence' && (row.report?.connectionCounts.evidence ?? 0) > 0) return false;
    if (filter === 'incomplete' && (row.report?.foundationScore ?? 0) >= 100) return false;
    const matches = (rule: PersonaFilterRule) => {
      const source: Record<PersonaFilterField, string | number> = {
        title:row.title,owner:row.owner,mode:personaProfileFromEntity(row.persona).mode,
        tags:row.tags,evidence:row.report?.connectionCounts.evidence ?? 0,
        usage:row.usage.instances ?? 0,completeness:row.report?.foundationScore ?? 0,
      };
      const current=source[rule.field], target=rule.value.trim();
      if (rule.operator==='empty') return typeof current==='number' ? current===0 : !current.trim();
      if (typeof current==='number') {
        if (!target || !Number.isFinite(Number(target))) return false;
        const n=Number(target);
        return rule.operator==='gte' ? current>=n : rule.operator==='lte' ? current<=n : current===n;
      }
      const a=current.toLocaleLowerCase('pt-BR'),b=target.toLocaleLowerCase('pt-BR');
      if (rule.operator==='contains') return a.includes(b);
      return a===b;
    };
    return !filterRules.length || (ruleLogic==='all' ? filterRules.every(matches) : filterRules.some(matches));
  }).sort((a,b)=>{
    if(sortMode==='recent') return new Date(String(b.persona.updatedAt??b.persona.createdAt)).getTime()-new Date(String(a.persona.updatedAt??a.persona.createdAt)).getTime();
    if(sortMode==='evidence') return (b.report?.connectionCounts.evidence??0)-(a.report?.connectionCounts.evidence??0);
    if(sortMode==='usage') return b.usage.instances-a.usage.instances;
    if(sortMode==='completeness') return (b.report?.foundationScore??0)-(a.report?.foundationScore??0);
    return a.title.localeCompare(b.title,'pt-BR');
  }),[rows,query,filter,filterRules,ruleLogic,sortMode]);

  const saveCurrentView = () => {
    const name=newViewName.trim().slice(0,60);
    if (!name) { showToast('Informe um nome para salvar a visualização.'); return; }
    const view:PersonaSavedView={id:String(Date.now()),name,query,filter,rules:filterRules.map(x=>({...x})),
      logic:ruleLogic,mode:viewMode,sort:sortMode,columns:[...visibleColumns]};
    persistSavedViews([...savedViews.filter(v=>v.name.toLocaleLowerCase('pt-BR')!==name.toLocaleLowerCase('pt-BR')),view].slice(-30));
    setNewViewName('');setSavedViewsOpen(false);showToast('Visualização salva neste navegador.');
  };
  const applySavedView = (view:PersonaSavedView) => {
    setQuery(view.query||'');setFilter(view.filter||'all');setFilterRules(validatePersonaRules(view.rules));
    setRuleLogic(view.logic==='any'?'any':'all');setSortMode(['recent','evidence','usage','completeness'].includes(view.sort)?view.sort:'title');
    setVisibleColumns(PERSONA_COLUMNS.filter(c=>view.columns.includes(c)));
    changeViewMode(view.mode==='table'?'table':'cards');setSavedViewsOpen(false);
  };

  const openPersona = (id: string) => { setSelectedId(id); setDetailTab('overview'); setShowDetailCustomize(false); setMenuId(null); };
  const closePersona = () => { setSelectedId(null); setDraft(null); setDetailTab('overview'); };

  const createPersona = (title: string, context: string) => {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    const baseEntity = createDiscoveryEntity({ graph, kind: 'persona', title, description: context, now });
    const entity = { ...baseEntity, personaMode: 'simple' as PersonaDepth, personaLayout: 'profile-left' as PersonaLayout,
      personaSections: [...SIMPLE_PERSONA_SECTIONS],
      personaVisualCards: [{id:'identity',width:'full'},{id:'goal',width:'half'},{id:'situation',width:'half'}] };
    setGraph((current) => ({
      ...current,
      service: { ...current.service, updatedAt: now },
      entities: { ...current.entities, persona: { ...(current.entities?.persona ?? {}), [entity.id]: entity } },
    }), 'Personas: criar');
    setCreateOpen(false); setCreateTitle('');
    setSelectedId(entity.id); setDetailTab('overview');
    showToast('Persona criada. Edite diretamente no perfil.');
  };

  const cancelCreate = () => {
    setCreateOpen(false);
    setCreateTitle('');
  };

  // Apply edits to the canonical graph after a quiet typing interval.
  // The existing project-level storage handles local persistence and backups.
  useEffect(() => {
    if (!selectedId || !selected || !draft || !draft.title.trim()) return;
    const saved = personaProfileFromEntity(selected);
    const oldTags = Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '';
    const oldConnections = report?.connections.map(item => item.id).sort() ?? [];
    const changed = JSON.stringify(draft) !== JSON.stringify(saved)
      || owner !== String(selected.owner ?? '')
      || tagsText !== oldTags
      || JSON.stringify([...connectedIds].sort()) !== JSON.stringify(oldConnections);
    if (!changed) return;
    const timer = window.setTimeout(() => {
      const currentTags = stringList(tagsText);
      setGraph((current) => patchPersonaMeta(updatePersonaProfile({
        graph: current, personaId: selectedId, draft, connectedIds,
      }), selectedId, owner, currentTags), 'Persona: autosave');
    }, 850);
    return () => window.clearTimeout(timer);
  }, [selectedId, selected?.updatedAt, draft, owner, tagsText, connectedIds]);

  const activeDetailSections = draft ? visiblePersonaSections(draft) : [];

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
  const ownerSuggestions = [...new Set(personas.map((persona) => String(persona.owner ?? '')).filter(Boolean))];

  if (selected && draft && report) {
    const evidenceConnections = relationOptions.filter((item) => item.kind === 'evidence' && connectedIds.includes(item.id));
    const usage = contextEntityUsage(graph, 'persona', selected.id);
    const completenessReport = previewReport ?? report;
    const completeness = draft.mode === 'professional' ? completenessReport.professionalScore : completenessReport.foundationScore;
    const completenessChecks = draft.mode === 'professional'
      ? [...completenessReport.foundationChecks, ...completenessReport.professionalChecks]
      : completenessReport.foundationChecks;
    const savedDraft = personaProfileFromEntity(selected);
    const savedConnectedIds = report.connections.map((item) => item.id).sort();
    const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft)
      || owner !== String(selected.owner ?? '')
      || tagsText !== (Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '')
      || Boolean(tagEntry.trim())
      || JSON.stringify([...connectedIds].sort()) !== JSON.stringify(savedConnectedIds);
    const visibleTags = tagValues.slice(0, 3);
    return <section className={`bo-h71-persona-detail bo-h713-layout-${draft.layout}`} data-personas-h71="detail">
      <header className="bo-h71-detail-head bo-h724-detail-head">
        <button type="button" className="bo-h71-back" onClick={closePersona}><ArrowLeft size={16}/> Personas</button>
        <div className="bo-h71-detail-title bo-h724-detail-title"><span className="bo-h71-avatar bo-h724-avatar bo-ec-title-avatar">
  {draft.imageUrl ? <img src={draft.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer"/> : <UserRound size={20}/>}
</span><div><small>PERSONA</small><h1><input className="bo-p6-title-input" aria-label="Nome da Persona" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Nome da Persona"/></h1><div className="bo-h724-persona-meta">{visibleTags.map((tag) => <span key={tag}>{tag}</span>)}{tagValues.length > visibleTags.length && <span>+{tagValues.length - visibleTags.length}</span>}</div></div></div>
        <div className="bo-h724-detail-tools"><span className={isDirty ? 'bo-h724-save-badge is-dirty' : 'bo-h724-save-badge is-saved'}>{isDirty ? 'Salvando alterações…' : 'Salvo neste dispositivo'}</span><div className="bo-h724-detail-menu"><button type="button" aria-label="Mais ações" onClick={() => setMenuId(menuId === selected.id ? null : selected.id)}><MoreVertical size={17}/></button>{menuId === selected.id && <div><button type="button" className="danger" onClick={() => { setMenuId(null); setDeleteId(selected.id); }}><Trash2 size={13}/> Remover persona</button></div>}</div></div>
      </header>

      <nav className="bo-h71-detail-tabs" aria-label="Detalhes da Persona">
        {([
          ['overview', 'Visão geral'], ...(draft.mode === 'professional' ? [
              ['behavior', 'Comportamento'], ['decisions', 'Decisões'], ['barriers', 'Barreiras'],
            ] as Array<[DetailTab, string]> : []), ['relations', 'Relações'], ['evidence', 'Evidências'], ['usage', 'Uso'],
        ] as Array<[DetailTab, string]>).map(([id, label]) => <button key={id} type="button" className={detailTab === id ? 'is-active' : ''} onClick={() => setDetailTab(id)}>{label}{id === 'relations' && <b>{connectedIds.length}</b>}{id === 'evidence' && <b>{evidenceConnections.length}</b>}</button>)}
        <button type="button" className="bo-p2-persona-customize-tab" aria-expanded={showDetailCustomize} aria-controls="bo-p2-persona-customize" onClick={()=>setShowDetailCustomize(!showDetailCustomize)}>Personalizar interface</button>
      </nav>
      {showDetailCustomize&&<section id="bo-p2-persona-customize" className="bo-p2-persona-customize" aria-label="Personalizar interface da Persona">
        <div><h2>Como deseja visualizar esta Persona?</h2><p>Altere a apresentação sem apagar informações já preenchidas.</p></div>
        <fieldset><legend>Layout</legend><div className="bo-p2-customize-options">{layoutLabels.map(([id,label])=><button type="button" key={id} aria-pressed={draft.layout===id} onClick={()=>setDraft({...draft,layout:id})}>{label}</button>)}</div></fieldset>
        <fieldset><legend>Blocos do perfil</legend><div className="bo-p2-customize-blocks">{personaCustomSections.filter(item=>draft.mode==='professional'||!['bio','behaviors','expectations','constraints','triggers','alternatives','relations'].includes(item.id)).map(item=><label key={item.id}><input type="checkbox" disabled={item.id==='identity'} checked={activeDetailSections.includes(item.id)} onChange={(e)=>setDraft({...draft,sections:e.target.checked?[...new Set([...draft.sections,item.id])]:draft.sections.filter(x=>x!==item.id)})}/>{item.label}</label>)}</div></fieldset>
        <p className="bo-p2-customize-tip">Os ajustes no perfil são salvos automaticamente neste dispositivo. Ocultar um bloco não exclui seus dados.</p>
      </section>}

      {draft.mode === 'professional' && <div className="bo-p4-advanced-guide" role="status">
        <div><strong>Pesquisa avançada ativada</strong><span>Organize comportamentos, decisões e barreiras em áreas separadas. As informações precisam de evidências para serem validadas.</span></div>
        <button type="button" onClick={() => setDetailTab('behavior')}>Explorar pesquisa avançada <span aria-hidden="true">→</span></button>
      </div>}
      <div className="bo-h71-detail-body">
        {detailTab === 'overview' && <div className="bo-h724-overview-layout">
          <main className="bo-h724-overview-main">
            <PersonaVisualEditor key={selected.id} draft={draft} onChange={setDraft} legacyDefaultCards={!Array.isArray(selected.personaVisualCards)}
              counts={{ need:completenessReport.connectionCounts.need, pain:completenessReport.connectionCounts.pain,
                evidence:evidenceConnections.length, related:connectedIds.length }}
              relationOptions={relationOptions} connectedIds={connectedIds} onToggleRelation={toggleRelation}
              onNavigate={setDetailTab}/>
          </main>
          <aside className="bo-h724-overview-aside bo-p6-aside bo-ec-aside">
            <details className="bo-ec-inspector"><summary>Detalhes do perfil <span>Completude · Responsável</span></summary>
            <section className="bo-p6-progress"><header><small>FORÇA DO PERFIL</small><strong>{completeness}%</strong></header><i><b style={{ width: `${completeness}%` }}/></i>
              <p>A completude mede o preenchimento, não a validação. Evidências continuam necessárias.</p>
              <div className="bo-p6-next-steps">{completenessChecks.filter(check=>!check.complete).slice(0,3).map(check=><button type="button" key={check.id} onClick={()=>{setDetailTab('overview');window.setTimeout(()=>document.querySelector('[data-persona-visual-card="goal"]')?.scrollIntoView({behavior:'smooth',block:'center'}),30)}}>{check.label} <span>→</span></button>)}</div>
            </section>
            <details className="bo-p6-metadata"><summary>Organização e etiquetas</summary><div>
              <label><span>Responsável</span><input list="bo-p6-owner-options" value={owner} onChange={event=>setOwner(event.target.value)} placeholder="Nome ou papel"/></label>
              <datalist id="bo-p6-owner-options">{ownerSuggestions.map(item=><option key={item} value={item}/>)}</datalist>
              <label><span>Tags</span><div className="bo-h724-chip-editor">{tagValues.map(tag=><button key={tag} type="button" className="bo-h724-chip" onClick={()=>removeTag(tag)}>{tag}<X size={11}/></button>)}<input value={tagEntry} onChange={e=>setTagEntry(e.target.value)} onBlur={()=>{if(tagEntry.trim())addTag()}} onKeyDown={e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();addTag()}}} placeholder="Adicionar etiqueta"/></div></label>
              <p>{connectedIds.length} conexões · {evidenceConnections.length} evidências · {usage.instances} usos no serviço</p>
            </div></details>
            </details>
          </aside>
        </div>}

        {draft.mode === 'professional' && detailTab === 'behavior' && <div className="bo-h71-editor-grid">
          <section className="bo-h71-editor-card bo-h71-editor-card--wide bo-p4-research-card">
            <header><div><small>01 / OBSERVAÇÃO</small><strong>Comportamentos e hábitos</strong><p>Registre o que a pessoa faz e em quais situações. Separe observações de suposições.</p></div></header>
            <div className="bo-h71-form two-col">
              {activeDetailSections.includes('behaviors') && <label><span>Comportamentos observados <small>um por linha</small></span><textarea rows={6} value={draft.behaviors.join('\n')} onChange={(event) => updateList('behaviors', event.target.value)} placeholder="Ex.: Consulta preços antes de pedir atendimento"/></label>}
              {activeDetailSections.includes('channels') && <label><span>Canais e ambientes</span><textarea rows={6} value={draft.channels.join('\n')} onChange={(event) => updateList('channels', event.target.value)} placeholder="Ex.: WhatsApp, presencial, site"/></label>}
            </div><p className="bo-p4-research-helper">Comportamentos descrevem ações. Motivações e critérios de escolha ficam em Decisões.</p>
          </section>
        </div>}
        {draft.mode === 'professional' && detailTab === 'decisions' && <div className="bo-h71-editor-grid">
          <section className="bo-h71-editor-card bo-h71-editor-card--wide bo-p4-research-card">
            <header><div><small>02 / DECISÃO</small><strong>Por que escolhe ou abandona uma solução?</strong><p>Explore expectativas, situações que desencadeiam a busca e alternativas já utilizadas.</p></div></header>
            <div className="bo-h71-form two-col">
              {activeDetailSections.includes('expectations') && <label><span>Expectativas e critérios de escolha <small>um por linha</small></span><textarea rows={6} value={draft.expectations.join('\n')} onChange={(event) => updateList('expectations', event.target.value)} placeholder="Ex.: Precisa confiar na previsão do prazo"/></label>}
              {activeDetailSections.includes('triggers') && <label><span>Gatilhos e motivações</span><textarea rows={6} value={draft.triggers.join('\n')} onChange={(event) => updateList('triggers', event.target.value)} placeholder="Ex.: Busca ajuda quando falta tempo"/></label>}
              {activeDetailSections.includes('alternatives') && <label><span>Alternativas atuais</span><textarea rows={6} value={draft.alternatives.join('\n')} onChange={(event) => updateList('alternatives', event.target.value)} placeholder="Ex.: Faz a tarefa sozinho ou contrata outra empresa"/></label>}
            </div>
          </section>
        </div>}
        {draft.mode === 'professional' && detailTab === 'barriers' && <div className="bo-h71-editor-grid">
          <section className="bo-h71-editor-card bo-h71-editor-card--wide bo-p4-research-card">
            <header><div><small>03 / BARREIRAS</small><strong>O que dificulta a experiência?</strong><p>Registre restrições e vincule dores e necessidades sem duplicar esses registros.</p></div></header>
            <div className="bo-h71-form two-col">
              {activeDetailSections.includes('constraints') && <label><span>Restrições e barreiras <small>um por linha</small></span><textarea rows={6} value={draft.constraints.join('\n')} onChange={(event) => updateList('constraints', event.target.value)} placeholder="Ex.: Horários incompatíveis com a rotina"/></label>}
              <div className="bo-p4-related-summary"><strong>Dores e necessidades conectadas</strong><span>{(previewReport?.connectionCounts.pain ?? report.connectionCounts.pain)} dores · {(previewReport?.connectionCounts.need ?? report.connectionCounts.need)} necessidades</span><p>Esses registros são compartilhados com a Jornada e o Blueprint.</p><button type="button" onClick={() => setDetailTab('relations')}>Gerenciar relações →</button></div>
            </div>
          </section>
        </div>}

        {detailTab === 'relations' && <div className="bo-h71-relations"><div className="bo-h71-section-intro"><div><small>SERVICE GRAPH</small><h2>Contexto conectado à Persona</h2><p>As relações abaixo são canônicas: a mesma necessidade, Job, dor ou hipótese pode aparecer em Journey, Blueprint e Whiteboard sem ser duplicada.</p></div><strong>{connectedIds.length} conexões</strong></div><div className="bo-h71-relation-grid">{(['need', 'job', 'pain', 'problemHypothesis'] as PersonaRelationKind[]).map((kind) => { const options = relationOptions.filter((item) => item.kind === kind); return <section key={kind}><header><strong>{relationLabel[kind]}</strong><span>{options.filter((item) => connectedIds.includes(item.id)).length}/{options.length}</span></header>{options.length ? <div>{options.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={12}/> : <Plus size={12}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <p>Nenhum item criado ainda.</p>}</section>; })}</div></div>}

        {detailTab === 'evidence' && <div className="bo-h71-evidence"><div className="bo-h71-section-intro"><div><small>EVIDÊNCIAS</small><h2>O que sustenta essa persona?</h2><p>Conecte somente evidências que realmente ajudam a explicar contexto, comportamento ou necessidades.</p></div><strong>{evidenceConnections.length} conectada(s)</strong></div>{relationOptions.filter((item) => item.kind === 'evidence').length ? <div className="bo-h71-evidence-list">{relationOptions.filter((item) => item.kind === 'evidence').map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span><em>{item.confidence === 'high' ? 'Alta confiança' : item.confidence === 'low' ? 'Baixa confiança' : 'Média confiança'}</em></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma evidência criada</strong><p>Crie evidências na aba Evidências e depois conecte-as aqui.</p></div>}<PersonaEvidenceTrace draft={draft} evidence={relationOptions.filter(item=>item.kind === 'evidence')} onChange={setDraft}/></div>}

        {detailTab === 'usage' && <ServiceUsageRelations graph={graph} kind="persona" id={selected.id} title="Uso e relações" />}
      </div>

      <p className="bo-p6-local-note" role="status">{isDirty ? 'As alterações serão salvas neste navegador após uma pausa na edição.' : 'Perfil registrado neste dispositivo. Faça backup regularmente.'}</p>

      {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER PERSONA</small><h2>Remover “{contextEntityTitle(graph.entities?.persona?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações com Necessidades, Jobs, Dores, Hipóteses e Evidências serão desvinculadas. Esta ação pode ser desfeita pelo histórico da aplicação.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removePersona(deleteId)}>Remover Persona</button></footer></div></div>}
    </section>;
  }

  const hasSearchOrFilter = Boolean(query.trim()) || filter !== 'all' || filterRules.length>0;
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
        <div className="bo-p3-saved-wrap"><button type="button" className={savedViewsOpen?'is-active':''} aria-expanded={savedViewsOpen} aria-controls="bo-p3-saved-panel" onClick={()=>{setSavedViewsOpen(!savedViewsOpen);setDisplayOpen(false);setShowFilters(false)}}>Visualizações <span aria-hidden="true">⌄</span></button>
          {savedViewsOpen && <div className="bo-p3-popover bo-p3-saved-popover" id="bo-p3-saved-panel">
            <strong>Visualizações salvas</strong><small>Disponíveis neste navegador e serviço.</small>
            {savedViews.map(v=><div className="bo-p3-saved-item" key={v.id}><button type="button" onClick={()=>applySavedView(v)}>{v.name}</button><button type="button" aria-label={`Excluir visualização ${v.name}`} onClick={()=>persistSavedViews(savedViews.filter(x=>x.id!==v.id))}><Trash2 size={14}/></button></div>)}
            {!savedViews.length&&<p>Nenhuma visualização salva.</p>}
            <label htmlFor="bo-p3-save-name">Salvar visão atual</label><input id="bo-p3-save-name" maxLength={60} value={newViewName} onChange={e=>setNewViewName(e.target.value)} placeholder="Ex.: Personas sem evidências"/>
            <button type="button" className="bo-p3-save-action" disabled={!newViewName.trim()} onClick={saveCurrentView}>Salvar visualização</button>
          </div>}
        </div>
        <button type="button" className={showFilters || filter !== 'all' || filterRules.length ? 'is-active' : ''} onClick={openFilters} aria-label="Filtros de personas" aria-expanded={showFilters} aria-controls="bo-p3-filter-panel"><Filter size={16}/><span>Filtros</span>{(filter !== 'all' || filterRules.length>0) && <b aria-label="Filtro ativo" className="bo-p1-filter-dot"/>}</button>
        <label className="bo-p3-sort-label">Classificar <select aria-label="Classificar personas" value={sortMode} onChange={e=>setSortMode(e.target.value as PersonaSort)}><option value="title">Nome A–Z</option><option value="recent">Atualização recente</option><option value="evidence">Mais evidências</option><option value="usage">Mais utilizadas</option><option value="completeness">Mais completas</option></select></label>
        <div className="bo-p3-display-wrap"><button type="button" aria-expanded={displayOpen} aria-controls="bo-p3-display-panel" onClick={()=>{setDisplayOpen(!displayOpen);setSavedViewsOpen(false);setShowFilters(false)}}>Exibição <span aria-hidden="true">⌄</span></button>
          {displayOpen&&<div className="bo-p3-popover" id="bo-p3-display-panel"><strong>Personalizar exibição</strong><small>Escolha o formato e as colunas da tabela.</small>
            <div className="bo-p3-display-modes" role="group" aria-label="Formato de visualização"><button type="button" aria-pressed={viewMode==='cards'} onClick={()=>changeViewMode('cards')}>Cartões</button><button type="button" aria-pressed={viewMode==='table'} onClick={()=>changeViewMode('table')}>Tabela</button></div>
            <strong>Colunas visíveis</strong><small>Persona e Ações permanecem fixas.</small>
            {([['owner','Responsável'],['evidence','Evidências'],['usage','Uso em mapas'],['updated','Atualizado']] as Array<[PersonaColumn,string]>).map(([id,label])=><label className="bo-p3-column" key={id}><input type="checkbox" checked={visibleColumns.includes(id)} onChange={e=>setVisibleColumns(current=>e.target.checked?[...current,id]:current.filter(x=>x!==id))}/>{label}</label>)}
            <button type="button" className="bo-p3-close" onClick={()=>setDisplayOpen(false)}>Concluir</button>
          </div>}
        </div>
        <div className="bo-p1-view-toggle" role="group" aria-label="Visualização de personas">
          <button type="button" className={viewMode === 'cards' ? 'is-active' : ''} aria-pressed={viewMode === 'cards'} onClick={() => changeViewMode('cards')}><UsersRound size={16}/><span>Cartões</span></button>
          <button type="button" className={viewMode === 'table' ? 'is-active' : ''} aria-pressed={viewMode === 'table'} onClick={() => changeViewMode('table')}><Table2 size={16}/><span>Tabela</span></button>
        </div>
        <button type="button" className="primary bo-p1-create" onClick={() => setCreateOpen(true)}><Plus size={16}/> Nova Persona</button>
      </div>
    </div>
    {showFilters && <div className="bo-p3-overlay" onMouseDown={(e)=>{if(e.target===e.currentTarget)setShowFilters(false)}}>
      <aside className="bo-p3-filter-panel" id="bo-p3-filter-panel" role="dialog" aria-modal="true" aria-labelledby="bo-p3-filters-title" onKeyDown={(e)=>{if(e.key==='Escape')setShowFilters(false)}}>
        <header><div><small>PERSONAS / SEGMENTAÇÃO</small><h2 id="bo-p3-filters-title">Filtrar Personas</h2><p>Combine condições para encontrar os perfis que precisam de atenção.</p></div>
          <button type="button" aria-label="Fechar filtros" onClick={()=>setShowFilters(false)}><X size={18}/></button></header>
        <div className="bo-p3-filter-body">
          <section><h3>Filtros rápidos</h3><div className="bo-p3-quick">{filters.map(([id,label])=><button key={id} type="button" className={draftQuickFilter===id?'is-active':''} aria-pressed={draftQuickFilter===id} onClick={()=>setDraftQuickFilter(id)}>{label}</button>)}</div></section>
          <section><div className="bo-p3-section-head"><h3>Condições personalizadas</h3><span>{draftRules.length} de 8</span></div>
            {draftRules.length>1&&<div className="bo-p3-logic" role="group" aria-label="Combinar condições"><button type="button" aria-pressed={draftLogic==='all'} onClick={()=>setDraftLogic('all')}>E · todas</button><button type="button" aria-pressed={draftLogic==='any'} onClick={()=>setDraftLogic('any')}>OU · qualquer uma</button></div>}
            {draftRules.map((rule,index)=>{
              const field=PERSONA_FIELDS.find(f=>f.id===rule.field);
              return <div className="bo-p3-rule" key={rule.id}>
                <div className="bo-p3-rule-head"><strong>Condição {index+1}</strong><button type="button" aria-label={`Remover condição ${index+1}`} onClick={()=>setDraftRules(current=>current.filter(x=>x.id!==rule.id))}><Trash2 size={14}/></button></div>
                <label>Campo<select aria-label={`Campo da condição ${index+1}`} value={rule.field} onChange={e=>setDraftRules(current=>current.map(x=>x.id===rule.id?{...x,field:e.target.value as PersonaFilterField,operator:'equals',value:''}:x))}>{PERSONA_FIELDS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
                <label>Operador<select aria-label={`Operador da condição ${index+1}`} value={rule.operator} onChange={e=>setDraftRules(current=>current.map(x=>x.id===rule.id?{...x,operator:e.target.value as PersonaFilterOperator}:x))}>
                  {!field?.numeric&&<option value="contains">Contém</option>}<option value="equals">É igual a</option>{field?.numeric&&<><option value="gte">Maior ou igual a</option><option value="lte">Menor ou igual a</option></>}<option value="empty">Vazio / zero</option></select></label>
                {rule.operator!=='empty'&&<label>Valor{rule.field==='mode'?<select aria-label={`Valor da condição ${index+1}`} value={rule.value} onChange={e=>setDraftRules(current=>current.map(x=>x.id===rule.id?{...x,value:e.target.value}:x))}><option value="">Selecione</option><option value="simple">Simples</option><option value="professional">Avançada</option></select>:<input aria-label={`Valor da condição ${index+1}`} value={rule.value} type={field?.numeric?'number':'text'} maxLength={150} placeholder={field?.numeric?'Ex.: 0':'Digite um valor'} onChange={e=>setDraftRules(current=>current.map(x=>x.id===rule.id?{...x,value:e.target.value}:x))}/>}</label>}
              </div>;
            })}
            <button type="button" className="bo-p3-add-rule" disabled={draftRules.length>=8} onClick={()=>setDraftRules(current=>[...current,personaRule()])}><Plus size={15}/> Adicionar condição</button>
            <p className="bo-p3-filter-help">Os filtros rápidos são combinados com as condições. Nenhuma informação da Persona é alterada.</p>
          </section>
        </div>
        <footer><button type="button" onClick={()=>{setDraftRules([]);setDraftQuickFilter('all');setDraftLogic('all')}}>Limpar filtros</button>
        <button type="button" className="primary" onClick={()=>{setFilterRules(validatePersonaRules(draftRules));setRuleLogic(draftLogic);setFilter(draftQuickFilter);setShowFilters(false)}}>Aplicar filtros</button></footer>
      </aside>
    </div>}
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
      <table className="bo-h71-table bo-p1-table"><thead><tr><th>PERSONA</th>{visibleColumns.includes('owner')&&<th>RESPONSÁVEL</th>}{visibleColumns.includes('evidence')&&<th>EVIDÊNCIAS</th>}{visibleColumns.includes('usage')&&<th>USO EM MAPAS</th>}{visibleColumns.includes('updated')&&<th>ATUALIZADO</th>}<th>AÇÕES</th></tr></thead>
      <tbody>{filtered.map((row) => <tr key={row.persona.id}>
        <td><button type="button" className="bo-h71-persona-name" onClick={() => openPersona(row.persona.id)}><span><UserRound size={14}/></span><strong>{row.title}</strong></button><small className="bo-p1-table-hint">{String(row.persona.description || '').trim() || 'Sem resumo'}</small></td>
        {visibleColumns.includes('owner')&&<td>{row.owner}</td>}{visibleColumns.includes('evidence')&&<td>{row.report?.connectionCounts.evidence ?? 0}</td>}{visibleColumns.includes('usage')&&<td>{row.usage.instances ?? 0}</td>}{visibleColumns.includes('updated')&&<td>{formatDate(row.persona.updatedAt ?? row.persona.createdAt)}</td>}
        <td className="menu-cell"><button type="button" aria-label={`Ações da persona ${row.title}`} aria-expanded={menuId === row.persona.id} onClick={() => setMenuId(menuId === row.persona.id ? null : row.persona.id)}><MoreVertical size={15}/></button>{menuId === row.persona.id && <div className="bo-h71-row-menu"><button type="button" onClick={() => openPersona(row.persona.id)}>Abrir</button><button type="button" className="danger" onClick={() => { setMenuId(null); setDeleteId(row.persona.id); }}>Remover</button></div>}</td>
      </tr>)}</tbody></table>
    </div>}
    {!filtered.length && <div className="bo-h71-empty bo-p1-empty"><UsersRound size={28}/><strong>{hasSearchOrFilter ? 'Nenhuma Persona corresponde à busca' : 'Comece conhecendo seu público-alvo'}</strong><p>{hasSearchOrFilter ? 'Experimente buscar outro termo ou remover os filtros aplicados.' : 'Crie uma Persona para documentar objetivos, necessidades e evidências ligadas ao serviço.'}</p>
      {hasSearchOrFilter ? <button type="button" onClick={() => { setQuery(''); setFilter('all'); }}>Limpar busca e filtros</button> : <button type="button" onClick={() => setCreateOpen(true)}><Plus size={14}/> Criar persona</button>}
    </div>}

    {createOpen && <QuickEntityCreateDialog kind="persona" value={createTitle} onChange={setCreateTitle} onClose={cancelCreate} onCreate={createPersona} />}
    {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER PERSONA</small><h2>Remover “{contextEntityTitle(graph.entities?.persona?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações existentes serão desvinculadas do Service Graph.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removePersona(deleteId)}>Remover Persona</button></footer></div></div>}
  </section>;
}

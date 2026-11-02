import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, CornerDownLeft, ExternalLink, Heart, Link2, Map, Microscope, Plus, Frown, Trash2 } from '../design-system/icons';
import type { GraphEntity, ServiceGraph } from '../domain/model';
import type { personaRelationOptions, PersonaProfileDraft } from '../services/persona-studio';
import { personaEcosystemMaps, personaSourceUrl, type PersonaEcosystemChange } from '../services/persona-ecosystem';
import './persona-ecosystem.css';

type Props = {
  graph: ServiceGraph;
  persona: GraphEntity;
  draft: PersonaProfileDraft;
  options: ReturnType<typeof personaRelationOptions>;
  connectedIds: string[];
  dirty: boolean;
  readOnly: boolean;
  saveStatus: 'saving' | 'saved' | 'error';
  onChange: (change: PersonaEcosystemChange) => void;
  onSave: () => void;
  onBack: () => void;
  onNavigate: (area: 'overview' | 'creation' | 'relations' | 'evidence' | 'usage') => void;
  onOpenMap: (kind: 'journey' | 'blueprint' | 'whiteboard', id: string) => void;
};

type ChangeHandler = (change: PersonaEcosystemChange) => boolean;
type ConnectionProps = Pick<Props, 'options' | 'connectedIds' | 'readOnly'> & { onChange: ChangeHandler };

function ExistingLinks({ kind, options, onChange, readOnly }: Pick<Props, 'readOnly'> & { onChange: ChangeHandler; kind: 'pain' | 'need' | 'evidence'; options: Props['options'] }) {
  const [id, setId] = useState('');
  if (!options.length) return null;
  const label = kind === 'pain' ? 'dor' : kind === 'need' ? 'necessidade' : 'fonte';
  return <details className="bo-eco-existing"><summary>Vincular {label} existente</summary>
    <form onSubmit={event => { event.preventDefault(); if (!id || readOnly) return; if (onChange({ type: 'link', id })) setId(''); }}>
      <label>Escolher {label}<select value={id} onChange={event => setId(event.target.value)} required disabled={readOnly}>
        <option value="">Selecione um registro</option>{options.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      <button type="submit" disabled={!id || readOnly}><Link2 size={14}/> Vincular</button>
    </form>
  </details>;
}

function ConnectionCard({ kind, options, connectedIds, onChange, readOnly }: ConnectionProps & { kind: 'pain' | 'need' }) {
  const [text, setText] = useState('');
  const id = useId(), pain = kind === 'pain', title = pain ? 'Dores' : 'Necessidades', Icon = pain ? Frown : Heart;
  const records = options.filter(item => item.kind === kind), linked = records.filter(item => connectedIds.includes(item.id));
  const submit = (event: FormEvent) => {
    event.preventDefault(); if (!text.trim() || readOnly) return;
    if (onChange({ type: 'create', kind, title: text.trim() })) setText('');
  };
  return <section className={`bo-eco-card is-${kind}`} aria-labelledby={id} data-persona-ecosystem-kind={kind}>
    <header><h3 id={id}><Icon size={22}/>{title}</h3><span className="bo-eco-count" aria-label={`${linked.length} ${title.toLowerCase()} vinculadas`}>{linked.length}</span></header>
    {linked.length ? <ul className="bo-eco-records">{linked.map(item => <li key={item.id}><p>{item.title}</p>
      <button type="button" className="bo-eco-unlink" aria-label={`Desvincular ${pain ? 'dor' : 'necessidade'} ${item.title}`} title="Desvincular desta Persona" disabled={readOnly} onClick={() => onChange({ type: 'unlink', id: item.id })}><Trash2 size={16}/></button>
    </li>)}</ul> : <div className="bo-eco-empty"><p>{pain ? 'Nenhuma dor registrada ainda.' : 'Nenhuma necessidade registrada ainda.'}</p></div>}
    <form className="bo-eco-inline" onSubmit={submit}>
      <label className="bo-eco-sr" htmlFor={`${id}-input`}>{pain ? 'Nova dor da Persona' : 'Nova necessidade da Persona'}</label>
      <input id={`${id}-input`} value={text} onChange={event => setText(event.target.value)} maxLength={240} required disabled={readOnly}
        placeholder={pain ? 'Qual a principal dor desta persona?' : 'O que mais ela precisa? (Enter para adicionar)'}
        onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }}/>
      <button type="submit" aria-label={pain ? 'Adicionar dor' : 'Adicionar necessidade'} title="Pressione Enter para adicionar" disabled={!text.trim() || readOnly}>{pain ? <CornerDownLeft size={16}/> : <Plus size={16}/>}</button>
    </form>
    <ExistingLinks kind={kind} options={records.filter(item => !connectedIds.includes(item.id))} onChange={onChange} readOnly={readOnly}/>
  </section>;
}

export function PersonaEcosystem({ graph, persona, draft, options, connectedIds, dirty, readOnly, saveStatus, onChange, onSave, onBack, onNavigate, onOpenMap }: Props) {
  const [url, setUrl] = useState(''), [error, setError] = useState('');
  const sourceRef = useRef<HTMLElement>(null), painRef = useRef<HTMLDivElement>(null), needRef = useRef<HTMLDivElement>(null), mapsRef = useRef<HTMLDetailsElement>(null);
  const maps = useMemo(() => personaEcosystemMaps(graph, persona.id), [graph, persona.id]);
  const linked = options.filter(item => connectedIds.includes(item.id)), sources = linked.filter(item => item.kind === 'evidence');
  const initials = draft.title.trim().split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word)).slice(0, 2).map(word => word.match(/[\p{L}\p{N}]/u)?.[0]).join('').toLocaleUpperCase('pt-BR') || 'P';
  const updated = new Date(String(persona.updatedAt || persona.createdAt || ''));
  const edited = Number.isNaN(updated.getTime()) ? '' : updated.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const change = (mutation: PersonaEcosystemChange) => {
    setError('');
    try { onChange(mutation); return true; } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar a conexão.'); return false; }
  };
  const jump = (element: HTMLElement | null) => {
    if (!element) return;
    element.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    element.querySelector<HTMLElement>('input,summary')?.focus({ preventScroll: true });
  };
  const submitSource = (event: FormEvent) => {
    event.preventDefault(); if (readOnly) return;
    if (!personaSourceUrl(url)) { setError('Informe um link completo começando com https:// ou http://.'); return; }
    if (change({ type: 'create', kind: 'evidence', title: '', url })) setUrl('');
  };
  const savedLabel = saveStatus === 'error' ? 'Erro ao salvar' : saveStatus === 'saving' ? 'Salvando…' : dirty ? 'Salvar alterações' : 'Tudo salvo';
  return <section className="bo-persona-ecosystem" data-personas-h71="detail" data-persona-ecosystem="1">
    <header className="bo-eco-header">
      <div className="bo-eco-titlebar"><div className="bo-eco-identity">
        <button type="button" className="bo-eco-back" aria-label="Voltar para Personas" onClick={onBack}><ArrowLeft size={20}/></button>
        <span className="bo-eco-avatar" aria-hidden="true">{initials}</span>
        <div><h1>{draft.title}</h1><p>{draft.mode === 'professional' ? 'Persona avançada' : 'Persona simples'}{edited && <> · Editado em {edited}</>}</p></div>
      </div><div className="bo-eco-actions">
        <button type="button" onClick={() => onNavigate('overview')}>Visualizar perfil</button>
        <button type="button" className={`bo-eco-save is-${saveStatus}`} aria-label={savedLabel} onClick={onSave} disabled={readOnly || !dirty || !draft.title.trim() || saveStatus === 'saving'}><Check size={16}/><span role="status" aria-live="polite">{savedLabel}</span></button>
      </div></div>
      <nav className="bo-eco-tabs" aria-label="Detalhes da Persona">
        <button type="button" onClick={() => onNavigate('overview')}>Visão geral</button>
        <button type="button" onClick={() => onNavigate('creation')}>Perfil de criação</button>
        <button type="button" aria-current="page">Ecossistema</button>
      </nav>
    </header>
    <div className="bo-eco-content">
      <div className="bo-eco-intro"><h2>Conexões no Serviço</h2><p>Veja e adicione os elementos que compõem o universo desta persona.</p></div>
      <div className="bo-eco-graph" role="group" aria-label={`Ecossistema de ${draft.title}`}>
        <svg viewBox="0 0 768 420" preserveAspectRatio="none" aria-hidden="true"><path d="M384 70V350M128 210H640"/><circle cx="384" cy="210" r="45"/></svg>
        <div className="bo-eco-graph-nodes"><button type="button" className="bo-eco-node is-research" onClick={() => jump(sourceRef.current)}><span><Microscope size={18}/></span>Pesquisas ({sources.length})</button>
        <button type="button" className="bo-eco-node is-pain" onClick={() => jump(painRef.current)}><span><Frown size={18}/></span>Dores ({linked.filter(item => item.kind === 'pain').length})</button>
        <div className="bo-eco-center"><span>{initials}</span><strong>{draft.title}</strong></div>
        <button type="button" className="bo-eco-node is-need" onClick={() => jump(needRef.current)}><span><Heart size={18}/></span>Necessidades ({linked.filter(item => item.kind === 'need').length})</button>
        <button type="button" className="bo-eco-node is-maps" onClick={() => { if (mapsRef.current) mapsRef.current.open = true; jump(mapsRef.current); }}><span><Map size={18}/></span>Mapas ({maps.length})</button></div>
      </div>
      {readOnly && <p className="bo-eco-notice" role="status">Modo somente leitura.</p>}
      {error && <p className="bo-eco-error" role="alert">{error}</p>}
      <div className="bo-eco-grid">
        <div ref={painRef}><ConnectionCard kind="pain" options={options} connectedIds={connectedIds} onChange={change} readOnly={readOnly}/></div>
        <div ref={needRef}><ConnectionCard kind="need" options={options} connectedIds={connectedIds} onChange={change} readOnly={readOnly}/></div>
        <section ref={sourceRef} className="bo-eco-card bo-eco-research" aria-labelledby="bo-eco-sources-title">
          <header><div><h3 id="bo-eco-sources-title"><Microscope size={22}/>Base de Pesquisa</h3><p>Quais dados ou fontes sustentam a existência desta persona?</p></div><span className="bo-eco-count">{sources.length} {sources.length === 1 ? 'fonte' : 'fontes'}</span></header>
          {sources.length ? <ul className="bo-eco-sources">{sources.map(item => {
            const record = graph.entities.evidence?.[item.id], href = personaSourceUrl(record?.sourceName || record?.sourceUrl);
            return <li key={item.id}><span className="bo-eco-source-icon"><Link2 size={22}/></span><div><h4>{item.title}</h4>
              {href ? <a href={href} target="_blank" rel="noopener noreferrer">Abrir fonte <ExternalLink size={12}/></a> : <span className="bo-eco-source-meta">{item.description || 'Fonte de pesquisa vinculada'}</span>}
            </div><button type="button" className="bo-eco-unlink" disabled={readOnly} aria-label={`Desvincular fonte ${item.title}`} title="Desvincular fonte desta Persona" onClick={() => change({ type: 'unlink', id: item.id })}><Trash2 size={18}/></button></li>;
          })}</ul> : <p className="bo-eco-sources-empty">Nenhuma fonte vinculada ainda.</p>}
          <form className="bo-eco-source-form" onSubmit={submitSource}><label className="bo-eco-sr" htmlFor="bo-eco-source-url">Link da fonte de pesquisa</label>
            <input id="bo-eco-source-url" type="url" value={url} onChange={event => setUrl(event.target.value)} maxLength={2000} required disabled={readOnly} placeholder="Cole aqui o link do Notion, Miro, Drive, etc..."/>
            <button type="submit" disabled={readOnly || !url.trim()}><Plus size={16}/>Adicionar fonte</button>
          </form>
          <ExistingLinks kind="evidence" options={options.filter(item => item.kind === 'evidence' && !connectedIds.includes(item.id))} onChange={change} readOnly={readOnly}/>
          <button type="button" className="bo-eco-text-action" onClick={() => onNavigate('evidence')}>Evidências por afirmação <ArrowRight size={14}/></button>
        </section>
      </div>
      <details className="bo-eco-map-list" ref={mapsRef}><summary>Mapas vinculados ({maps.length})</summary>
        {maps.length ? <ul>{maps.map(map => <li key={`${map.kind}:${map.id}`}><button type="button" onClick={() => onOpenMap(map.kind, map.id)}><Map size={16}/>{map.title}<ArrowRight size={14}/></button></li>)}</ul> : <p>Esta Persona ainda não está vinculada a um mapa do serviço.</p>}
      </details>
      <div className="bo-eco-more-actions"><button type="button" onClick={() => onNavigate('relations')}>Outras conexões do serviço <ArrowRight size={14}/></button><button type="button" onClick={() => onNavigate('usage')}>Uso nos mapas e relações <ArrowRight size={14}/></button></div>
    </div>
  </section>;
}

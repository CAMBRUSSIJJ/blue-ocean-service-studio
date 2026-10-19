import { useEffect, useMemo, useState } from 'react';
import { Link2, Network, Plus, RefreshCw, Trash2, UsersRound, X } from '../design-system/icons';
import { BlueOceanObjectIcon, type BlueOceanObjectKind } from '../design-system/blue-ocean-objects';
import type { Id, ServiceEcologyRelationKind, StakeholderInfluence, StakeholderKind } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import { ServiceUsageRelations } from '../components/ServiceUsageRelations';
import {
  buildServiceEcologyReport,
  createEcologyRelation,
  createServiceStakeholder,
  ECOLOGY_RELATION_LABELS,
  getServiceEcology,
  removeEcologyRelation,
  removeServiceStakeholder,
  STAKEHOLDER_KIND_LABELS,
  syncPersonasToServiceEcology,
} from '../services/service-ecology';

type EcologyTab = 'map' | 'stakeholders';

type Point = { x: number; y: number };
const KIND_ANCHORS: Record<StakeholderKind, Point> = {
  customer: { x: 125, y: 155 },
  community: { x: 110, y: 390 },
  employee: { x: 395, y: 125 },
  manager: { x: 400, y: 430 },
  organization: { x: 520, y: 280 },
  system: { x: 660, y: 120 },
  partner: { x: 805, y: 155 },
  supplier: { x: 840, y: 315 },
  regulator: { x: 790, y: 455 },
  other: { x: 610, y: 455 },
};

const kindIcon = (kind: StakeholderKind): BlueOceanObjectKind => {
  if (kind === 'system') return 'system';
  if (kind === 'regulator') return 'policy';
  if (kind === 'partner' || kind === 'supplier') return 'dependency';
  if (kind === 'organization') return 'service';
  if (kind === 'community') return 'persona';
  return 'person';
};

const clampInfluence = (value: string): StakeholderInfluence => Math.max(1, Math.min(5, Number(value) || 3)) as StakeholderInfluence;

export function ServiceEcologyView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const [tab, setTab] = useState<EcologyTab>('map');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<Id | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<StakeholderKind>('customer');
  const [role, setRole] = useState('');
  const [summary, setSummary] = useState('');
  const [influence, setInfluence] = useState<StakeholderInfluence>(3);
  const [interest, setInterest] = useState<StakeholderInfluence>(3);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [relationKind, setRelationKind] = useState<ServiceEcologyRelationKind>('supports');

  const ecology = useMemo(() => getServiceEcology(graph), [graph]);
  const report = useMemo(() => buildServiceEcologyReport(graph), [graph]);
  const stakeholders = useMemo(() => Object.values(ecology.stakeholders).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [ecology]);
  const relations = useMemo(() => Object.values(ecology.relations), [ecology]);
  const selected = selectedId ? ecology.stakeholders[selectedId] : null;

  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; id?: string }>).detail || {};
      if (detail.kind !== 'actor' || !detail.id || !ecology.stakeholders[detail.id]) return;
      setSelectedId(detail.id); setTab('map');
    };
    try {
      const raw = sessionStorage.getItem('bo-service-object-focus');
      if (raw) { const detail = JSON.parse(raw) as { kind?: string; id?: string }; if (detail.kind === 'actor' && detail.id && ecology.stakeholders[detail.id]) { setSelectedId(detail.id); setTab('map'); sessionStorage.removeItem('bo-service-object-focus'); } }
    } catch { /* optional navigation focus */ }
    window.addEventListener('bo-service-object-focus', focus);
    return () => window.removeEventListener('bo-service-object-focus', focus);
  }, [ecology.stakeholders]);


  const points = useMemo(() => {
    const grouped = new Map<StakeholderKind, typeof stakeholders>();
    for (const stakeholder of stakeholders) grouped.set(stakeholder.kind, [...(grouped.get(stakeholder.kind) ?? []), stakeholder]);
    const output: Record<string, Point> = {};
    for (const [stakeholderKind, items] of grouped) {
      const anchor = KIND_ANCHORS[stakeholderKind];
      items.forEach((item, index) => {
        const offset = index - (items.length - 1) / 2;
        const horizontal = stakeholderKind === 'customer' || stakeholderKind === 'community' || stakeholderKind === 'partner' || stakeholderKind === 'supplier' || stakeholderKind === 'regulator';
        output[item.id] = {
          x: anchor.x + (horizontal ? offset * 22 : offset * 150),
          y: anchor.y + (horizontal ? offset * 78 : offset * 22),
        };
      });
    }
    return output;
  }, [stakeholders]);

  const createStakeholder = () => {
    if (!name.trim()) { showToast('Informe um nome para o stakeholder.'); return; }
    setGraph((current) => createServiceStakeholder({ graph: current, name, kind, role, summary, influence, interest }), 'H7.25: stakeholder criado');
    setName(''); setRole(''); setSummary(''); setKind('customer'); setInfluence(3); setInterest(3); setCreateOpen(false);
    showToast('Stakeholder adicionado à ecologia do serviço.');
  };

  const syncPersonas = () => {
    let created = 0;
    setGraph((current) => {
      const result = syncPersonasToServiceEcology(current);
      created = result.created;
      return result.graph;
    }, 'H7.25: sincronizar personas com stakeholders');
    window.setTimeout(() => showToast(created ? `${created} Persona(s) adicionada(s) como stakeholders.` : 'Todas as Personas já estão representadas na ecologia.'), 0);
  };

  const addRelation = () => {
    if (!fromId || !toId) { showToast('Selecione origem e destino da relação.'); return; }
    if (fromId === toId) { showToast('A relação precisa conectar dois stakeholders diferentes.'); return; }
    const before = relations.length;
    setGraph((current) => createEcologyRelation({ graph: current, fromId, toId, kind: relationKind }), 'H7.25: relação da ecologia criada');
    if (relations.length === before) void 0;
    setToId('');
    showToast('Relação adicionada ao mapa da ecologia.');
  };

  const matrix = useMemo(() => ({
    manage: stakeholders.filter((item) => item.influence >= 4 && item.interest >= 4),
    satisfy: stakeholders.filter((item) => item.influence >= 4 && item.interest < 4),
    inform: stakeholders.filter((item) => item.influence < 4 && item.interest >= 4),
    monitor: stakeholders.filter((item) => item.influence < 4 && item.interest < 4),
  }), [stakeholders]);

  return <section className="bo-h725-ecology" data-service-ecology-workspace="7.25">
    <header className="bo-h725-head">
      <div><small>ECOLOGIA DO SERVIÇO</small><h2>Torne visíveis as relações que sustentam a experiência</h2><p>Mapeie clientes, funcionários, parceiros, fornecedores, sistemas e outros atores antes de detalhar a entrega no Blueprint.</p></div>
      <div className="bo-h725-head-actions"><button type="button" onClick={syncPersonas}><RefreshCw size={14}/> Sincronizar Personas</button><button type="button" className="primary" onClick={() => setCreateOpen(true)}><Plus size={15}/> Stakeholder</button></div>
    </header>

    <div className="bo-h725-metrics">
      <article><b>{report.stakeholderCount}</b><span>Stakeholders</span></article>
      <article><b>{report.relationCount}</b><span>Relações</span></article>
      <article><b>{report.representedKinds}</b><span>Tipos representados</span></article>
      <article><b>{report.evidenceLinkedCount}</b><span>Com evidência</span></article>
      <article className="is-score"><b>{report.score}</b><span>Ecology Health</span></article>
    </div>

    <nav className="bo-h725-subtabs" aria-label="Ecologia do serviço"><button type="button" className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}><Network size={15}/> Mapa</button><button type="button" className={tab === 'stakeholders' ? 'active' : ''} onClick={() => setTab('stakeholders')}><UsersRound size={15}/> Stakeholders</button></nav>

    {tab === 'map' && <div className="bo-h725-map-layout">
      <main className="bo-h725-map-panel">
        {!stakeholders.length ? <div className="bo-h725-empty"><BlueOceanObjectIcon kind="service" size={34}/><strong>A ecologia ainda não foi mapeada</strong><p>Comece trazendo as Personas já pesquisadas ou adicione os atores que participam da entrega do serviço.</p><div><button type="button" onClick={syncPersonas}>Sincronizar Personas</button><button type="button" className="primary" onClick={() => setCreateOpen(true)}>Adicionar stakeholder</button></div></div> : <div className="bo-h725-canvas-wrap"><div className="bo-h725-canvas" data-ecology-map="1">
          <svg viewBox="0 0 960 560" preserveAspectRatio="none" aria-hidden="true">
            {relations.map((relation) => { const from = points[relation.fromId]; const to = points[relation.toId]; if (!from || !to) return null; return <g key={relation.id}><line x1={from.x + 74} y1={from.y + 34} x2={to.x + 74} y2={to.y + 34} className={`is-${relation.strength ?? 'medium'}`}/><text x={(from.x + to.x) / 2 + 74} y={(from.y + to.y) / 2 + 28}>{ECOLOGY_RELATION_LABELS[relation.kind]}</text></g>; })}
          </svg>
          <div className="bo-h725-service-node"><BlueOceanObjectIcon kind="service" size={25}/><small>SERVIÇO</small><strong>{graph.service.name}</strong></div>
          {stakeholders.map((item) => { const point = points[item.id] ?? { x: 400, y: 250 }; const connectionCount = relations.filter((relation) => relation.fromId === item.id || relation.toId === item.id).length; return <button key={item.id} type="button" className={`bo-h725-node is-${item.kind} ${selectedId === item.id ? 'is-selected' : ''}`} style={{ left: point.x, top: point.y }} onClick={() => setSelectedId(item.id)}><span><BlueOceanObjectIcon kind={kindIcon(item.kind)} size={18}/></span><small>{STAKEHOLDER_KIND_LABELS[item.kind]}</small><strong>{item.name}</strong><em>{connectionCount} conexões</em></button>; })}
        </div></div>}
      </main>
      <aside className="bo-h725-side">
        <section className="bo-h725-relation-builder"><header><small>CONEXÕES</small><strong>Como os atores se relacionam?</strong></header><label><span>Origem</span><select value={fromId} onChange={(event) => setFromId(event.target.value)}><option value="">Selecionar…</option>{stakeholders.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Relação</span><select value={relationKind} onChange={(event) => setRelationKind(event.target.value as ServiceEcologyRelationKind)}>{Object.entries(ECOLOGY_RELATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Destino</span><select value={toId} onChange={(event) => setToId(event.target.value)}><option value="">Selecionar…</option>{stakeholders.filter((item) => item.id !== fromId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" disabled={!fromId || !toId} onClick={addRelation}><Link2 size={14}/> Conectar</button></section>
        {selected ? <section className="bo-h725-selected"><header><div><small>{STAKEHOLDER_KIND_LABELS[selected.kind]}</small><strong>{selected.name}</strong></div><button type="button" aria-label="Fechar seleção" onClick={() => setSelectedId(null)}><X size={14}/></button></header>{selected.role && <p><b>Papel</b>{selected.role}</p>}{selected.summary && <p><b>Contexto</b>{selected.summary}</p>}<div className="bo-h725-influence"><span>Influência <b>{selected.influence}/5</b></span><span>Interesse <b>{selected.interest}/5</b></span></div><p><b>Evidências</b>{selected.evidenceIds.length || 'Nenhuma vinculada'}</p><ServiceUsageRelations graph={graph} kind="actor" id={selected.id} title="Uso e relações deste ator" compact/><button type="button" className="danger" onClick={() => { setGraph((current) => removeServiceStakeholder(current, selected.id), 'H7.25: stakeholder removido'); setSelectedId(null); }}>Remover stakeholder</button></section> : <section className="bo-h725-guidance"><small>COMO USAR</small><strong>Comece pelo sistema, não pelo organograma</strong><p>Inclua quem recebe, entrega, influencia ou restringe o serviço. Depois conecte relações reais de valor, informação, dependência e regulação.</p></section>}
      </aside>
      {!!relations.length && <section className="bo-h725-relation-list"><header><small>RELAÇÕES MAPEADAS</small><strong>{relations.length} conexões explícitas</strong></header>{relations.map((relation) => { const from = ecology.stakeholders[relation.fromId]; const to = ecology.stakeholders[relation.toId]; return <div key={relation.id}><span>{from?.name ?? '—'}</span><b>{ECOLOGY_RELATION_LABELS[relation.kind]}</b><span>{to?.name ?? '—'}</span><button type="button" aria-label="Remover relação" onClick={() => setGraph((current) => removeEcologyRelation(current, relation.id), 'H7.25: relação removida')}><Trash2 size={13}/></button></div>; })}</section>}
    </div>}

    {tab === 'stakeholders' && <div className="bo-h725-stakeholder-layout">
      <section className="bo-h725-stakeholder-list"><header><div><small>REDE DE STAKEHOLDERS</small><h3>{stakeholders.length} atores mapeados</h3></div><button type="button" className="primary" onClick={() => setCreateOpen(true)}><Plus size={14}/> Adicionar</button></header><div>{stakeholders.map((item) => <article key={item.id} onClick={() => { setSelectedId(item.id); setTab('map'); }}><span><BlueOceanObjectIcon kind={kindIcon(item.kind)} size={19}/></span><div><small>{STAKEHOLDER_KIND_LABELS[item.kind]}</small><strong>{item.name}</strong><p>{item.role || item.summary || 'Sem papel descrito'}</p></div><em>I {item.influence} · Int {item.interest}</em></article>)}</div></section>
      <section className="bo-h725-matrix"><header><small>INFLUÊNCIA × INTERESSE</small><h3>Estratégia de envolvimento</h3></header><div className="bo-h725-quadrants"><article className="manage"><strong>Co-criar / gerenciar de perto</strong><p>Alta influência · alto interesse</p>{matrix.manage.map((item) => <span key={item.id}>{item.name}</span>)}</article><article className="satisfy"><strong>Manter satisfeito</strong><p>Alta influência · menor interesse</p>{matrix.satisfy.map((item) => <span key={item.id}>{item.name}</span>)}</article><article className="inform"><strong>Manter informado</strong><p>Menor influência · alto interesse</p>{matrix.inform.map((item) => <span key={item.id}>{item.name}</span>)}</article><article className="monitor"><strong>Monitorar</strong><p>Menor influência · menor interesse</p>{matrix.monitor.map((item) => <span key={item.id}>{item.name}</span>)}</article></div></section>
    </div>}

    {createOpen && <div className="bo-h725-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="bo-h725-create-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><div className="bo-h725-modal"><header><div><small>NOVO STAKEHOLDER</small><h2 id="bo-h725-create-title">Adicionar à ecologia</h2><p>Registre um ator que participa, influencia ou restringe o serviço.</p></div><button type="button" onClick={() => setCreateOpen(false)} aria-label="Fechar"><X size={17}/></button></header><div className="bo-h725-form-grid"><label className="wide"><span>Nome</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Motorista parceiro"/></label><label><span>Tipo</span><select value={kind} onChange={(event) => setKind(event.target.value as StakeholderKind)}>{Object.entries(STAKEHOLDER_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Papel</span><input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Ex.: realiza a coleta"/></label><label className="wide"><span>Contexto</span><textarea rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="O que precisamos saber sobre este ator dentro do serviço?"/></label><label><span>Influência · {influence}/5</span><input type="range" min="1" max="5" value={influence} onChange={(event) => setInfluence(clampInfluence(event.target.value))}/></label><label><span>Interesse · {interest}/5</span><input type="range" min="1" max="5" value={interest} onChange={(event) => setInterest(clampInfluence(event.target.value))}/></label></div><footer><button type="button" onClick={() => setCreateOpen(false)}>Cancelar</button><button type="button" className="primary" onClick={createStakeholder}><Plus size={14}/> Adicionar stakeholder</button></footer></div></div>}
  </section>;
}

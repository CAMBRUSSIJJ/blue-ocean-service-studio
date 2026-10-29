import { useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { Check, ChevronDown, GripVertical, MoreHorizontal, Plus, Trash2, X } from '../design-system/icons';

export type ContextCanvasBlock = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  essential?: boolean;
};

export type ContextCanvasCriterion = {
  id: string;
  label: string;
  complete: boolean;
  connectTo?: string[];
  addBlockId?: string;
};

export type ContextCanvasRelation = {
  id: string;
  kind: string;
  title: string;
  linked: boolean;
};

type Props = {
  entityId: string;
  kind: string;
  blocks: ContextCanvasBlock[];
  checks: ContextCanvasCriterion[];
  relations: ContextCanvasRelation[];
  score: number;
  onToggleRelation: (id: string) => void;
};

/** Progressive inline content canvas, independent from the entity storage implementation. */
export function ContextEntityCanvas({ entityId, kind, blocks, checks, relations, score, onToggleRelation }: Props) {
  const key = `bo-context-canvas:${kind}:${entityId}`;
  const [order, setOrder] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [wide, setWide] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [picker, setPicker] = useState<string | null>(null);
  const [relationFilter, setRelationFilter] = useState('');
  const [dragBlock, setDragBlock] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? '{}') as { order?: unknown; expanded?: unknown; wide?: unknown };
      const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
      setOrder(strings(saved.order)); setExpanded(strings(saved.expanded)); setWide(strings(saved.wide));
    } catch { setOrder([]); setExpanded([]); setWide([]); }
    setMenu(null); setPicker(null); setAddOpen(false);
  }, [key]);
  const updateLayout = (next: { order?: string[]; expanded?: string[]; wide?: string[] }) => {
    const value = { order: next.order ?? order, expanded: next.expanded ?? expanded, wide: next.wide ?? wide };
    setOrder(value.order); setExpanded(value.expanded); setWide(value.wide);
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage optional */ }
  };
  const arranged = useMemo(() => {
    const rank = (id: string) => { const index = order.indexOf(id); return index < 0 ? order.length + blocks.findIndex((block) => block.id === id) : index; };
    return [...blocks].sort((a, b) => rank(a.id) - rank(b.id));
  }, [blocks, order]);
  const isOpen = (block: ContextCanvasBlock) => block.essential || Boolean(block.value.trim()) || expanded.includes(block.id);
  const visible = arranged.filter(isOpen);
  const hidden = arranged.filter((block) => !isOpen(block));
  const openBlock = (id: string) => updateLayout({ expanded: [...new Set([...expanded, id])] });
  const closeBlock = (block: ContextCanvasBlock) => {
    if (block.essential) return;
    if (block.value.trim() && !window.confirm(`Apagar o conteúdo de “${block.label}” e ocultar o bloco?`)) return;
    block.onChange('');
    updateLayout({ expanded: expanded.filter((id) => id !== block.id), wide: wide.filter((id) => id !== block.id) });
    setMenu(null);
  };
  const moveBlock = (id: string, direction: number) => {
    const ids = visible.map((block) => block.id), from = ids.indexOf(id), to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    updateLayout({ order: [...ids, ...arranged.map((block) => block.id).filter((name) => !ids.includes(name))] });
    setMenu(null);
  };
  const drop = (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();
    const dragged = event.dataTransfer.getData('application/x-bo-context-block') || dragBlock;
    if (dragged && blocks.some((block) => block.id === dragged)) {
      if (dragged !== targetId) {
        const ids = arranged.map((block) => block.id).filter((id) => id !== dragged);
        const index = ids.indexOf(targetId);
        ids.splice(Math.max(index, 0), 0, dragged);
        updateLayout({ order: ids });
      }
    } else {
      const relationId = event.dataTransfer.getData('application/x-bo-context-relation');
      const relation = relations.find((item) => item.id === relationId);
      if (relation && !relation.linked) {
        onToggleRelation(relation.id);
        setNotice(`Relação criada com “${relation.title}”.`);
      }
    }
    setDragBlock(null);
  };
  const toggleWidth = (id: string) => {
    updateLayout({ wide: wide.includes(id) ? wide.filter((name) => name !== id) : [...wide, id] });
    setMenu(null);
  };
  const activeCheck = checks.find((check) => check.id === picker);
  const options = relations.filter((item) => activeCheck?.connectTo?.includes(item.kind) && item.title.toLocaleLowerCase('pt-BR').includes(relationFilter.toLocaleLowerCase('pt-BR')));
  const kindLabels: Record<string,string> = {
    persona: 'Persona', need: 'Necessidade', job: 'Job', pain: 'Dor',
    evidence: 'Evidência', problem: 'Problema', problemHypothesis: 'Hipótese',
  };
  const bank = [...relations].sort((a,b) => Number(a.linked) - Number(b.linked)).slice(0,6);

  return <div className="bo-context-editor-layout" data-context-entity-canvas={kind}>
    <main className="bo-context-canvas-main" aria-label="Canvas de edição">
      <div className="bo-context-canvas-blocks">
        {visible.map((block) => <section key={block.id} data-context-block={block.id} className={`bo-context-canvas-card ${wide.includes(block.id) ? 'is-wide' : ''}`}
          onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, block.id)}>
          <header>
            <strong>{block.label}</strong>
            <div className="bo-context-card-tools">
              <button type="button" draggable title={`Arrastar ${block.label}`} aria-label={`Arrastar ${block.label}`} onDragStart={(event) => {
                event.dataTransfer.setData('application/x-bo-context-block', block.id);
                event.dataTransfer.effectAllowed = 'move'; setDragBlock(block.id);
              }} onDragEnd={() => setDragBlock(null)}><GripVertical size={15}/></button>
              <button type="button" aria-label={`Opções de ${block.label}`} aria-expanded={menu === block.id} title="Opções do bloco" onClick={() => setMenu(menu === block.id ? null : block.id)}><MoreHorizontal size={17}/></button>
              {menu === block.id && <div className="bo-context-card-menu">
                <button type="button" onClick={() => moveBlock(block.id, -1)}>Mover para antes</button>
                <button type="button" onClick={() => moveBlock(block.id, 1)}>Mover para depois</button>
                <button type="button" onClick={() => toggleWidth(block.id)}>{wide.includes(block.id) ? 'Tamanho normal' : 'Redimensionar'}</button>
                {!block.essential && <button type="button" className="is-danger" onClick={() => closeBlock(block)}><Trash2 size={13}/> Remover</button>}
              </div>}
            </div>
          </header>
          <textarea aria-label={block.label} rows={5} value={block.value} placeholder={block.placeholder} onChange={(event) => block.onChange(event.target.value)} />
        </section>)}
      </div>
      {hidden.length > 0 && <div className="bo-context-ghost-grid" aria-label="Blocos opcionais">
        {hidden.map((block) => <button type="button" key={block.id} className="bo-context-ghost" onClick={() => openBlock(block.id)}>
          <Plus size={19}/><span>{block.label}</span>
        </button>)}
      </div>}
      <div className="bo-context-add-wrap"><button type="button" className="bo-context-add" aria-expanded={addOpen} onClick={() => setAddOpen(!addOpen)}><Plus size={14}/> Adicionar bloco <ChevronDown size={13}/></button>
        {addOpen && <div className="bo-context-add-menu">{hidden.length ? hidden.map((block) => <button type="button" key={block.id} onClick={() => { openBlock(block.id); setAddOpen(false); }}>{block.label}</button>) : <p>Todos os blocos estão visíveis.</p>}</div>}
      </div>
    </main>
    <aside className="bo-context-canvas-aside">
      <section className="bo-context-criteria" aria-label="Critérios mínimos">
        <header><strong>Critérios mínimos</strong><span>{checks.filter((item) => item.complete).length}/{checks.length}</span></header>
        <div className="bo-context-criteria-progress" role="progressbar" aria-label="Critérios atendidos" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${score}%` }}/></div>
        {checks.map((check) => <div className="bo-context-criterion" key={check.id}>
          <span className={check.complete ? 'is-done' : ''} aria-hidden="true">{check.complete && <Check size={12}/>}</span>
          <strong>{check.label}</strong>
          {check.addBlockId && !check.complete && <button type="button" onClick={() => openBlock(check.addBlockId!)}>Adicionar</button>}
          {check.connectTo && <button type="button" onClick={() => { setPicker(picker === check.id ? null : check.id); setRelationFilter(''); }}>{check.complete ? 'Editar' : 'Conectar'}</button>}
        </div>)}
        {activeCheck?.connectTo && <div className="bo-context-picker">
          <div className="bo-context-picker-head"><strong>Conectar {activeCheck.label.toLowerCase()}</strong><button type="button" aria-label="Fechar relações" onClick={() => setPicker(null)}><X size={14}/></button></div>
          <input type="search" value={relationFilter} onChange={(event) => setRelationFilter(event.target.value)} aria-label="Buscar relações" placeholder="Buscar no Service Graph"/>
          <div className="bo-context-picker-results">
            {options.length ? options.map((item) => <button type="button" key={item.id} aria-pressed={item.linked} onClick={() => onToggleRelation(item.id)}><span>{item.title}</span>{item.linked ? <Check size={13}/> : <Plus size={13}/>}</button>) : <p>Nenhum item disponível. Crie-o na aba correspondente.</p>}
          </div>
        </div>}
      </section>
      <section className="bo-context-relations-bank" aria-label="Banco de relações rápidas">
        <header><strong>Relações rápidas</strong><small>Arraste para um bloco ou clique para conectar.</small></header>
        {bank.length ? bank.map((relation) => <button type="button" draggable key={relation.id} aria-pressed={relation.linked}
          onDragStart={(event) => { event.dataTransfer.setData('application/x-bo-context-relation', relation.id); event.dataTransfer.effectAllowed = 'copy'; }}
          onClick={() => onToggleRelation(relation.id)}>
          <span><small>{kindLabels[relation.kind] ?? relation.kind}</small><strong>{relation.title}</strong></span>
          {relation.linked ? <Check size={15}/> : <GripVertical size={15}/>}
        </button>) : <p>Crie Personas ou Evidências para relacionar esta Dor.</p>}
      </section>
      {notice && <p className="bo-context-relation-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dispensar mensagem"><X size={12}/></button></p>}
    </aside>
  </div>;
}

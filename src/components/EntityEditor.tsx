import { useEffect, useMemo, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { ArrowLeft, Check, ChevronDown, GripVertical, MoreHorizontal, Plus, Trash2, X } from '../design-system/icons';

export type EntityEditorBlock = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  essential?: boolean;
};
export type EntityEditorCheck = {
  id: string;
  label: string;
  complete: boolean;
  connectTo?: string[];
};
export type EntityEditorRelation = { id: string; kind: string; title: string; linked: boolean };

type EntityEditorProps = {
  entityId: string;
  kind: string;
  backLabel: string;
  onBack: () => void;
  title: string;
  titlePlaceholder?: string;
  onTitleChange: (value: string) => void;
  warning?: string;
  properties: ReactNode;
  score: number;
  saveStatus: 'saved' | 'pending' | 'saving' | 'error';
  onRemove: () => void;
  tabs: ReactNode;
  overview: boolean;
  blocks: EntityEditorBlock[];
  checks: EntityEditorCheck[];
  relations: EntityEditorRelation[];
  onToggleRelation: (id: string) => void;
  children?: ReactNode;
};

function BlockTextarea({ block }: { block: EntityEditorBlock }) {
  return <textarea
    rows={4}
    aria-label={block.label}
    value={block.value}
    placeholder={block.placeholder}
    onChange={(event) => block.onChange(event.target.value)}
  />;
}

/** Editor compartilhado: os dados continuam pertencendo ao Service Graph de cada entidade. */
export function EntityEditor(props: EntityEditorProps) {
  const {
    entityId, kind, backLabel, onBack, title, titlePlaceholder, onTitleChange, warning, properties, score,
    saveStatus, onRemove, tabs, overview, blocks, checks, relations, onToggleRelation, children,
  } = props;
  const storageKey = `bo-entity-block-order:${kind}:${entityId}`;
  const [order, setOrder] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [picker, setPicker] = useState<string | null>(null);
  const [relationSearch, setRelationSearch] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setOrder(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []);
    } catch { setOrder([]); }
    setAdded([]); setAddOpen(false); setMenuOpen(false); setPicker(null); setRelationSearch('');
  }, [storageKey]);

  const orderedBlocks = useMemo(() => [...blocks].sort((a, b) => {
    const aPos = order.indexOf(a.id), bPos = order.indexOf(b.id);
    return (aPos < 0 ? blocks.indexOf(a) + order.length : aPos)
      - (bPos < 0 ? blocks.indexOf(b) + order.length : bPos);
  }), [blocks, order]);
  const isVisible = (block: EntityEditorBlock) => block.essential || Boolean(block.value.trim()) || added.includes(block.id);
  const hidden = orderedBlocks.filter((block) => !isVisible(block));
  const visible = orderedBlocks.filter(isVisible);

  const commitOrder = (next: string[]) => {
    setOrder(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* limited storage */ }
  };
  const moveBlock = (id: string, direction: -1 | 1) => {
    const ids = visible.map((block) => block.id);
    const index = ids.indexOf(id), other = index + direction;
    if (index < 0 || other < 0 || other >= ids.length) return;
    [ids[index], ids[other]] = [ids[other], ids[index]];
    commitOrder([...ids, ...orderedBlocks.map((block) => block.id).filter((name) => !ids.includes(name))]);
  };
  const dropBlock = (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const ids = orderedBlocks.map((block) => block.id).filter((id) => id !== dragId);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    commitOrder(ids); setDragId(null);
  };

  const activeCheck = checks.find((check) => check.id === picker);
  const pickerOptions = relations.filter((relation) => activeCheck?.connectTo?.includes(relation.kind)
    && relation.title.toLocaleLowerCase('pt-BR').includes(relationSearch.toLocaleLowerCase('pt-BR')));

  return <section className="bo-entity-editor" data-entity-editor={kind}>
    <header className="bo-entity-top">
      <div className="bo-entity-topline">
        <button type="button" className="bo-entity-back" onClick={onBack}><ArrowLeft size={16}/> {backLabel}</button>
        <div className="bo-entity-top-actions">
          <span className={`bo-entity-save is-${saveStatus}`} role="status" aria-live="polite">
            {saveStatus === 'error' ? 'Erro ao salvar' : saveStatus === 'saved' ? <><Check size={14}/> Salvo</> : 'Salvando…'}
          </span>
          <div className="bo-entity-menu-wrap">
            <button type="button" className="bo-entity-icon-button" aria-label="Mais ações" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={18}/></button>
            {menuOpen && <div className="bo-entity-menu"><button type="button" className="danger" onClick={() => { setMenuOpen(false); onRemove(); }}><Trash2 size={14}/> Remover {kind.toLowerCase()}</button></div>}
          </div>
        </div>
      </div>
      <div className="bo-entity-statement">
        <label htmlFor="bo-entity-title">{kind}</label>
        <textarea id="bo-entity-title" className="bo-entity-title" rows={2} value={title} onChange={(event) => onTitleChange(event.target.value)} aria-label={`Enunciado da ${kind.toLowerCase()}`} placeholder={titlePlaceholder || "Descreva o objetivo principal"}/>
        {warning && <p className="bo-entity-warning" role="note">{warning}</p>}
      </div>
      <div className="bo-entity-properties">{properties}</div>
      <div className="bo-entity-score" title="Progresso dos critérios mínimos">
        <span>Completude do perfil</span><div className="bo-entity-progress" role="progressbar" aria-label="Completude do perfil" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}><b style={{ width: `${score}%` }}/></div><strong>{score}%</strong>
      </div>
    </header>
    <nav className="bo-h71-detail-tabs bo-entity-tabs">{tabs}</nav>
    {overview
      ? <div className="bo-entity-workspace">
        <main className="bo-entity-blocks" aria-label="Blocos de edição">
          <div className="bo-entity-block-grid">
            {visible.map((block) => <section key={block.id} className="bo-entity-block" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropBlock(event, block.id)}>
              <header>
                <strong>{block.label}</strong>
                <div className="bo-entity-block-controls">
                  <button type="button" className="bo-entity-drag" draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDragId(block.id); }} onDragEnd={() => setDragId(null)} aria-label={`Arrastar ${block.label}`} title="Arrastar para reorganizar"><GripVertical size={15}/></button>
                  <button type="button" onClick={() => moveBlock(block.id, -1)} aria-label={`Mover ${block.label} para cima`} title="Mover para antes">↑</button>
                  <button type="button" onClick={() => moveBlock(block.id, 1)} aria-label={`Mover ${block.label} para baixo`} title="Mover para depois">↓</button>
                  {!block.essential && <button type="button" onClick={() => {
                    if (block.value.trim() && !window.confirm(`Apagar o conteúdo de “${block.label}” e remover o bloco?`)) return;
                    block.onChange(''); setAdded((value) => value.filter((id) => id !== block.id));
                  }} aria-label={`Remover bloco ${block.label}`} title="Remover bloco"><X size={14}/></button>}
                </div>
              </header>
              <BlockTextarea block={block}/>
            </section>)}
          </div>
          <div className="bo-entity-add">
            <button type="button" aria-expanded={addOpen} onClick={() => setAddOpen(!addOpen)}><Plus size={16}/> Adicionar bloco <ChevronDown size={14}/></button>
            {addOpen && <div className="bo-entity-add-menu">{hidden.length ? hidden.map((block) => <button type="button" key={block.id} onClick={() => { setAdded((value) => [...value, block.id]); setAddOpen(false); }}>{block.label}</button>) : <span>Todos os blocos estão visíveis</span>}</div>}
          </div>
        </main>
        <aside className="bo-entity-criteria" aria-label="Critérios mínimos">
          <header><strong>Critérios mínimos</strong><span>{checks.filter((check) => check.complete).length}/{checks.length}</span></header>
          <p>Os critérios são atualizados conforme você preenche e conecta informações.</p>
          <div className="bo-entity-criteria-list">
            {checks.map((check) => <div className="bo-entity-check" key={check.id}>
              <span className={check.complete ? 'is-done' : ''} aria-hidden="true">{check.complete && <Check size={12}/>}</span>
              <div><strong>{check.label}</strong>{check.connectTo && !check.complete && <button type="button" className="bo-entity-connect" onClick={() => { setPicker(picker === check.id ? null : check.id); setRelationSearch(''); }}>Conectar</button>}</div>
            </div>)}
          </div>
          {activeCheck?.connectTo && <div className="bo-entity-relation-picker">
            <div className="bo-entity-picker-head"><strong>Conectar {activeCheck.label.toLowerCase()}</strong><button type="button" aria-label="Fechar seletor" onClick={() => setPicker(null)}><X size={14}/></button></div>
            <input type="search" placeholder="Buscar no Service Graph" aria-label="Buscar relação" value={relationSearch} onChange={(event) => setRelationSearch(event.target.value)}/>
            <div className="bo-entity-picker-options">{pickerOptions.length ? pickerOptions.map((relation) => <button type="button" key={relation.id} onClick={() => onToggleRelation(relation.id)} aria-pressed={relation.linked}><span>{relation.title}</span>{relation.linked ? <Check size={14}/> : <Plus size={14}/>}</button>) : <p>Nenhum item encontrado. Crie-o na aba correspondente.</p>}</div>
          </div>}
        </aside>
      </div>
      : <div className="bo-h71-detail-body bo-entity-secondary">{children}</div>}
  </section>;
}

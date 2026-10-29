import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { ArrowLeft, BriefcaseBusiness, Check, ChevronDown, GripVertical, HeartCrack, Layers3, Lightbulb, MoreHorizontal, Plus, Target, Trash2, UsersRound, X } from '../design-system/icons';

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
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => { if (titleRef.current) { titleRef.current.style.height = 'auto'; titleRef.current.style.height = `${titleRef.current.scrollHeight}px`; } }, [title]);
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = previous; }; }, []);

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

  const navigation = [
    { page: 'personas', label: 'Personas', Icon: UsersRound },
    { page: 'needs', label: 'Necessidades', Icon: Target },
    { page: 'jobs', label: 'Jobs', Icon: BriefcaseBusiness },
    { page: 'pains', label: 'Dores', Icon: HeartCrack },
    { page: 'hypotheses', label: 'Hipóteses', Icon: Lightbulb },
  ] as const;
  const navigateTo = (page: typeof navigation[number]['page']) => {
    if (page === 'needs') { onBack(); return; }
    onBack();
    window.dispatchEvent(new CustomEvent('bo-open-context-page', { detail: page }));
  };
  const removeOptionalBlock = (block: EntityEditorBlock) => {
    if (block.value.trim() && !window.confirm(`Apagar o conteúdo de “${block.label}” e remover o bloco?`)) return;
    block.onChange('');
    setAdded((value) => value.filter((id) => id !== block.id));
  };

  return <section className="bo-entity-editor" data-entity-editor={kind} aria-label={`Editor de ${kind}`}>
    <aside className="bo-entity-rail" aria-label="Navegação do público-alvo">
      <div className="bo-entity-brand" title="Blue Ocean Service Studio"><Layers3 size={23}/></div>
      <nav>{navigation.map(({page,label,Icon}) => <button key={page} type="button" className={page === 'needs' ? 'is-active' : ''} title={label} aria-label={label} aria-current={page === 'needs' ? 'page' : undefined} onClick={() => navigateTo(page)}><Icon size={17}/><span>{label}</span></button>)}</nav>
      <button className="bo-entity-rail-exit" type="button" onClick={onBack} title="Voltar à biblioteca" aria-label="Voltar à biblioteca"><ArrowLeft size={17}/></button>
    </aside>
    <div className="bo-entity-shell">
      <header className="bo-entity-global-bar">
        <strong>Edição de {backLabel}</strong>
        <div className="bo-entity-global-actions">
          <div className="bo-entity-sections-wrap">
            <button type="button" className="bo-entity-sections-trigger" aria-expanded={sectionMenuOpen} onClick={() => setSectionMenuOpen((state) => !state)}>Seções <ChevronDown size={13}/></button>
            {sectionMenuOpen && <nav className="bo-entity-sections-menu" aria-label="Seções da entidade" onClick={() => setSectionMenuOpen(false)}>{tabs}</nav>}
          </div>
          <div className="bo-entity-fitness" aria-label={`Força do perfil: ${score}%`}>
            <span className="bo-entity-fitness-ring" style={{ background: `conic-gradient(#4dc68c ${score}%, #404a50 0)` }} aria-hidden="true"><i/></span>
            <span>Força do Perfil <b>({score}%)</b></span>
          </div>
        </div>
      </header>
      <div className="bo-entity-scroll">
        <div className="bo-entity-main-container">
          <section className="bo-entity-statement">
            <textarea ref={titleRef} id="bo-entity-title" className="bo-entity-title" rows={1} value={title} onChange={(event) => onTitleChange(event.target.value)} aria-label={`Enunciado da ${kind.toLowerCase()}`} placeholder={titlePlaceholder || 'Descreva o que precisa ser resolvido'}/>
            {warning && <p className="bo-entity-warning" role="note"><span aria-hidden="true">⚠</span> {warning}</p>}
          </section>
          <div className="bo-entity-meta">
            <div className="bo-entity-properties">{properties}</div>
            <div className="bo-entity-top-actions">
              <span className={`bo-entity-save is-${saveStatus}`} role="status" aria-live="polite">
                {saveStatus === 'error' ? 'Erro ao salvar' : saveStatus === 'saved' ? <><Check size={14}/> Salvo</> : 'Salvando…'}
              </span>
              <button type="button" className="bo-entity-delete" aria-label={`Excluir ${kind.toLowerCase()}`} title={`Excluir ${kind.toLowerCase()}`} onClick={onRemove}><Trash2 size={14}/> Excluir</button>
              <div className="bo-entity-menu-wrap">
                <button type="button" className="bo-entity-icon-button" aria-label="Mais ações" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={17}/></button>
                {menuOpen && <div className="bo-entity-menu">
                  <button type="button" onClick={() => { setMenuOpen(false); onBack(); }}><ArrowLeft size={14}/> Voltar à biblioteca</button>
                  <button type="button" className="danger" onClick={() => { setMenuOpen(false); onRemove(); }}><Trash2 size={14}/> Remover {kind.toLowerCase()}</button>
                </div>}
              </div>
            </div>
          </div>
          {overview ? <div className="bo-entity-workspace">
            <main className="bo-entity-blocks" aria-label="Blocos de edição">
              <div className="bo-entity-block-grid">
                {visible.map((block) => <section key={block.id} className="bo-entity-block" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropBlock(event, block.id)}>
                  <header>
                    <strong>{block.label}</strong>
                    <div className="bo-entity-block-controls">
                      <button type="button" className="bo-entity-drag" draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDragId(block.id); }} onDragEnd={() => setDragId(null)} aria-label={`Arrastar ${block.label}`} title="Arrastar para reorganizar"><GripVertical size={15}/></button>
                      <button type="button" onClick={() => moveBlock(block.id, -1)} aria-label={`Mover ${block.label} para cima`} title="Mover para antes">↑</button>
                      <button type="button" onClick={() => moveBlock(block.id, 1)} aria-label={`Mover ${block.label} para baixo`} title="Mover para depois">↓</button>
                      {!block.essential && <button type="button" onClick={() => removeOptionalBlock(block)} aria-label={`Remover bloco ${block.label}`} title="Remover bloco"><X size={14}/></button>}
                    </div>
                  </header>
                  <BlockTextarea block={block}/>
                </section>)}
              </div>
              {hidden.length > 0 && <div className="bo-entity-ghost-grid" aria-label="Adicionar blocos opcionais">
                {hidden.map((block) => <button type="button" className="bo-entity-ghost" key={block.id} onClick={() => setAdded((value) => [...value,block.id])}><Plus size={23}/><span>{block.label}</span></button>)}
              </div>}
              <div className="bo-entity-add">
                <button type="button" aria-expanded={addOpen} onClick={() => setAddOpen(!addOpen)}><Plus size={15}/> Adicionar bloco <ChevronDown size={13}/></button>
                {addOpen && <div className="bo-entity-add-menu">{hidden.length ? hidden.map((block) => <button type="button" key={block.id} onClick={() => { setAdded((value) => [...value,block.id]); setAddOpen(false); }}>{block.label}</button>) : <span>Todos os blocos estão visíveis</span>}</div>}
              </div>
            </main>
            <aside className="bo-entity-criteria" aria-label="Critérios mínimos">
              <header><strong>Critérios mínimos</strong><div className="bo-entity-criteria-strength"><span>{checks.filter((check) => check.complete).length}/{checks.length}</span><i><b style={{width:`${score}%`}}/></i></div></header>
              <div className="bo-entity-criteria-list">
                {checks.map((check) => <div className="bo-entity-check" key={check.id}>
                  <span className={check.complete ? 'is-done' : ''} aria-hidden="true">{check.complete && <Check size={12}/>}</span>
                  <strong>{check.label}</strong>
                  {check.connectTo && <button type="button" className="bo-entity-connect" onClick={() => { setPicker(picker === check.id ? null : check.id); setRelationSearch(''); }}>{check.complete ? 'Editar' : 'Conectar'}</button>}
                </div>)}
              </div>
              {activeCheck?.connectTo && <div className="bo-entity-relation-picker">
                <div className="bo-entity-picker-head"><strong>Conectar {activeCheck.label.toLowerCase()}</strong><button type="button" aria-label="Fechar seletor" onClick={() => setPicker(null)}><X size={14}/></button></div>
                <input type="search" placeholder="Buscar no Service Graph" aria-label="Buscar relação" value={relationSearch} onChange={(event) => setRelationSearch(event.target.value)}/>
                <div className="bo-entity-picker-options">{pickerOptions.length ? pickerOptions.map((relation) => <button type="button" key={relation.id} onClick={() => onToggleRelation(relation.id)} aria-pressed={relation.linked}><span>{relation.title}</span>{relation.linked ? <Check size={14}/> : <Plus size={14}/>}</button>) : <p>Nenhum item encontrado. Crie-o na aba correspondente.</p>}</div>
              </div>}
            </aside>
          </div> : <section className="bo-entity-secondary">{children}</section>}
        </div>
      </div>
    </div>
  </section>;
}

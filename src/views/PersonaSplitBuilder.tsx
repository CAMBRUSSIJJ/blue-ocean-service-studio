import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Save, Plus, Trash2, Frown, Heart, Contact, Network, ZoomIn, ZoomOut, RotateCcw } from '../design-system/icons';
import type { PersonaProfileDraft } from '../services/persona-studio';
import './persona-split-builder.css';

export type PersonaBuilderNode = { id: string; kind: 'pain' | 'need'; title: string };
type Props = {
  draft: PersonaProfileDraft;
  onChange: (draft: PersonaProfileDraft) => void;
  onSave: (nodes: PersonaBuilderNode[]) => void;
  onExit: (hasNodes?: boolean) => void;
  onGuided?: () => void;
  connections?: PersonaBuilderNode[];
  onAdd?: (kind: 'pain' | 'need', title: string) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
  existing?: boolean;
};

/** A live projection of the editor draft; new records are committed only on Save. */
export function PersonaSplitBuilder({ draft, onChange, onSave, onExit, onGuided, connections, onAdd, onRemove, readOnly = false, existing = false }: Props) {
  const [localNodes, setLocalNodes] = useState<PersonaBuilderNode[]>([]);
  const [pain, setPain] = useState(''), [need, setNeed] = useState('');
  const [zoom, setZoom] = useState(1);
  const [compact, setCompact] = useState(() => matchMedia('(max-width:800px)').matches);
  const [error, setError] = useState('');
  const root = useRef<HTMLElement>(null), first = useRef<HTMLInputElement>(null);
  const nodes = connections ?? localNodes;
  const name = draft.title.trim() || 'Persona sem nome';
  const words = name.split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word));
  const initials = (words.length > 1 ? words.slice(0, 2).map(word => word.match(/[\p{L}\p{N}]/u)?.[0]).join('') : Array.from(words[0] || 'PS').slice(0, 2).join('')).toLocaleUpperCase('pt-BR');
  useEffect(() => { const media = matchMedia('(max-width:800px)'); const update = () => setCompact(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const app = document.getElementById('root'), inert = app?.hasAttribute('inert'), overflow = document.body.style.overflow;
    app?.setAttribute('inert', ''); document.body.style.overflow = 'hidden'; first.current?.focus();
    return () => { if (!inert) app?.removeAttribute('inert'); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const keyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); onExit(localNodes.length > 0); }
    if (event.key !== 'Tab') return;
    const focusable = [...(root.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled])') || [])].filter(el => el.getClientRects().length);
    if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0]?.focus(); }
  };
  const add = (kind: 'pain' | 'need') => {
    const title = (kind === 'pain' ? pain : need).trim();
    if (!title || readOnly) return;
    setError('');
    try { if (onAdd) onAdd(kind, title); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível adicionar o registro.'); return; }
    if (!onAdd) setLocalNodes(current => [...current, { id: crypto.randomUUID(), kind, title }]);
    if (kind === 'pain') setPain(''); else setNeed('');
  };
  const remove = (id: string) => { if (readOnly) return; setError(''); try { if (onRemove) onRemove(id); else setLocalNodes(current => current.filter(node => node.id !== id)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível desvincular o registro.'); } };
  return createPortal(<section ref={root} className="bo-split-persona" role="dialog" aria-modal="true" aria-labelledby="bo-split-title" data-persona-split-builder="1" onKeyDown={keyDown}>
    <div className="bo-split-form">
      <header><div><button type="button" aria-label="Voltar do editor de Persona" onClick={() => onExit(localNodes.length > 0)}><ArrowLeft size={22}/></button><h1 id="bo-split-title">{existing ? 'Editar Perfil' : 'Novo Perfil'}</h1></div>
        <button type="button" className="bo-split-save" onClick={() => onSave(localNodes)} disabled={readOnly || !draft.title.trim()}><Save size={16}/>Salvar</button></header>
      <div className="bo-split-fields">
        <p>Preencha os dados à esquerda. O mapa do ecossistema à direita será desenhado automaticamente para visualizar o impacto desta persona no serviço.</p>
        {error && <p className="bo-split-error" role="alert">{error}</p>}
        <section className="bo-split-identity"><h2><Contact size={17}/>1. Identidade</h2>
          <label>Nome da Persona<input ref={first} value={draft.title} maxLength={140} disabled={readOnly} onChange={event => onChange({ ...draft, title: event.target.value })} placeholder="Ex.: Maria"/></label>
          <label>Situação / Contexto<textarea rows={2} value={draft.context} disabled={readOnly} onChange={event => onChange({ ...draft, context: event.target.value })} placeholder="Qual o momento de vida ou contexto de uso dessa pessoa?"/></label>
        </section>
        <h2><Network size={17}/>2. Conexões no Serviço</h2>
        {(['pain', 'need'] as const).map(kind => {
          const items = nodes.filter(node => node.kind === kind), isPain = kind === 'pain', Icon = isPain ? Frown : Heart;
          return <section className={`bo-split-connections is-${kind}`} key={kind} data-split-kind={kind}>
            <h3><Icon size={17}/>{isPain ? 'Dores' : 'Necessidades'}<span>{items.length}</span></h3>
            <p>{isPain ? 'O que frustra ou atrapalha essa pessoa hoje?' : 'O que ela realmente precisa que o serviço resolva?'}</p>
            {items.length > 0 && <ul>{items.map(node => <li key={node.id}><span>{node.title}</span><button type="button" aria-label={`Desvincular ${node.title}`} onClick={() => remove(node.id)} disabled={readOnly}><Trash2 size={15}/></button></li>)}</ul>}
            <form onSubmit={event => { event.preventDefault(); add(kind); }}><label className="bo-split-sr" htmlFor={`bo-split-${kind}`}>{isPain ? 'Adicionar dor' : 'Adicionar necessidade'}</label>
              <input id={`bo-split-${kind}`} value={isPain ? pain : need} maxLength={240} required disabled={readOnly} onChange={event => isPain ? setPain(event.target.value) : setNeed(event.target.value)} placeholder={isPain ? 'Digite uma dor e aperte Enter...' : 'Digite uma necessidade e aperte Enter...'} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }}/>
              <button type="submit" aria-label={isPain ? 'Confirmar dor' : 'Confirmar necessidade'} disabled={readOnly || !(isPain ? pain : need).trim()}><Plus size={17}/></button></form>
          </section>;
        })}
        {onGuided && !localNodes.length && <button type="button" className="bo-split-guided" onClick={onGuided}>Preenchimento guiado</button>}
      </div>
    </div>
    <div className="bo-split-canvas" aria-label="Grafo da Persona">
      <div className="bo-split-tools" role="group" aria-label="Controles do grafo">
        <button type="button" aria-label="Ampliar grafo" disabled={zoom >= 1.6} onClick={() => setZoom(value => Math.min(1.6, value + .15))}><ZoomIn size={20}/></button>
        <button type="button" aria-label="Reduzir grafo" disabled={zoom <= .4} onClick={() => setZoom(value => Math.max(.4, value - .15))}><ZoomOut size={20}/></button>
        <button type="button" aria-label="Reorganizar nós" onClick={() => setZoom(1)}><RotateCcw size={20}/></button>
      </div>
      <div className="bo-split-world" style={{ transform: `translate(-50%,-50%) scale(${zoom * (compact ? .55 : 1)})`, width: `${Math.max(600, Math.ceil(nodes.length / 10) * 600)}px`, height: `${Math.max(600, Math.ceil(nodes.length / 10) * 600)}px` }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{nodes.map((node, i) => {
          const angle = i * 2 * Math.PI / nodes.length - Math.PI / 2, radius = 35 + (i % 2 ? 2 : 0);
          return <line key={node.id} x1="50" y1="50" x2={50 + radius * Math.cos(angle)} y2={50 + radius * Math.sin(angle)} className={`is-${node.kind}`}/>;
        })}</svg>
        <div className="bo-split-center"><span>{initials}</span><strong>{name}</strong></div>
        {nodes.map((node, i) => { const angle = i * 2 * Math.PI / nodes.length - Math.PI / 2, radius = 35 + (i % 2 ? 2 : 0), Icon = node.kind === 'pain' ? Frown : Heart;
          return <div key={node.id} className={`bo-split-node is-${node.kind}`} data-split-node={node.id} style={{ left: `${50 + radius * Math.cos(angle)}%`, top: `${50 + radius * Math.sin(angle)}%` }}><Icon size={18}/><span>{node.title}</span></div>;
        })}
      </div>
      <div className="bo-split-status" role="status">Ecossistema atualizado em tempo real · {Math.round(zoom * 100)}%</div>
    </div>
  </section>, document.body);
}

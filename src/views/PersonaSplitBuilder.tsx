import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Save, Plus, Trash2, Frown, Heart, Contact, Network, ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon } from '../design-system/icons';
import type { PersonaProfileDraft } from '../services/persona-studio';
import './persona-split-builder.css';
import './persona-animated-h759.css';

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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Persona live canvas: the canonical Service Graph and transactional save flow are managed by PersonasView. */
export function PersonaSplitBuilder({ draft, onChange, onSave, onExit, onGuided, connections, onAdd, onRemove, readOnly = false, existing = false }: Props) {
  const [localNodes, setLocalNodes] = useState<PersonaBuilderNode[]>([]);
  const [pain, setPain] = useState(''), [need, setNeed] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [compact, setCompact] = useState(() => typeof matchMedia === 'function' && matchMedia('(max-width:800px)').matches);
  const [error, setError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const root = useRef<HTMLElement>(null), first = useRef<HTMLInputElement>(null);
  const dragging = useRef<{ id: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const nodes = connections ?? localNodes;
  const name = draft.title.trim() || 'Persona sem nome';
  const words = name.split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word));
  const initials = (words.length > 1 ? words.slice(0, 2).map(word => word.match(/[\p{L}\p{N}]/u)?.[0]).join('') : Array.from(words[0] || 'PS').slice(0, 2).join('')).toLocaleUpperCase('pt-BR');
  const portraitUrl = draft.imageUrl?.trim() && /^https:\/\//i.test(draft.imageUrl.trim()) ? draft.imageUrl.trim() : '';
  const portrait = Boolean(portraitUrl && !imageFailed);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia('(max-width:800px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => setImageFailed(false), [draft.imageUrl]);
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
    try { if (onAdd) onAdd(kind, title); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível adicionar o registro.'); return; }
    if (!onAdd) setLocalNodes(current => [...current, { id: crypto.randomUUID(), kind, title }]);
    if (kind === 'pain') setPain(''); else setNeed('');
  };

  const remove = (id: string) => {
    if (readOnly) return;
    setError('');
    try { if (onRemove) onRemove(id); else setLocalNodes(current => current.filter(node => node.id !== id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível desvincular o registro.'); }
  };

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('.bo-split-tools, .bo-split-center, .bo-split-node, .bo-split-status')) return;
    dragging.current = { id: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current || dragging.current.id !== event.pointerId) return;
    setPan({ x: clamp(dragging.current.panX + event.clientX - dragging.current.x, -650, 650), y: clamp(dragging.current.panY + event.clientY - dragging.current.y, -650, 650) });
  };
  const pointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current?.id !== event.pointerId) return;
    dragging.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const count = (kind: 'pain' | 'need') => nodes.filter(node => node.kind === kind).length;

  return createPortal(<section ref={root} className="bo-split-persona bo-h759-persona" role="dialog" aria-modal="true" aria-labelledby="bo-split-title" data-persona-split-builder="1" data-persona-animated-builder="H7.59" onKeyDown={keyDown}>
    <div className="bo-split-form">
      <header>
        <div><button type="button" aria-label="Voltar do editor de Persona" onClick={() => onExit(localNodes.length > 0)}><ArrowLeft size={21}/></button><h1 id="bo-split-title">{existing ? 'Editar Perfil' : 'Novo Perfil'}</h1></div>
        <button type="button" className="bo-split-save" onClick={() => onSave(localNodes)} disabled={readOnly || !draft.title.trim()} title={!draft.title.trim() ? 'Informe o nome da Persona para salvar' : 'Salvar Persona'}><Save size={16}/> Salvar</button>
      </header>
      <div className="bo-split-fields">
        <p>Preencha os dados à esquerda. As conexões aparecerão no ecossistema à direita enquanto você trabalha.</p>
        {error && <p className="bo-split-error" role="alert">{error}</p>}
        <section className="bo-split-identity" aria-labelledby="bo-h759-identity-heading">
          <h2 id="bo-h759-identity-heading"><Contact size={16}/>1. Identidade</h2>
          <label>Nome da Persona
            <input ref={first} value={draft.title} maxLength={140} disabled={readOnly} onChange={event => onChange({ ...draft, title: event.target.value })} placeholder="Ex.: Maria"/>
          </label>
          <label>Situação / Contexto
            <textarea rows={3} value={draft.context} disabled={readOnly} onChange={event => onChange({ ...draft, context: event.target.value })} placeholder="Qual o momento de vida ou contexto de uso dessa pessoa?"/>
          </label>
          <details className="bo-h759-portrait-settings">
            <summary><ImageIcon size={15}/> Foto da Persona (opcional)</summary>
            <label>URL da imagem
              <input type="url" value={draft.imageUrl ?? ''} onChange={event => onChange({ ...draft, imageUrl: event.target.value })} disabled={readOnly} placeholder="https://exemplo.com/retrato.jpg"/>
            </label>
            <p>Sem imagem, o perfil usa iniciais. O retrato é uma referência visual, não uma informação obrigatória sobre gênero.</p>
            {Boolean(draft.imageUrl?.trim()) && <button type="button" disabled={readOnly} onClick={() => onChange({ ...draft, imageUrl: '' })}>Remover foto</button>}
          </details>
        </section>
        <section className="bo-h759-relationships" aria-labelledby="bo-h759-relationships-heading">
          <h2 id="bo-h759-relationships-heading"><Network size={16}/>2. Conexões no Serviço</h2>
          {(['pain', 'need'] as const).map(kind => {
            const items = nodes.filter(node => node.kind === kind), isPain = kind === 'pain', Icon = isPain ? Frown : Heart;
            return <section className={`bo-split-connections is-${kind}`} key={kind} data-split-kind={kind}>
              <h3><Icon size={17}/>{isPain ? 'Dores' : 'Necessidades'}<span aria-label={`${items.length} registros`}>{items.length}</span></h3>
              <p>{isPain ? 'O que frustra ou atrapalha essa pessoa hoje?' : 'O que ela realmente precisa que o serviço resolva?'}</p>
              {items.length > 0 && <ul>{items.map(node => <li key={node.id}><span>{node.title}</span><button type="button" aria-label={`Desvincular ${node.title}`} onClick={() => remove(node.id)} disabled={readOnly}><Trash2 size={15}/></button></li>)}</ul>}
              <form onSubmit={event => { event.preventDefault(); add(kind); }}>
                <label className="bo-split-sr" htmlFor={`bo-split-${kind}`}>{isPain ? 'Adicionar dor' : 'Adicionar necessidade'}</label>
                <input id={`bo-split-${kind}`} value={isPain ? pain : need} maxLength={240} required disabled={readOnly} onChange={event => isPain ? setPain(event.target.value) : setNeed(event.target.value)} placeholder={isPain ? 'Digite uma dor...' : 'Digite uma necessidade...'} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }}/>
                <button type="submit" aria-label={isPain ? 'Confirmar dor' : 'Confirmar necessidade'} disabled={readOnly || !(isPain ? pain : need).trim()}><Plus size={17}/></button>
              </form>
            </section>;
          })}
          {onGuided && !localNodes.length && !readOnly && <button type="button" className="bo-split-guided" onClick={onGuided}>Preenchimento guiado</button>}
        </section>
      </div>
    </div>
    <div className="bo-split-canvas" aria-label="Grafo da Persona" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
      <div className="bo-split-tools" role="group" aria-label="Controles do grafo">
        <button type="button" aria-label="Ampliar grafo" title="Aumentar zoom" disabled={zoom >= 1.6} onClick={() => setZoom(value => clamp(value + .15, .4, 1.6))}><ZoomIn size={19}/></button>
        <button type="button" aria-label="Reduzir grafo" title="Reduzir zoom" disabled={zoom <= .4} onClick={() => setZoom(value => clamp(value - .15, .4, 1.6))}><ZoomOut size={19}/></button>
        <span className="bo-h759-tools-separator" aria-hidden="true"/>
        <button type="button" aria-label="Reorganizar nós" title="Centralizar ecossistema" onClick={resetView}><RotateCcw size={19}/></button>
      </div>
      <div className="bo-split-world" style={{ transform: `translate(calc(-50% + ${pan.x}px),calc(-50% + ${pan.y}px)) scale(${zoom * (compact ? .55 : 1)})`, width: `${Math.max(600, Math.ceil(nodes.length / 10) * 600)}px`, height: `${Math.max(600, Math.ceil(nodes.length / 10) * 600)}px` }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{nodes.map((node, i) => {
          const angle = i * 2 * Math.PI / nodes.length - Math.PI / 2, radius = 35 + (i % 2 ? 2 : 0);
          return <line key={node.id} x1="50" y1="50" x2={50 + radius * Math.cos(angle)} y2={50 + radius * Math.sin(angle)} className={`is-${node.kind}`}/>;
        })}</svg>
        <div className="bo-split-center">
          <span className="bo-h759-persona-avatar" aria-hidden="true">
            {portrait ? <img src={portraitUrl} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)}/> : <span className="bo-h759-avatar-initials">{initials}</span>}
          </span>
          <strong className="bo-h759-persona-name">{name}</strong>
        </div>
        {nodes.map((node, i) => {
          const angle = i * 2 * Math.PI / nodes.length - Math.PI / 2, radius = 35 + (i % 2 ? 2 : 0), Icon = node.kind === 'pain' ? Frown : Heart;
          return <div key={node.id} className={`bo-split-node is-${node.kind}`} data-split-node={node.id} style={{ left: `${50 + radius * Math.cos(angle)}%`, top: `${50 + radius * Math.sin(angle)}%` }}><Icon size={18}/><span>{node.title}</span></div>;
        })}
      </div>
      <div className="bo-split-status" role="status" aria-live="off">
        <span className="bo-h759-status-dot" aria-hidden="true"/>
        Pré-visualização ao vivo · {count('pain')} dores · {count('need')} necessidades · {Math.round(zoom * 100)}%
      </div>
    </div>
  </section>, document.body);
}

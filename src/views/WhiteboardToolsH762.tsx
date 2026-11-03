import { useState } from 'react';
import {
  AlignHorizontalDistributeCenter, AlignLeft, ArrowUpRight, Brush, Circle, Diamond,
  Eraser, Frame, Grid3X3, Group, Hand, LayoutTemplate, Maximize2, Minus,
  MousePointer2, Plus, Redo2, RotateCcw, Shapes, Square, StickyNote,
  Type, Undo2, Users,
} from '../design-system/icons';

export type WhiteboardToolH762 =
  | 'select' | 'hand' | 'note' | 'text' | 'rect' | 'ellipse' | 'diamond'
  | 'connector' | 'brush' | 'eraser' | 'frame';

export type WhiteboardActionH762 =
  | 'undo' | 'redo' | 'zoom-in' | 'zoom-out' | 'zoom-fit'
  | 'align-left' | 'distribute' | 'organize-grid' | 'group' | 'frame-selection'
  | 'template-brainstorm' | 'template-affinity';

type Props = {
  ready: boolean;
  activeTool: WhiteboardToolH762;
  onTool: (tool: WhiteboardToolH762) => void;
  onAction: (action: WhiteboardActionH762) => void;
  onObjects: () => void;
  onClose: () => void;
};

const tools = [
  { id: 'select', label: 'Selecionar', icon: MousePointer2, tip: 'Selecionar e mover objetos · V' },
  { id: 'hand', label: 'Mover canvas', icon: Hand, tip: 'Arrastar a visualização · H' },
  { id: 'note', label: 'Post-it', icon: StickyNote, tip: 'Criar post-it. Depois clique no canvas · N' },
  { id: 'text', label: 'Texto', icon: Type, tip: 'Inserir texto onde clicar · T' },
  { id: 'rect', label: 'Retângulo', icon: Square, tip: 'Inserir retângulo · S' },
  { id: 'ellipse', label: 'Círculo', icon: Circle, tip: 'Inserir círculo' },
  { id: 'diamond', label: 'Losango', icon: Diamond, tip: 'Inserir losango' },
  { id: 'connector', label: 'Conectar', icon: ArrowUpRight, tip: 'Criar conexão arrastando entre objetos · C' },
  { id: 'brush', label: 'Desenhar', icon: Brush, tip: 'Desenho livre' },
  { id: 'eraser', label: 'Borracha', icon: Eraser, tip: 'Apagar traços e objetos com a ferramenta nativa' },
  { id: 'frame', label: 'Frame', icon: Frame, tip: 'Desenhar uma área de organização' },
] as const;

const actions = [
  { id: 'align-left', label: 'Alinhar à esquerda', icon: AlignLeft, tip: 'Alinha somente os elementos selecionados' },
  { id: 'distribute', label: 'Distribuir horizontalmente', icon: AlignHorizontalDistributeCenter, tip: 'Distribui somente 3 ou mais elementos selecionados' },
  { id: 'organize-grid', label: 'Organizar em grade', icon: Grid3X3, tip: 'Organiza somente a seleção em linhas e colunas' },
  { id: 'group', label: 'Agrupar seleção', icon: Group, tip: 'Cria um grupo nativo a partir da seleção' },
  { id: 'frame-selection', label: 'Frame da seleção', icon: Maximize2, tip: 'Cria um frame ao redor dos objetos selecionados' },
] as const;

export function WhiteboardToolsH762({ ready, activeTool, onTool, onAction, onObjects, onClose }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [menu, setMenu] = useState<'organize' | 'templates' | null>(null);
  const tool = (id: WhiteboardToolH762) => { setMenu(null); onTool(id); };
  return <aside className={`bo-h762-toolbar ${expanded ? 'is-expanded' : 'is-compact'}`} aria-label="Ferramentas de desenho do Blue Ocean" data-whiteboard-tools="H7.62">
    <header className="bo-h762-toolbar-head">
      <span>{expanded ? 'FERRAMENTAS' : 'BO'}</span>
      <button type="button" onClick={() => { setExpanded(value => !value); setMenu(null); }} aria-expanded={expanded} aria-label={expanded ? 'Recolher ferramentas' : 'Expandir ferramentas'} title={expanded ? 'Recolher ferramentas' : 'Expandir ferramentas'}>
        <Minus size={16}/>
      </button>
      <button type="button" className="bo-h762-toolbar-close" onClick={onClose} title="Ocultar ferramentas" aria-label="Ocultar ferramentas">×</button>
    </header>
    {expanded && <div className="bo-h762-toolbar-body">
      <div className="bo-h762-toolbar-group" role="toolbar" aria-label="Ferramentas do canvas">
        {tools.map(({ id, label, icon: Icon, tip }) => <button
          key={id} type="button" disabled={!ready}
          aria-pressed={activeTool === id}
          className={activeTool === id ? 'is-active' : ''}
          title={tip}
          onClick={() => tool(id)}
        ><Icon size={18} strokeWidth={1.8}/><span>{label}</span></button>)}
      </div>
      <div className="bo-h762-toolbar-divider" />
      <div className="bo-h762-toolbar-group" role="group" aria-label="Organização">
        <button type="button" disabled={!ready} aria-expanded={menu === 'organize'} onClick={() => setMenu(menu === 'organize' ? null : 'organize')}><Shapes size={18}/><span>Organizar</span></button>
        <button type="button" disabled={!ready} aria-expanded={menu === 'templates'} onClick={() => setMenu(menu === 'templates' ? null : 'templates')}><LayoutTemplate size={18}/><span>Modelos</span></button>
        <button type="button" disabled={!ready} onClick={() => { setMenu(null); onObjects(); }}><Users size={18}/><span>Objetos do serviço</span></button>
      </div>
      <div className="bo-h762-toolbar-divider" />
      <div className="bo-h762-toolbar-actions" role="group" aria-label="Histórico e visualização">
        <button type="button" disabled={!ready} title="Desfazer" aria-label="Desfazer" onClick={() => onAction('undo')}><Undo2 size={17}/></button>
        <button type="button" disabled={!ready} title="Refazer" aria-label="Refazer" onClick={() => onAction('redo')}><Redo2 size={17}/></button>
        <button type="button" disabled={!ready} title="Reduzir zoom" aria-label="Reduzir zoom" onClick={() => onAction('zoom-out')}><Minus size={17}/></button>
        <button type="button" disabled={!ready} title="Ampliar zoom" aria-label="Ampliar zoom" onClick={() => onAction('zoom-in')}><Plus size={17}/></button>
        <button type="button" disabled={!ready} title="Ajustar à tela" aria-label="Ajustar à tela" onClick={() => onAction('zoom-fit')}><RotateCcw size={17}/></button>
      </div>
    </div>}
    {expanded && menu && <div className="bo-h762-toolbar-popover" role="group" aria-label={menu === 'organize' ? 'Ferramentas de organização' : 'Modelos do Whiteboard'}>
      <div className="bo-h762-popover-title">
        <strong>{menu === 'organize' ? 'Organizar seleção' : 'Criar estrutura'}</strong>
        <button type="button" onClick={() => setMenu(null)} title="Fechar" aria-label="Fechar menu">×</button>
      </div>
      {menu === 'organize'
        ? <>{actions.map(({ id, label, icon: Icon, tip }) => <button key={id} title={tip} type="button" onClick={() => { setMenu(null); onAction(id); }}><Icon size={16}/>{label}</button>)}
          <p>Selecione dois ou mais objetos antes de organizar. Nenhum outro elemento será movido.</p>
        </>
        : <><button type="button" onClick={() => { setMenu(null); onAction('template-brainstorm'); }}><StickyNote size={16}/> Brainstorm — notas de ideias</button>
          <button type="button" onClick={() => { setMenu(null); onAction('template-affinity'); }}><LayoutTemplate size={16}/> Agrupamento por temas</button>
          <p>Modelos adicionam novas notas ao quadro atual. O conteúdo anterior não é substituído.</p>
        </>}
    </div>}
  </aside>;
}

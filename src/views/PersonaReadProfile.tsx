import { ArrowRight, Plus } from '../design-system/icons';
import type { ReactNode } from 'react';
import type { PersonaProfileDraft } from '../services/persona-studio';

type Props = {
  draft: PersonaProfileDraft;
  onEditStep: (step: number) => void;
  onNavigate: (tab: 'relations' | 'evidence' | 'usage') => void;
  counts: { relations: number; evidence: number; usage: number };
};

function ReadSection({ title, step, children, onEditStep }: {
  title: string; step: number; children: ReactNode; onEditStep: (step: number) => void;
}) {
  return <section className="bo-h751-reader-section">
    <header><h2>{title}</h2><button type="button" onClick={() => onEditStep(step)}>Editar <span aria-hidden="true">↗</span></button></header>
    {children}
  </section>;
}

export function PersonaReadProfile({ draft, onEditStep, onNavigate, counts }: Props) {
  return <article className="bo-h751-reader" data-persona-read-profile="1" aria-label="Perfil da Persona para consulta">
    <ReadSection title="Quem é esta pessoa?" step={0} onEditStep={onEditStep}>
      {draft.description.trim() ? <p className="bo-h751-reader-copy">{draft.description}</p> : <button className="bo-h751-add-detail" type="button" onClick={() => onEditStep(0)}><Plus size={15}/> Adicionar descrição</button>}
    </ReadSection>
    <ReadSection title="Objetivo principal" step={1} onEditStep={onEditStep}>
      {draft.primaryGoal.trim() ? <p className="bo-h751-reader-copy">{draft.primaryGoal}</p> : <button className="bo-h751-add-detail" type="button" onClick={() => onEditStep(1)}><Plus size={15}/> Adicionar objetivo</button>}
    </ReadSection>
    <ReadSection title="Situação de uso" step={2} onEditStep={onEditStep}>
      <div className="bo-h751-situation-grid">
        <div><small>MOMENTO DE USO</small>{draft.situation.trim() ? <p>{draft.situation}</p> : <button className="bo-h751-add-detail" type="button" onClick={() => onEditStep(2)}><Plus size={14}/> Adicionar</button>}</div>
        <div><small>CONTEXTO E AMBIENTE</small>{draft.context.trim() ? <p>{draft.context}</p> : <button className="bo-h751-add-detail" type="button" onClick={() => onEditStep(2)}><Plus size={14}/> Adicionar</button>}</div>
      </div>
    </ReadSection>
    <ReadSection title="Canais de contato" step={3} onEditStep={onEditStep}>
      {draft.channels.length ? <div className="bo-h751-channel-list">{draft.channels.map((channel, index) => <span key={channel + index}>{channel}</span>)}</div> : <button className="bo-h751-add-detail" type="button" onClick={() => onEditStep(3)}><Plus size={15}/> Adicionar canais</button>}
    </ReadSection>
    <div className="bo-h751-reader-next"><div><strong>Conecte esta Persona ao serviço</strong><p>O perfil é o ponto de partida. Relacione necessidades e evidências para usá-lo na Jornada e no Blueprint.</p></div>
      <div className="bo-h751-reader-links">
        <button type="button" onClick={() => onNavigate('relations')}>Relações <b>{counts.relations}</b><ArrowRight size={14}/></button>
        <button type="button" onClick={() => onNavigate('evidence')}>Evidências <b>{counts.evidence}</b><ArrowRight size={14}/></button>
        <button type="button" onClick={() => onNavigate('usage')}>Uso nos mapas <b>{counts.usage}</b><ArrowRight size={14}/></button>
      </div>
    </div>
  </article>;
}

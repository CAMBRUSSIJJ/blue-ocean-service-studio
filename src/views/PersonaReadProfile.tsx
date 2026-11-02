import { Plus } from '../design-system/icons';
import type { ReactNode } from 'react';
import type { PersonaProfileDraft } from '../services/persona-studio';

type Props = {
  draft: PersonaProfileDraft;
  onEditStep: (step: number) => void;
};

function ReadSection({ title, step, children, onEditStep }: {
  title: string; step: number; children: ReactNode; onEditStep: (step: number) => void;
}) {
  return <section className="bo-h751-reader-section">
    <header><h2>{title}</h2><button type="button" onClick={() => onEditStep(step)}>Editar <span aria-hidden="true">↗</span></button></header>
    {children}
  </section>;
}

export function PersonaReadProfile({ draft, onEditStep }: Props) {
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
  </article>;
}

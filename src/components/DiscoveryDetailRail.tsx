import { Check } from '../design-system/icons';
import type { ReactNode } from 'react';

export type DiscoveryCriterion = { id: string; label: string; complete: boolean };
type Props = {
  children: ReactNode;
  checks?: readonly DiscoveryCriterion[];
  score?: number;
  category?: string;
  title?: string;
  summary?: ReactNode;
};

export function DiscoveryDetailRail({
  children, checks, score, category = 'ORGANIZAÇÃO',
  title = 'Prioridade e responsabilidade', summary,
}: Props) {
  return <aside className="bo-h754-rail" aria-label="Organização e critérios do registro">
    <section className="bo-h71-editor-card bo-h754-organize">
      <header><div><small>{category}</small><strong>{title}</strong></div></header>
      <div className="bo-h71-form">{children}</div>
    </section>
    {checks && <section className="bo-h71-editor-card bo-h754-criteria">
      <header><div><small>BASE</small><strong>Critérios mínimos</strong></div>
        {typeof score === 'number' && <span>{Math.max(0,Math.min(100,Math.round(score)))}%</span>}
      </header>
      <div className="bo-h71-check-list">{checks.map(check => <div key={check.id} className={check.complete ? 'is-done' : ''}>
        <b>{check.complete ? <Check size={12}/> : '—'}</b><span>{check.label}</span>
      </div>)}</div>
    </section>}
    {summary && <section className="bo-h754-summary">{summary}</section>}
  </aside>;
}

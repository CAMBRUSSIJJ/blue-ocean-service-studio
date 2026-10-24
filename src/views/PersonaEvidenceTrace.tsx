import { useState } from 'react';
import {
  normalizePersonaEvidenceClaims, personaEvidenceStatements,
  type PersonaEvidenceField, type PersonaProfileDraft,
} from '../services/persona-studio';

type EvidenceOption = { id: string; title: string; description?: string; confidence?: string };
type Props = {
  draft: PersonaProfileDraft;
  evidence: EvidenceOption[];
  onChange: (draft: PersonaProfileDraft) => void;
};

/** Evidence is attached to the precise claim wording, never inferred from a general profile relation. */
export function PersonaEvidenceTrace({ draft, evidence, onChange }: Props) {
  const [query, setQuery] = useState('');
  const statements = personaEvidenceStatements(draft);
  const claims = normalizePersonaEvidenceClaims(draft.evidenceClaims);
  const available = new Set(evidence.map(item=>item.id));
  const visibleEvidence = evidence.filter(item=>(item.title+' '+(item.description||'')).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const linked = (field: PersonaEvidenceField, statement: string) =>
    claims.find(claim=>claim.field===field && claim.statement===statement)?.evidenceIds || [];
  const toggle = (field: PersonaEvidenceField, statement: string, evidenceId: string) => {
    if (!available.has(evidenceId)) return;
    const before = linked(field,statement);
    const ids = before.includes(evidenceId) ? before.filter(id=>id!==evidenceId) : [...before,evidenceId];
    const next = claims.filter(claim=>!(claim.field===field && claim.statement===statement));
    if (ids.length) next.push({field,statement,evidenceIds:ids});
    onChange({...draft,evidenceClaims:normalizePersonaEvidenceClaims(next)});
  };
  const sourced = statements.filter(({field,statement})=>linked(field,statement).some(id=>available.has(id))).length;

  return <section className="bo-p6-trace" aria-label="Rastreabilidade das afirmações da Persona">
    <header>
      <div><small>RASTREABILIDADE P6</small><h3>Evidências por afirmação</h3>
        <p>Associe cada afirmação à fonte que realmente a sustenta. Vincular uma fonte não valida automaticamente a afirmação.</p></div>
      <strong role="status">{sourced} de {statements.length} com fonte</strong>
    </header>
    {!statements.length ? <p className="bo-p6-empty">Preencha os campos da Persona para registrar as afirmações que precisam de evidências.</p> :
      !evidence.length ? <p className="bo-p6-empty">Não há evidências na biblioteca deste serviço. Crie uma evidência e volte aqui para associar sua fonte.</p> :
      <>
        <label className="bo-p6-evidence-search">Buscar evidência<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Pesquisar fontes" /></label>
        <div className="bo-p6-claims">
          {statements.map(({field,label,statement})=>{
            const ids = linked(field,statement), count=ids.filter(id=>available.has(id)).length;
            return <details key={field+'|'+statement} className="bo-p6-claim">
              <summary><span><small>{label}</small><b>{statement}</b></span><em>{count ? count+' fonte(s)' : 'Sem fonte'}</em></summary>
              <div className="bo-p6-sources">
                {!visibleEvidence.length && <p>Nenhuma fonte corresponde à busca.</p>}
                {visibleEvidence.map(item=><label key={item.id}>
                  <input type="checkbox" checked={ids.includes(item.id)} onChange={()=>toggle(field,statement,item.id)}
                    aria-label={'Associar '+item.title+' à afirmação '+statement.slice(0,80)} />
                  <span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span>
                </label>)}
              </div>
            </details>;
          })}
        </div>
        <p className="bo-p6-note">Ao alterar ou excluir o texto de uma afirmação, seus vínculos antigos deixam de valer e serão removidos ao salvar. O registro original da evidência não é excluído.</p>
      </>}
  </section>;
}

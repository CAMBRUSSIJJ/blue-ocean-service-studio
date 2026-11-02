import { Plus } from '../design-system/icons';

export type DiscoveryReadField = { label: string; value?: string | number | null };
export type DiscoveryReadSection = { title: string; fields: DiscoveryReadField[] };

type Props = {
  sections: DiscoveryReadSection[];
  onEdit: () => void;
  entityLabel: string;
};

/** One read-first profile for all Discovery entities, matching Personas H7.51.
 * The existing domain-specific forms remain available through onEdit. */
export function DiscoveryReadProfile({ sections, onEdit, entityLabel }: Props) {
  return <article className="bo-h751-reader bo-h755-discovery-profile" data-discovery-read-profile="1"
    aria-label={`Perfil de ${entityLabel} para consulta`}>
    {sections.map((section, i) => <section key={i} className="bo-h751-reader-section">
      <header><h2>{section.title}</h2><button type="button" onClick={onEdit}>Editar <span aria-hidden="true">↗</span></button></header>
      <div className={section.fields.length > 1 ? 'bo-h755-read-fields' : ''}>
        {section.fields.map((field, index) => <div key={index} className="bo-h755-read-field">
          {section.fields.length > 1 && <small>{field.label}</small>}
          {String(field.value ?? '').trim()
            ? <p className="bo-h751-reader-copy">{field.value}</p>
            : <button type="button" className="bo-h751-add-detail" onClick={onEdit}><Plus size={14}/> Adicionar {field.label.toLowerCase()}</button>}
        </div>)}
      </div>
    </section>)}
  </article>;
}

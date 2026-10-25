import { ArrowRight, LayoutTemplate, Search, Table2, Trash2 } from '../design-system/icons';
import type { ServiceGraph } from '../domain/model';
import { journeyPreviewSrc } from '../services/journey-preview';

type Props = {
  graph: ServiceGraph;
  query: string;
  onQuery: (value: string) => void;
  view: 'cards' | 'table';
  onView: (value: 'cards' | 'table') => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onOpenBoard: (id: string) => void;
  onRemove: (id: string, name: string) => void;
  onRemoveBoard: (id: string, name: string) => void;
};

/** One library entry per canonical map; Journey is a view, not a second artifact. */
export function ServiceMapsLibrary(props: Props) {
  const { graph, query, onQuery, view, onView } = props;
  const needle = query.trim().toLocaleLowerCase('pt-BR');
  const maps = Object.values(graph.journeys).map(journey => ({
    id: journey.id, name: journey.name, count: journey.stageIds.length,
    preview: journeyPreviewSrc(journey, graph), isBoard: false,
  })).concat(Object.values(graph.views.whiteboards).filter(board => board.viewKind === 'blueprint' && (!board.journeyId || !graph.journeys[board.journeyId])).map(board => ({
    id: board.id, name: board.name || 'Mapa do serviço', count: 0,
    preview: '', isBoard: true,
  }))).filter(map => !needle || map.name.toLocaleLowerCase('pt-BR').includes(needle));
  const open = (map: typeof maps[number]) => map.isBoard ? props.onOpenBoard(map.id) : props.onOpen(map.id);
  const remove = (map: typeof maps[number]) => map.isBoard ? props.onRemoveBoard(map.id, map.name) : props.onRemove(map.id, map.name);

  return <section className="bo-h722-blueprint-pane bo-h724-journey-pane" data-service-map-library="1" data-journey-library="1">
    <div className="bo-h722-library-head"><div><small>DESENHO DO SERVIÇO</small><h2>Mapas do serviço</h2><p>Blueprint e Jornada são visualizações do mesmo mapa. Crie uma vez e alterne a forma de enxergar o serviço.</p></div></div>
    {(maps.length > 0 || Boolean(needle)) && <div className="bo1205h3-list-toolbar bo-h722-library-toolbar"><strong>{maps.length} {maps.length === 1 ? 'mapa' : 'mapas'}</strong><div>
      <label className="bo1205h3-icon-search"><Search size={15}/><input aria-label="Buscar mapas" placeholder="Buscar mapa" value={query} onChange={event => onQuery(event.target.value)}/></label>
      <div className="bo-view-switch" role="group" aria-label="Exibição dos mapas">
        <button type="button" className={`bo-button bo-button--ghost ${view === 'cards' ? 'active' : ''}`} aria-pressed={view === 'cards'} onClick={() => onView('cards')}><LayoutTemplate size={16}/> Cards</button>
        <button type="button" className={`bo-button bo-button--ghost ${view === 'table' ? 'active' : ''}`} aria-pressed={view === 'table'} onClick={() => onView('table')}><Table2 size={16}/> Tabela</button>
      </div>
    </div></div>}
    {maps.length ? view === 'cards' ? <div className="bo-h724-journey-grid">{maps.map(map => <article key={(map.isBoard ? 'board:' : 'map:') + map.id} className="bo-h724-journey-card" data-service-map-card={map.id}>
      {map.preview ? <img src={map.preview} alt=""/> : <div className="bo-h722-blueprint-card__visual"><LayoutTemplate size={30}/></div>}
      <div className="bo-h724-journey-card__copy"><small>MAPA DO SERVIÇO</small><strong>{map.name}</strong><span>{map.count} etapas</span><span>Visualizações: Blueprint · Jornada</span></div>
      <footer className="bo-map-card-actions"><button className="bo-h722-open bo-button bo-button--secondary" type="button" onClick={() => open(map)}>Abrir mapa <ArrowRight size={14}/></button><button className="bo-h722-journey-delete bo-button bo-button--danger" type="button" aria-label={`Excluir mapa ${map.name}`} onClick={() => remove(map)}><Trash2 size={16}/></button></footer>
    </article>)}</div> : <div className="bo1205h3-table-wrap"><table className="bo1205h3-table"><thead><tr><th>Nome</th><th>Etapas</th><th>Visualizações</th><th>Ações</th></tr></thead><tbody>{maps.map(map => <tr key={(map.isBoard ? 'board:' : 'map:') + map.id}><td>{map.name}</td><td>{map.count}</td><td>Blueprint · Jornada</td><td><button type="button" className="bo-button bo-button--secondary" onClick={() => open(map)}>Abrir mapa</button> <button type="button" className="bo-button bo-button--danger" aria-label={`Excluir mapa ${map.name}`} onClick={() => remove(map)}>Excluir</button></td></tr>)}</tbody></table></div> : <div className="bo1205h3-empty"><LayoutTemplate size={30}/><strong>{needle ? 'Nenhum mapa encontrado' : 'Crie seu primeiro mapa'}</strong><p>{needle ? 'Tente outro nome na busca.' : 'Comece com uma etapa e acrescente cartões do cliente e da operação.'}</p>{!needle && <button type="button" className="bo-button bo-button--primary" onClick={props.onCreate}>Começar mapa</button>}</div>}
  </section>;
}

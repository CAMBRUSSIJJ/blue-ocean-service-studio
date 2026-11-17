/**
 * NamedSnapshotPanel — C2.5
 * Side panel for named version snapshots.
 * Stored in localStorage as bo.snapshots.v1.<serviceId>
 * Shows list of snapshots, diff counts, restore and delete actions.
 */
import { useState, useEffect, useCallback } from 'react';
import { X, Plus, RotateCcw, Trash2, Clock } from '../design-system/icons';
import type { ServiceGraph } from '../domain/model';

type SnapshotMeta = {
  id: string;
  name: string;
  createdAt: string;
  counts: {
    journeys: number;
    stages: number;
    problems: number;
    opportunities: number;
    boards: number;
  };
};

type StoredSnapshot = SnapshotMeta & { graph: ServiceGraph };

function storageKey(serviceId: string) {
  return `bo.snapshots.v1.${serviceId}`;
}

function loadSnapshots(serviceId: string): StoredSnapshot[] {
  try {
    const raw = localStorage.getItem(storageKey(serviceId));
    if (!raw) return [];
    return JSON.parse(raw) as StoredSnapshot[];
  } catch {
    return [];
  }
}

function saveSnapshots(serviceId: string, snapshots: StoredSnapshot[]) {
  try {
    localStorage.setItem(storageKey(serviceId), JSON.stringify(snapshots));
  } catch {
    // quota exceeded — silent
  }
}

function countGraph(graph: ServiceGraph) {
  return {
    journeys: Object.keys(graph.journeys ?? {}).length,
    stages: Object.keys(graph.stages ?? {}).length,
    problems: Object.keys(graph.problems ?? {}).length,
    opportunities: Object.keys(graph.opportunities ?? {}).length,
    boards: Object.keys(graph.views?.whiteboards ?? {}).length,
  };
}

function diffCounts(a: SnapshotMeta['counts'], b: SnapshotMeta['counts']): string {
  const parts: string[] = [];
  const fields: Array<[keyof typeof a, string]> = [
    ['journeys', 'jornada'],
    ['stages', 'etapa'],
    ['problems', 'problema'],
    ['opportunities', 'oportunidade'],
    ['boards', 'quadro'],
  ];
  for (const [key, label] of fields) {
    const delta = b[key] - a[key];
    if (delta !== 0) {
      const sign = delta > 0 ? '+' : '';
      const plural = Math.abs(delta) === 1 ? label : label + 's';
      parts.push(`${sign}${delta} ${plural}`);
    }
  }
  return parts.length > 0 ? parts.join(', ') : 'sem mudanças detectadas';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type Props = {
  graph: ServiceGraph;
  onClose: () => void;
  onRestore: (g: ServiceGraph) => void;
};

export function NamedSnapshotPanel({ graph, onClose, onRestore }: Props) {
  const serviceId = graph.service.id;
  const [snapshots, setSnapshots] = useState<StoredSnapshot[]>(() => loadSnapshots(serviceId));
  const [nameInput, setNameInput] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  useEffect(() => {
    setSnapshots(loadSnapshots(serviceId));
  }, [serviceId]);

  const currentCounts = countGraph(graph);

  const handleCreate = useCallback(() => {
    const name = nameInput.trim() || `Snapshot ${new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
    const id = `snap_${Date.now()}`;
    const snap: StoredSnapshot = {
      id,
      name,
      createdAt: new Date().toISOString(),
      counts: currentCounts,
      graph: structuredClone ? structuredClone(graph) : JSON.parse(JSON.stringify(graph)),
    };
    const next = [snap, ...snapshots].slice(0, 20); // cap at 20
    saveSnapshots(serviceId, next);
    setSnapshots(next);
    setNameInput('');
  }, [nameInput, snapshots, graph, serviceId, currentCounts]);

  const handleDelete = useCallback((id: string) => {
    const next = snapshots.filter((s) => s.id !== id);
    saveSnapshots(serviceId, next);
    setSnapshots(next);
    setConfirmDeleteId(null);
  }, [snapshots, serviceId]);

  const handleRestore = useCallback((snap: StoredSnapshot) => {
    onRestore(snap.graph);
    setConfirmRestoreId(null);
  }, [onRestore]);

  return (
    <aside
      className="bo-c2-snapshot-panel"
      data-snapshot-panel="c2.5"
      aria-label="Histórico de versões"
    >
      <header className="bo-c2-snapshot-panel__header">
        <h2>
          <Clock size={16}/>
          Histórico de versões
        </h2>
        <button type="button" className="bo-c2-snapshot-close" onClick={onClose} aria-label="Fechar painel">
          <X size={16}/>
        </button>
      </header>

      {/* Create new snapshot */}
      <div className="bo-c2-snapshot-create">
        <input
          type="text"
          className="bo-c2-snapshot-name-input"
          placeholder="Nome do snapshot (opcional)"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          maxLength={80}
          aria-label="Nome do snapshot"
        />
        <button type="button" className="bo-c2-snapshot-create-btn" onClick={handleCreate}>
          <Plus size={14}/> Salvar agora
        </button>
      </div>

      <div className="bo-c2-snapshot-current-state">
        <small>ESTADO ATUAL</small>
        <span>
          {currentCounts.journeys} jornadas · {currentCounts.stages} etapas · {currentCounts.problems} problemas
        </span>
      </div>

      {/* Snapshot list */}
      <div className="bo-c2-snapshot-list" role="list">
        {snapshots.length === 0 && (
          <div className="bo-c2-snapshot-empty">
            <Clock size={28}/>
            <p>Nenhum snapshot salvo ainda.</p>
            <small>Salve pontos de restauração para acompanhar a evolução do serviço.</small>
          </div>
        )}

        {snapshots.map((snap, i) => {
          const diff = i === 0
            ? diffCounts(snap.counts, currentCounts)
            : null;

          return (
            <div key={snap.id} className="bo-c2-snapshot-item" role="listitem">
              <div className="bo-c2-snapshot-item__info">
                <strong className="bo-c2-snapshot-item__name">{snap.name}</strong>
                <span className="bo-c2-snapshot-item__date">
                  <Clock size={11}/> {formatDate(snap.createdAt)}
                </span>
                <span className="bo-c2-snapshot-item__counts">
                  {snap.counts.journeys} jornadas · {snap.counts.stages} etapas · {snap.counts.problems} prob.
                </span>
                {diff !== null && (
                  <span className={`bo-c2-snapshot-item__diff ${diff === 'sem mudanças detectadas' ? 'is-unchanged' : 'is-changed'}`}>
                    vs. atual: {diff}
                  </span>
                )}
              </div>

              <div className="bo-c2-snapshot-item__actions">
                {confirmRestoreId === snap.id ? (
                  <>
                    <span className="bo-c2-snapshot-confirm-label">Restaurar?</span>
                    <button type="button" className="bo-c2-snapshot-confirm-yes" onClick={() => handleRestore(snap)}>Sim</button>
                    <button type="button" className="bo-c2-snapshot-confirm-no" onClick={() => setConfirmRestoreId(null)}>Não</button>
                  </>
                ) : confirmDeleteId === snap.id ? (
                  <>
                    <span className="bo-c2-snapshot-confirm-label">Excluir?</span>
                    <button type="button" className="bo-c2-snapshot-confirm-yes" onClick={() => handleDelete(snap.id)}>Sim</button>
                    <button type="button" className="bo-c2-snapshot-confirm-no" onClick={() => setConfirmDeleteId(null)}>Não</button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="bo-c2-snapshot-restore-btn"
                      onClick={() => setConfirmRestoreId(snap.id)}
                      title="Restaurar este snapshot"
                      aria-label={`Restaurar ${snap.name}`}
                    >
                      <RotateCcw size={13}/>
                    </button>
                    <button
                      type="button"
                      className="bo-c2-snapshot-delete-btn"
                      onClick={() => setConfirmDeleteId(snap.id)}
                      title="Excluir snapshot"
                      aria-label={`Excluir ${snap.name}`}
                    >
                      <Trash2 size={13}/>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="bo-c2-snapshot-hint">Snapshots salvos localmente · máx. 20</p>
    </aside>
  );
}

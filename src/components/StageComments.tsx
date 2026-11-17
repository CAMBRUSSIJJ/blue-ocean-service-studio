/**
 * StageComments — C2.4
 * Floating comment panel for inline collaboration on journey stages.
 * Reads/writes CollaborationComment[] at graph.service.collaboration.comments
 * targetType: 'stage' — anchored to specific journey stages.
 */
import { useState, useCallback, useMemo } from 'react';
import { X, MessageSquare, CheckCircle2, Plus } from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';
import type { ServiceGraph, CollaborationComment } from '../domain/model';
import type { StudioController } from '../state/useStudioController';

function nanoid8(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return 'agora';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min atrás`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h atrás`;
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
}

function getCurrentUserId(graph: ServiceGraph): string {
  return graph.service.collaboration?.currentUserId ?? 'local-user';
}

function ensureCollaboration(graph: ServiceGraph): ServiceGraph {
  if (graph.service.collaboration) return graph;
  return {
    ...graph,
    service: {
      ...graph.service,
      collaboration: {
        version: 1,
        workspaceId: graph.service.id,
        workspaceName: graph.service.name,
        currentUserId: 'local-user',
        members: {},
        comments: [],
        activity: [],
        sync: { mode: 'local-only' },
      },
    },
  };
}

type Props = {
  graph: ServiceGraph;
  studio: StudioController;
  /** Filter to a specific journey (shows all its stages as sections). null = all journeys */
  journeyId?: string | null;
  onClose: () => void;
};

type GroupedStage = {
  stageId: string;
  stageTitle: string;
  journeyName: string;
  comments: CollaborationComment[];
};

export function StageComments({ graph, studio, journeyId, onClose }: Props) {
  const [draftStageId, setDraftStageId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState('');
  const [filter, setFilter] = useState<'open' | 'all'>('open');

  const allComments = graph.service.collaboration?.comments ?? [];
  const stageComments = allComments.filter((c) => c.targetType === 'stage');

  // Build grouped list: journeys → stages → comments
  const groups = useMemo<GroupedStage[]>(() => {
    const journeyIds = journeyId
      ? [journeyId]
      : graph.service.journeyIds;

    const result: GroupedStage[] = [];
    for (const jId of journeyIds) {
      const journey = graph.journeys[jId];
      if (!journey) continue;
      for (const sId of journey.stageIds) {
        const stage = graph.stages[sId];
        if (!stage) continue;
        const comments = stageComments.filter(
          (c) => c.targetId === sId && (filter === 'all' || c.status === 'open'),
        );
        // Show stage if it has comments OR if we're in a focused journey
        if (comments.length > 0 || journeyId === jId) {
          result.push({
            stageId: sId,
            stageTitle: stage.title,
            journeyName: journey.name,
            comments,
          });
        }
      }
    }
    return result;
  }, [graph, journeyId, stageComments, filter]);

  const openCount = stageComments.filter((c) => c.status === 'open').length;

  const handleAddComment = useCallback(
    (stageId: string, stageTitle: string) => {
      const body = draftBody.trim();
      if (!body) return;
      const userId = getCurrentUserId(graph);
      const comment: CollaborationComment = {
        id: nanoid8(),
        targetType: 'stage',
        targetId: stageId,
        targetLabel: stageTitle,
        authorId: userId,
        body,
        status: 'open',
        createdAt: new Date().toISOString(),
      };
      studio.setGraph((g) => {
        const updated = ensureCollaboration(g);
        return {
          ...updated,
          service: {
            ...updated.service,
            collaboration: {
              ...updated.service.collaboration!,
              comments: [...(updated.service.collaboration?.comments ?? []), comment],
            },
          },
        };
      }, 'Adicionar comentário');
      setDraftBody('');
      setDraftStageId(null);
    },
    [draftBody, graph, studio],
  );

  const handleResolve = useCallback(
    (commentId: string) => {
      studio.setGraph((g) => ({
        ...g,
        service: {
          ...g.service,
          collaboration: g.service.collaboration
            ? {
                ...g.service.collaboration,
                comments: g.service.collaboration.comments.map((c) =>
                  c.id === commentId
                    ? { ...c, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
                    : c,
                ),
              }
            : g.service.collaboration,
        },
      }), 'Resolver comentário');
    },
    [studio],
  );

  const handleReopen = useCallback(
    (commentId: string) => {
      studio.setGraph((g) => ({
        ...g,
        service: {
          ...g.service,
          collaboration: g.service.collaboration
            ? {
                ...g.service.collaboration,
                comments: g.service.collaboration.comments.map((c) =>
                  c.id === commentId
                    ? { ...c, status: 'open' as const, resolvedAt: null }
                    : c,
                ),
              }
            : g.service.collaboration,
        },
      }), 'Reabrir comentário');
    },
    [studio],
  );

  return (
    <aside
      className="bo-c2-comments-panel"
      data-stage-comments="c2.4"
      aria-label="Comentários inline"
    >
      <header className="bo-c2-comments-panel__header">
        <h2>
          <MessageSquare size={16}/>
          Comentários
          {openCount > 0 && <span className="bo-c2-comments-badge">{openCount}</span>}
        </h2>
        <div className="bo-c2-comments-filter">
          <button
            type="button"
            className={filter === 'open' ? 'is-active' : ''}
            onClick={() => setFilter('open')}
          >
            Abertos
          </button>
          <button
            type="button"
            className={filter === 'all' ? 'is-active' : ''}
            onClick={() => setFilter('all')}
          >
            Todos
          </button>
        </div>
        <button type="button" className="bo-c2-comments-close" onClick={onClose} aria-label="Fechar painel de comentários">
          <X size={16}/>
        </button>
      </header>

      <div className="bo-c2-comments-body">
        {groups.length === 0 && (
          <div className="bo-c2-comments-empty">
            <MessageSquare size={28}/>
            <p>{filter === 'open' ? 'Nenhum comentário aberto.' : 'Nenhum comentário ainda.'}</p>
            <small>Clique em "+" ao lado de uma etapa para comentar.</small>
          </div>
        )}

        {groups.map(({ stageId, stageTitle, journeyName, comments }) => (
          <section key={stageId} className="bo-c2-comments-stage-group">
            <div className="bo-c2-comments-stage-label">
              <BlueOceanObjectIcon kind="journey" size={12}/>
              <span>
                <strong>{stageTitle}</strong>
                {!journeyId && <em> · {journeyName}</em>}
              </span>
              <button
                type="button"
                className="bo-c2-comments-add-btn"
                title="Adicionar comentário nesta etapa"
                aria-label={`Comentar em ${stageTitle}`}
                onClick={() => { setDraftStageId(stageId); setDraftBody(''); }}
              >
                <Plus size={12}/>
              </button>
            </div>

            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`bo-c2-comment is-${comment.status}`}
                data-comment-id={comment.id}
              >
                <div className="bo-c2-comment__body">{comment.body}</div>
                <div className="bo-c2-comment__meta">
                  <span>{formatRelative(comment.createdAt)}</span>
                  {comment.status === 'open' ? (
                    <button
                      type="button"
                      className="bo-c2-comment__resolve"
                      onClick={() => handleResolve(comment.id)}
                      title="Marcar como resolvido"
                    >
                      <CheckCircle2 size={12}/> Resolver
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="bo-c2-comment__reopen"
                      onClick={() => handleReopen(comment.id)}
                      title="Reabrir comentário"
                    >
                      Reabrir
                    </button>
                  )}
                </div>
              </div>
            ))}

            {draftStageId === stageId && (
              <div className="bo-c2-comment-draft">
                <textarea
                  className="bo-c2-comment-draft__textarea"
                  placeholder="Escreva um comentário..."
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  rows={3}
                  autoFocus
                  aria-label="Texto do comentário"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setDraftStageId(null); setDraftBody(''); }
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment(stageId, stageTitle);
                  }}
                />
                <div className="bo-c2-comment-draft__actions">
                  <button type="button" className="bo-c2-comment-draft__cancel" onClick={() => { setDraftStageId(null); setDraftBody(''); }}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="bo-c2-comment-draft__submit"
                    onClick={() => handleAddComment(stageId, stageTitle)}
                    disabled={!draftBody.trim()}
                  >
                    Comentar
                  </button>
                </div>
                <small className="bo-c2-comment-draft__hint">Ctrl+Enter para enviar · Esc para cancelar</small>
              </div>
            )}

            {draftStageId !== stageId && comments.length === 0 && (
              <div className="bo-c2-comments-stage-empty">
                <small>Nenhum comentário nesta etapa.</small>
              </div>
            )}
          </section>
        ))}
      </div>
    </aside>
  );
}

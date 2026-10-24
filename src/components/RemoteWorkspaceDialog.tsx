import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { remoteAccept, remoteAuthority, remoteBinding, remoteClient, remoteComment, remoteComments, remoteConfigured, remoteDetach, remoteDownloadVersion, remoteInvite, remoteList, remoteLoad, remoteLocalBackup, remoteMembers, remotePublishCopy, remoteRemoveMember, remoteRevalidate, remoteSave, remoteSetSession, remoteVersions, type RemoteRole } from '../services/remote-workspace';

type Workspace = Awaited<ReturnType<typeof remoteList>>[number];
type Member = Awaited<ReturnType<typeof remoteMembers>>[number];
type Comment = Awaited<ReturnType<typeof remoteComments>>[number];
type Version = Awaited<ReturnType<typeof remoteVersions>>[number];

export function RemoteWorkspaceDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const importing = useRef(false);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [invite, setInvite] = useState('');
  const [revision, setRevision] = useState(0);
  const [creating, setCreating] = useState(false);
  const [publicationReady, setPublicationReady] = useState(false);
  const binding = remoteBinding();
  const role = remoteAuthority()?.role;
  const notify = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    const registry = window.BlueOceanRuntime;
    registry?.register('remoteWorkspace', { show: () => setOpen(true), configured: remoteConfigured, authority: remoteAuthority }, '1.0');
    window.addEventListener('bo-remote-changed', notify);
    if (!remoteConfigured) return () => window.removeEventListener('bo-remote-changed', notify);
    const db = remoteClient();
    let live = true;
    void db.auth.getSession().then(({ data }) => { if (live) { remoteSetSession(data.session); setSession(data.session); } });
    const { data } = db.auth.onAuthStateChange((_event, value) => {
      if (live) { remoteSetSession(value); setSession(value); setInvite(''); }
    });
    return () => { live = false; data.subscription.unsubscribe(); window.removeEventListener('bo-remote-changed', notify); };
  }, [notify]);
  useEffect(() => { if (session) void remoteRevalidate(); }, [session]);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);

  const refresh = useCallback(async () => {
    const list = await remoteList(); setWorkspaces(list);
    if (remoteBinding()) {
      const [team, conversation, history] = await Promise.all([remoteMembers(), remoteComments(), remoteVersions()]);
      setMembers(team); setComments(conversation); setVersions(history);
    } else { setMembers([]); setComments([]); setVersions([]); }
  }, []);
  useEffect(() => {
    if (!open || !session) return;
    let live = true;
    void refresh().catch(cause => { if (live) setError(String(cause.message)); });
    return () => { live = false; };
  }, [open, session, refresh]);
  const run = async (action: () => Promise<unknown>, success = '') => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); await refresh(); notify(); setMessage(success); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const close = () => { if (!busy) { setOpen(false); setInvite(''); setPublicationReady(false); } };
  const loadWorkspace = async (workspaceId: string) => {
    // The existing import confirmation is outside this native modal. Let it receive focus.
    importing.current = true;
    dialog.current?.close();
    try { await remoteLoad(workspaceId); }
    finally { importing.current = false; dialog.current?.showModal(); }
  };

  return createPortal(<dialog ref={dialog} className="bo-remote-dialog" aria-labelledby="bo-remote-title" onCancel={event => { event.preventDefault(); close(); }} onClose={() => { if (!importing.current) setOpen(false); }} data-remote-revision={revision}>
    <header><div><small>ACESSO EM OUTROS DISPOSITIVOS</small><h2 id="bo-remote-title">Workspace remoto</h2></div><button type="button" aria-label="Fechar workspace remoto" disabled={busy} onClick={close}>×</button></header>
    {!remoteConfigured ? <p>O acesso remoto aguarda a configuração do serviço. Seu projeto continua salvo neste navegador. Use um backup para guardar ou transferir uma cópia.</p> : <>
      {!session ? <form onSubmit={event => {
        event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError('');
        const db = remoteClient(), credentials = { email: String(data.get('email')).trim(), password: String(data.get('password')) };
        void (creating ? db.auth.signUp({ ...credentials, options: { emailRedirectTo: window.location.origin } }) : db.auth.signInWithPassword(credentials)).then(result => {
          if (result.error) setError(result.error.message);
          else setMessage(creating && !result.data.session ? 'Confira seu e-mail para confirmar a conta. Depois, entre aqui.' : 'Conta conectada. Escolha um workspace ou publique uma cópia do projeto.');
        }).catch(() => setError('Não foi possível conectar. Confira sua conexão e tente novamente.')).finally(() => setBusy(false));
      }}>
        <p>Entre com sua conta remota para acessar os projetos compartilhados. O perfil local continua disponível neste dispositivo.</p>
        <label>E-mail da conta remota<input name="email" type="email" autoComplete="email" required disabled={busy}/></label>
        <label>Senha da conta remota<input name="password" type="password" minLength={8} autoComplete={creating ? 'new-password' : 'current-password'} required disabled={busy}/></label>
        <div className="bo-remote-actions"><button type="submit" disabled={busy}>{busy ? 'Conectando…' : creating ? 'Criar conta remota' : 'Entrar na conta remota'}</button><button type="button" disabled={busy} onClick={() => setCreating(value => !value)}>{creating ? 'Já tenho conta' : 'Criar uma conta'}</button></div>
      </form> : <>
        <p>Conectado como <strong>{session.user.email}</strong>. As alterações são publicadas quando você escolhe salvar no workspace remoto.</p>
        <div className="bo-remote-actions"><button type="button" disabled={busy} onClick={() => void run(refresh, 'Lista atualizada.')}>Atualizar lista</button><button type="button" disabled={busy} onClick={() => void remoteClient().auth.signOut().then(({ error: cause }) => { if (cause) setError(cause.message); })}>Sair da conta remota</button></div>
        <section><h3>Seus workspaces</h3>{workspaces.length ? <ul>{workspaces.map(workspace => <li key={workspace.id}><strong>{workspace.name}</strong><button type="button" disabled={busy} onClick={() => void run(async () => { await loadWorkspace(workspace.id); }, 'Versão remota carregada.')} aria-label={`Abrir workspace ${workspace.name}`}>Abrir</button></li>)}</ul> : <p>Nenhum workspace disponível. Publique uma cópia ou aceite um convite.</p>}</section>
        <details><summary>Publicar uma cópia do projeto local</summary><form onSubmit={event => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get('workspaceName')); void run(async () => { await remotePublishCopy(name); setPublicationReady(false); }, 'Cópia publicada no workspace remoto.'); }}>
          <p>Isso envia o projeto aberto, seus mapas e registros para sua conta remota. O acesso começa restrito a você.</p><label>Nome do workspace<input name="workspaceName" required maxLength={160} disabled={busy}/></label><label className="bo-remote-check"><input type="checkbox" checked={publicationReady} onChange={event => setPublicationReady(event.target.checked)} disabled={busy}/> Quero enviar este projeto para minha conta remota</label><button type="submit" disabled={busy || !publicationReady}>Publicar cópia</button>
        </form></details>
        <form onSubmit={event => { event.preventDefault(); const token = String(new FormData(event.currentTarget).get('invitation')); void run(async () => { await remoteAccept(token); }, 'Convite aceito. O workspace já aparece na sua lista.'); }}><label>Código de convite<input name="invitation" required maxLength={48} autoComplete="off" disabled={busy}/></label><button type="submit" disabled={busy}>Aceitar convite</button></form>
        {binding && <section><h3>Projeto vinculado · versão {binding.revision}</h3><p>Permissão: {role === 'owner' ? 'Responsável' : role === 'editor' ? 'Editor' : role === 'commenter' ? 'Comentador' : 'Leitor'}. Se outra pessoa publicar primeiro, suas alterações serão preservadas neste navegador até você decidir como continuar.</p><div className="bo-remote-actions"><button type="button" disabled={busy || !['owner','editor'].includes(role || '')} onClick={() => void run(remoteSave, 'Alterações publicadas no workspace remoto.')}>Salvar no workspace remoto</button><button type="button" disabled={busy} onClick={() => void run(() => loadWorkspace(binding.workspaceId), 'Versão remota carregada.')}>Carregar versão remota</button><button type="button" onClick={remoteLocalBackup}>Baixar cópia local</button><button type="button" disabled={busy} onClick={() => { remoteDetach(); setMessage('Vínculo encerrado. Você está editando uma cópia local.'); }}>Continuar com cópia local</button></div>
          {role === 'owner' && <><form onSubmit={event => { event.preventDefault(); const nextRole = String(new FormData(event.currentTarget).get('inviteRole')) as Exclude<RemoteRole,'owner'>; void run(async () => setInvite(await remoteInvite(nextRole))); }}><label>Permissão do convite<select name="inviteRole" aria-label="Permissão do convite" disabled={busy}><option value="viewer">Leitor</option><option value="commenter">Comentador</option><option value="editor">Editor</option></select></label><button type="submit" disabled={busy}>Gerar código de convite</button></form>{invite && <label>Código gerado · uso único · válido por 7 dias<input readOnly value={invite} onFocus={event => event.currentTarget.select()}/><small>Compartilhe com a pessoa escolhida. Quem receber o código poderá aceitar esta permissão.</small></label>}<h4>Membros convidados</h4>{members.length ? <ul>{members.map(member => <li key={member.user_id}><span>{member.user_id} · {member.role}</span><button type="button" disabled={busy} onClick={() => void run(() => remoteRemoveMember(member.user_id), 'Acesso removido.')}>Remover acesso</button></li>)}</ul> : <p>Nenhum convite aceito ainda.</p>}</>}
          <h4>Comentários compartilhados</h4>{comments.map(comment => <article key={comment.id}><p>{comment.body}</p><small>{comment.author_id === session.user.id ? 'Você' : comment.author_id} · {new Date(comment.created_at).toLocaleString('pt-BR')}</small></article>)}{role !== 'viewer' && <form onSubmit={event => { event.preventDefault(); const form = event.currentTarget, body = String(new FormData(form).get('comment')); void run(async () => { await remoteComment(body); form.reset(); }, 'Comentário publicado.'); }}><label>Novo comentário<textarea name="comment" maxLength={4000} required disabled={busy}/></label><button type="submit" disabled={busy}>Publicar comentário</button></form>}
          <h4>Últimas versões salvas</h4><ul>{versions.map(version => <li key={version.revision}><span>Versão {version.revision} · {new Date(version.created_at).toLocaleString('pt-BR')}</span><button type="button" disabled={busy} onClick={() => void run(() => remoteDownloadVersion(version.revision))}>Baixar backup da versão {version.revision}</button></li>)}</ul>
        </section>}
      </>}
    </>}
    <p className="bo-remote-error" role="alert">{error}</p><p role="status">{message}</p>
  </dialog>, document.body);
}

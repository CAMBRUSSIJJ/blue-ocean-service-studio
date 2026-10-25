-- A stale document is an HTTP 409 conflict, not a retryable database serialization failure.
create or replace function private.bo_commit(p_workspace uuid,p_expected bigint,p_payload jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare v_revision bigint; v_actor uuid:=auth.uid();
begin
 if v_actor is null or coalesce(private.bo_role(p_workspace),'') not in ('owner','editor') then raise insufficient_privilege; end if;
 perform private.bo_validate_payload(p_payload);
 -- Revocation and commits serialize on this row; a stale client can never overwrite a newer revision.
 perform 1 from public.bo_workspaces where id=p_workspace for update;
 if coalesce(private.bo_role(p_workspace),'') not in ('owner','editor') then raise insufficient_privilege; end if;
 update public.bo_documents set revision=revision+1,payload=p_payload,updated_by=v_actor,updated_at=now()
 where workspace_id=p_workspace and revision=p_expected and payload->'graph'->'service'->>'id'=p_payload->'graph'->'service'->>'id' returning revision into v_revision;
 if v_revision is null then raise exception 'Workspace changed: load the latest version before publishing' using errcode='PT409'; end if;
 insert into public.bo_versions(workspace_id,revision,payload,updated_by) values(p_workspace,v_revision,p_payload,v_actor);
 delete from public.bo_versions where workspace_id=p_workspace and revision<=v_revision-10;
 return v_revision;
end $$;

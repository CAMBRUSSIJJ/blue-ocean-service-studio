-- Run against disposable PostgreSQL after auth stubs and the migration (see runner).
create function public.qa_assert(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL %',label; end if; raise notice 'PASS %',label; end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',false);
select set_config('bo.qa_workspace',public.bo_create_workspace('QA','{"graph":{"service":{"id":"qa-service"},"journeys":{},"views":{}}}')::text,false);
select qa_assert((select count(*)=1 from bo_workspaces),'Owner can create and read a private workspace');
select set_config('bo.qa_invite',bo_invite_workspace(current_setting('bo.qa_workspace')::uuid,'editor'),false);
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000002',false);
select qa_assert((select count(*)=0 from bo_workspaces),'Uninvited authenticated user cannot read another workspace');
select qa_assert((select count(*)=0 from bo_documents),'Uninvited authenticated user cannot read project payloads');
select bo_accept_invite(current_setting('bo.qa_invite'));
select qa_assert((select count(*)=1 from bo_documents),'Accepted invite grants access only to its workspace');
select qa_assert(bo_commit_workspace(current_setting('bo.qa_workspace')::uuid,1,'{"graph":{"service":{"id":"qa-service","name":"Editor update"},"journeys":{},"views":{}}}')=2,'Editor publishes a new server revision');
do $$ begin
 begin perform bo_commit_workspace(current_setting('bo.qa_workspace')::uuid,1,'{"graph":{"service":{"id":"qa-service"},"journeys":{},"views":{}}}'); raise exception 'Stale write accepted';
 exception when sqlstate 'PT409' then raise notice 'PASS Stale revision rejected atomically'; end;
 begin perform bo_accept_invite(current_setting('bo.qa_invite')); raise exception 'Invite reused';
 exception when invalid_parameter_value then raise notice 'PASS Single-use invite cannot be replayed'; end;
 begin perform bo_invite_workspace(current_setting('bo.qa_workspace')::uuid,'editor'); raise exception 'Editor invited';
 exception when insufficient_privilege then raise notice 'PASS Editor cannot grant access'; end;
 begin update bo_documents set revision=100; raise exception 'Direct write accepted';
 exception when insufficient_privilege then raise notice 'PASS Direct document writes cannot bypass optimistic locking'; end;
 begin insert into bo_members values(current_setting('bo.qa_workspace')::uuid,auth.uid(),'editor'); raise exception 'Self membership write accepted';
 exception when insufficient_privilege then raise notice 'PASS Members cannot self-grant or escalate roles'; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',false);
select set_config('bo.qa_viewer',bo_invite_workspace(current_setting('bo.qa_workspace')::uuid,'viewer'),false);
select set_config('bo.qa_commenter',bo_invite_workspace(current_setting('bo.qa_workspace')::uuid,'commenter'),false);
select set_config('bo.qa_expired',bo_invite_workspace(current_setting('bo.qa_workspace')::uuid,'viewer'),false);
reset role;
update bo_invites set expires_at=now()-interval '1 minute' where token_hash=encode(extensions.digest(current_setting('bo.qa_expired'),'sha256'),'hex');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000003',false);
select bo_accept_invite(current_setting('bo.qa_viewer'));
select qa_assert((select count(*)=1 from bo_documents),'Viewer can read authorized project');
do $$ begin
 begin perform bo_commit_workspace(current_setting('bo.qa_workspace')::uuid,2,'{"graph":{"service":{"id":"qa-service"},"journeys":{},"views":{}}}'); raise exception 'Viewer wrote project';
 exception when insufficient_privilege then raise notice 'PASS Viewer cannot publish project changes'; end;
 begin insert into bo_comments(workspace_id,body) values(current_setting('bo.qa_workspace')::uuid,'Viewer comment'); raise exception 'Viewer commented';
 exception when insufficient_privilege then raise notice 'PASS Viewer cannot write comments'; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000004',false);
do $$ begin
 begin perform bo_accept_invite(current_setting('bo.qa_expired')); raise exception 'Expired invite accepted';
 exception when invalid_parameter_value then raise notice 'PASS Expired invitation rejected'; end;
end $$;
select bo_accept_invite(current_setting('bo.qa_commenter'));
insert into bo_comments(workspace_id,body) values(current_setting('bo.qa_workspace')::uuid,'Commenter contribution');
select qa_assert((select count(*)=1 from bo_comments),'Commenter can publish shared comments');
do $$ begin
 begin perform bo_commit_workspace(current_setting('bo.qa_workspace')::uuid,2,'{"graph":{"service":{"id":"qa-service"},"journeys":{},"views":{}}}'); raise exception 'Commenter wrote project';
 exception when insufficient_privilege then raise notice 'PASS Commenter cannot edit project'; end;
 begin insert into bo_comments(workspace_id,author_id,body) values(current_setting('bo.qa_workspace')::uuid,'00000000-0000-4000-a000-000000000001','Impersonation'); raise exception 'Author forged';
 exception when insufficient_privilege then raise notice 'PASS Comment authorship cannot be forged'; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',false);
select bo_remove_member(current_setting('bo.qa_workspace')::uuid,'00000000-0000-4000-a000-000000000002');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000002',false);
select qa_assert((select count(*)=0 from bo_documents),'Revoked member loses read access');
do $$ begin
 begin perform bo_commit_workspace(current_setting('bo.qa_workspace')::uuid,2,'{"graph":{"service":{"id":"qa-service"},"journeys":{},"views":{}}}'); raise exception 'Revoked member wrote';
 exception when insufficient_privilege then raise notice 'PASS Revoked member loses write access'; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000005',false);
select qa_assert((select count(*)=0 from bo_versions),'Outsider cannot read version history');
select qa_assert((select count(*)=0 from bo_comments),'Outsider cannot read shared comments');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',false);
do $$ begin
 begin perform bo_create_workspace('Invalid','{"graph":{"service":{"id":"bad"}}}'); raise exception 'Bad project accepted';
 exception when invalid_parameter_value then raise notice 'PASS Malformed payload rejected without creating a workspace'; end;
end $$;
select qa_assert((select count(*)=1 from bo_workspaces),'Failed validation leaves workspace inventory unchanged');
select qa_assert((select count(*)=2 from bo_versions),'Version history preserves initial and published projects');
select qa_assert((select revision=2 and payload->'graph'->'service'->>'name'='Editor update' from bo_documents),'Rejected writes never replace the last valid project');
reset role;
set role anon;
do $$ begin
 begin perform bo_create_workspace('Anon','{"graph":{"service":{"id":"qa-service"},"journeys":{},"views":{}}}'); raise exception 'Anonymous RPC accepted';
 exception when insufficient_privilege then raise notice 'PASS Anonymous identity cannot create a workspace'; end;
 begin perform * from bo_documents; raise exception 'Anonymous read accepted';
 exception when insufficient_privilege then raise notice 'PASS Anonymous identity cannot read project data'; end;
end $$;
reset role;

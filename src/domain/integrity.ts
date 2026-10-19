import type { Id, ServiceGraph } from './model';

export type IntegrityIssue = { severity: 'error' | 'warning'; code: string; path: string; message: string; targetId?: Id };
export type IntegrityReport = { ok: boolean; schemaVersion: number; errors: IntegrityIssue[]; warnings: IntegrityIssue[] };

const values = <T>(record?: Record<string,T>) => Object.values(record ?? {});
const unique = (ids?: Id[]) => [...new Set((ids ?? []).filter(Boolean))];

export function validateGraphIntegrity(graph: ServiceGraph): IntegrityReport {
  const errors: IntegrityIssue[]=[]; const warnings: IntegrityIssue[]=[];
  const error=(code:string,path:string,message:string,targetId?:Id)=>errors.push({severity:'error',code,path,message,targetId});
  if(graph.schemaVersion!==3) error('schema-version','schemaVersion','O projeto precisa estar no Schema V3.');
  for(const [id,j] of Object.entries(graph.journeys)) for(const sid of j.stageIds) if(graph.stages[sid]?.journeyId!==id) error('journey-stage',`journeys.${id}.stageIds`,`Etapa inválida: ${sid}`,sid);
  for(const [id,s] of Object.entries(graph.stages)) {
    for(const pid of s.problemIds) if(graph.problems[pid]?.stageId!==id) error('stage-problem',`stages.${id}.problemIds`,`Problema inválido: ${pid}`,pid);
    for(const oid of s.opportunityIds) if(graph.opportunities[oid]?.stageId!==id) error('stage-opportunity',`stages.${id}.opportunityIds`,`Oportunidade inválida: ${oid}`,oid);
  }
  for(const [id,t] of Object.entries(graph.tasks)) {
    if(t.stageId&&!graph.stages[t.stageId]) error('task-stage',`tasks.${id}.stageId`,'Etapa inexistente.',t.stageId);
    for(const dep of t.dependencyIds??[]) if(!graph.tasks[dep]||dep===id) error('task-dependency',`tasks.${id}.dependencyIds`,'Dependência inválida.',dep);
  }
  for(const [kind,col] of Object.entries(graph.entities??{})) for(const [id,entity] of Object.entries(col)) {
    if(entity.stageId&&!graph.stages[entity.stageId]) error('entity-stage',`entities.${kind}.${id}.stageId`,'Etapa inexistente.',entity.stageId);
    if(entity.journeyId&&!graph.journeys[entity.journeyId]) error('entity-journey',`entities.${kind}.${id}.journeyId`,'Jornada inexistente.',entity.journeyId);
  }
  const collab=graph.service.collaboration;
  if(collab){
    if(collab.currentUserId&&!collab.members?.[collab.currentUserId]) warnings.push({severity:'warning',code:'collab-current-user',path:'service.collaboration.currentUserId',message:'Usuário atual da colaboração não existe.'});
    const itemExists=(targetId:Id)=>values(graph.views.whiteboards).some(b=>!!b.items?.[targetId]);
    for(const c of collab.comments??[]){
      if(c.authorId&&!collab.members?.[c.authorId])warnings.push({severity:'warning',code:'collab-author',path:`service.collaboration.comments.${c.id}`,message:'Comentário aponta para autor inexistente.',targetId:c.id});
      const valid=c.targetType==='service'?c.targetId===graph.service.id:c.targetType==='journey'?!!graph.journeys[c.targetId]:c.targetType==='stage'?!!graph.stages[c.targetId]:c.targetType==='board'?!!graph.views.whiteboards[c.targetId]:c.targetType==='item'?itemExists(c.targetId):true;
      if(!valid)warnings.push({severity:'warning',code:'collab-target',path:`service.collaboration.comments.${c.id}`,message:'Comentário aponta para alvo removido.',targetId:c.id});
    }
  }
  for(const [bid,b] of Object.entries(graph.views.whiteboards)) {
    for(const [eid,e] of Object.entries(b.edges)) if(!b.items[e.fromId]||!b.items[e.toId]||e.fromId===e.toId) error('edge',`views.whiteboards.${bid}.edges.${eid}`,'Conexão inválida.',eid);
  }
  return {ok:errors.length===0,schemaVersion:graph.schemaVersion,errors,warnings};
}

export function repairGraphReferences(graph: ServiceGraph): ServiceGraph {
  const g=structuredClone(graph);
  g.service.journeyIds=unique(g.service.journeyIds).filter(id=>!!g.journeys[id]);
  for(const [jid,j] of Object.entries(g.journeys)) j.stageIds=unique(j.stageIds).filter(id=>g.stages[id]?.journeyId===jid);
  for(const [sid,s] of Object.entries(g.stages)) {
    s.touchpointIds=unique(s.touchpointIds).filter(id=>!!g.touchpoints[id]);
    s.problemIds=unique(s.problemIds).filter(id=>g.problems[id]?.stageId===sid);
    s.opportunityIds=unique(s.opportunityIds).filter(id=>g.opportunities[id]?.stageId===sid);
  }
  for(const o of values(g.opportunities)){o.problemIds=unique(o.problemIds).filter(id=>!!g.problems[id]);o.taskIds=unique(o.taskIds).filter(id=>!!g.tasks[id]);o.metricIds=unique(o.metricIds).filter(id=>!!g.entities?.metric?.[id]);}
  for(const t of values(g.tasks)){if(t.stageId&&!g.stages[t.stageId])t.stageId='';if(t.journeyId&&!g.journeys[t.journeyId])t.journeyId='';t.dependencyIds=unique(t.dependencyIds).filter(id=>!!g.tasks[id]&&id!==t.id);t.metricIds=unique(t.metricIds).filter(id=>!!g.entities?.metric?.[id]);}
  for(const b of values(g.views.whiteboards)) for(const [eid,e] of Object.entries(b.edges)) if(!b.items[e.fromId]||!b.items[e.toId]||e.fromId===e.toId) delete b.edges[eid];
  const collab=g.service.collaboration;
  if(collab){
    collab.members ||= {};
    const mids=Object.keys(collab.members);
    if(!collab.currentUserId||!collab.members[collab.currentUserId])collab.currentUserId=mids[0]??'';
    const itemExists=(targetId:Id)=>values(g.views.whiteboards).some(b=>!!b.items?.[targetId]);
    for(const c of collab.comments??[]){
      if(c.authorId&&!collab.members[c.authorId])c.authorId=collab.currentUserId;
      const valid=c.targetType==='service'?c.targetId===g.service.id:c.targetType==='journey'?!!g.journeys[c.targetId]:c.targetType==='stage'?!!g.stages[c.targetId]:c.targetType==='board'?!!g.views.whiteboards[c.targetId]:c.targetType==='item'?itemExists(c.targetId):true;
      if(!valid){c.targetType='service';c.targetId=g.service.id;c.targetLabel=g.service.name;}
    }
  }
  return g;
}

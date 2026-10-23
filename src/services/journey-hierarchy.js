/** Map relationships contain identities only; content belongs to each real journey. */
export const JOURNEY_DEPTH_LIMIT = 8;
export const JOURNEY_CHILD_LIMIT = 20;
const all = graph => Object.values(graph.journeys || {});
const own = (graph,id) => graph.journeys?.[id]?.serviceId === graph.service.id;
export function journeyHierarchyPath(graph,id) {
  const path=[],seen=new Set(); let current=graph.journeys?.[id],error='';
  while(current) {
    if(seen.has(current.id)||path.length>=JOURNEY_DEPTH_LIMIT){error='Hierarquia indisponível: ciclo ou profundidade inválida.';break}
    seen.add(current.id);path.unshift({id:current.id,name:current.name,sourceStageId:current.sourceStageId||''});
    if(!current.parentJourneyId){if(current.sourceStageId)error='Vínculo de origem incompleto.';break}
    const parent=graph.journeys[current.parentJourneyId];
    if(!parent||!own(graph,parent.id)||!parent.stageIds.includes(current.sourceStageId)||graph.stages?.[current.sourceStageId]?.journeyId!==parent.id){error='A origem desta sub-jornada está indisponível.';break}
    current=parent;
  }
  return {path,error};
}
export function journeyHierarchyContext(graph,id) {
  const current=graph.journeys?.[id];if(!current)return {journeyId:id,path:[],children:[],available:[],error:'Jornada indisponível.'};
  return {journeyId:id,stages:current.stageIds.map(sid=>({id:sid,localId:graph.stages?.[sid]?.blueprintHostLocalId||sid})),...journeyHierarchyPath(graph,id),children:all(graph).filter(j=>j.parentJourneyId===id).map(j=>({id:j.id,name:j.name,stageId:j.sourceStageId||'',stageCount:j.stageIds.length})),
    available:all(graph).filter(j=>j.id!==id&&own(graph,j.id)&&!j.parentJourneyId&&!j.sourceStageId).map(j=>({id:j.id,name:j.name}))};
}
export function detachJourneyChildren(graph,parentId,stageIds) {
  for(const child of all(graph))if(child.parentJourneyId===parentId&&(!stageIds||!stageIds.includes(child.sourceStageId))){delete child.parentJourneyId;delete child.sourceStageId}
  return graph;
}
export function manageJourneyHierarchy(input,parentId,stageId,action,data={},newId=()=>crypto.randomUUID(),now=new Date().toISOString()) {
  const graph=structuredClone(input),parent=graph.journeys?.[parentId];
  if(!parent||!own(graph,parentId))throw Error('Jornada de origem indisponível.');
  if(action==='detach') {
    const child=graph.journeys[data.childId];if(!child||child.parentJourneyId!==parentId||child.sourceStageId!==stageId)throw Error('O vínculo mudou. Reabra as sub-jornadas.');
    delete child.parentJourneyId;delete child.sourceStageId;child.updatedAt=now;parent.updatedAt=now;return {graph,childId:child.id};
  }
  if(!['create','attach'].includes(action))throw Error('Ação de hierarquia inválida.');
  if(!parent.stageIds.includes(stageId)||graph.stages?.[stageId]?.journeyId!==parentId)throw Error('Etapa de origem indisponível.');
  const ancestry=journeyHierarchyPath(graph,parentId);if(ancestry.error)throw Error(ancestry.error);
  if(all(graph).filter(j=>j.parentJourneyId===parentId&&j.sourceStageId===stageId).length>=JOURNEY_CHILD_LIMIT)throw Error('Uma etapa pode ter até 20 sub-jornadas.');
  let child;
  if(action==='create') {
    const name=typeof data.name==='string'?data.name.trim():'';if(!name||name.length>160)throw Error('Informe um nome de 1 a 160 caracteres.');
    const id=newId();if(!id||graph.journeys[id])throw Error('Identidade da nova Jornada inválida.');
    child={id,serviceId:graph.service.id,name,stageIds:[],status:'draft',createdAt:now,updatedAt:now,lastOpenedAt:null};graph.journeys[id]=child;graph.service.journeyIds.push(id);
  }else{
    child=graph.journeys[data.childId];if(!child||!own(graph,child.id)||child.id===parentId)throw Error('Escolha outra Jornada deste serviço.');
    if(child.parentJourneyId||child.sourceStageId)throw Error('Desvincule a Jornada da origem atual antes de vinculá-la.');
  }
  child.parentJourneyId=parentId;child.sourceStageId=stageId;
  // Validate every affected descendant, not only the proposed parent-child edge.
  const pending=[child.id],seen=new Set();
  while(pending.length){const id=pending.pop();if(seen.has(id))throw Error('A ligação criaria um ciclo.');seen.add(id);const result=journeyHierarchyPath(graph,id);if(result.error)throw Error('A ligação cria um ciclo, origem inválida ou excede oito níveis.');for(const j of all(graph))if(j.parentJourneyId===id)pending.push(j.id)}
  // Prepare the canonical empty view during the edit, so readers can open it
  // later without needing permission to create a storage view on navigation.
  if(!Object.values(graph.views.whiteboards).some(board=>board.viewKind==='blueprint'&&board.journeyId===child.id)){
    const id='journey-map-'+child.id;if(graph.views.whiteboards[id])throw Error('Identidade do mapa indisponível.');
    graph.views.whiteboards[id]={id,serviceId:graph.service.id,journeyId:child.id,name:child.name+' · Blueprint',viewKind:'blueprint',layoutMode:'service',items:{},edges:{},gridVisible:false,updatedAt:now};
  }
  child.updatedAt=now;parent.updatedAt=now;return {graph,childId:child.id};
}

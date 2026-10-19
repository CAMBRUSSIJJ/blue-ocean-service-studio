import fs from 'node:fs';
import { buildEvidenceStudioReport, createEvidenceRecord, evidenceProfileFromEntity, updateEvidenceProfile } from '../src/services/evidence-studio.ts';
import { removeContextEntity } from '../src/services/context-library.ts';

const checks=[];
const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const view=fs.readFileSync('src/views/EvidenceView.tsx','utf8');
const service=fs.readFileSync('src/services/evidence-studio.ts','utf8');
const library=fs.readFileSync('src/views/WorkspaceLibraryView.tsx','utf8');
const context=fs.readFileSync('src/services/context-library.ts','utf8');
const css=fs.readFileSync('src/runtime/evidence-h77.css','utf8');
const style=fs.readFileSync('src/style.css','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

ok('EvidenceView dedicada existe', view.includes('data-evidence-h77="library"') && view.includes('data-evidence-h77="detail"'));
ok('WorkspaceLibrary delega Evidências', library.includes("if (page === 'evidence') return <EvidenceView studio={studio}/>"));
ok('Evidência permite criação direta', view.includes('Criar evidência') && view.includes('NOVA EVIDÊNCIA'));
ok('Detalhe possui cinco superfícies', ['Visão geral','Fonte','Contexto','Hipóteses e Problemas','Uso'].every((x)=>view.includes(x)));
ok('Registro separa observação e interpretação', view.includes('O que foi observado?') && view.includes('Interpretação') && service.includes('interpretation'));
ok('Proveniência tem campos estruturados', ['sourceType','sourceName','method','collectedAt','sample','confidence'].every((x)=>service.includes(x)));
ok('Biblioteca tem filtros próprios', ['Alta confiança','Origem rastreável','Em hipóteses','Contradições','Sem relações'].every((x)=>view.includes(x)));
ok('Decisões têm stance explícita', ['Sustenta','Contradiz','Contextual'].every((x)=>view.includes(x)) && service.includes('relationStances'));
ok('Qualidade é determinística', service.includes('qualityChecks') && service.includes('qualityScore') && service.includes('readyForDecision'));
ok('Qualidade exige contexto e uso decisório', service.includes('hasDiscoveryContext') && service.includes('hasDecisionUse'));
ok('Service Graph mantém IDs tipados da evidência', ['personaIds','needIds','jobIds','painIds','hypothesisIds','problemIds'].every((x)=>service.includes(x)));
ok('Hipótese mantém evidenceLinks', service.includes('nextEntity.evidenceLinks = links'));
ok('Problema mantém suporte e contradição', service.includes('supportingEvidenceIds') && service.includes('contradictingEvidenceIds'));
ok('Remoção limpa evidenceLinks órfãos', context.includes("kind === 'evidence' && Array.isArray(entity.evidenceLinks)"));
ok('CSS H7.7 está antes do Tailwind', style.indexOf("@import './runtime/evidence-h77.css';") >= 0 && style.indexOf("@import './runtime/evidence-h77.css';") < style.indexOf('@tailwind base'));
ok('CSS tem layout de proveniência e decisão', css.includes('.bo-h77-source-grid') && css.includes('.bo-h77-decision-list') && css.includes('.bo-h77-stance'));
ok('CSS não usa verde estrutural legado', !css.toLowerCase().includes('#1d9e75'));
ok('Script H7.7 está encadeado no QA', String(pkg.scripts.qa).includes('v1205h77:evidence-2-smoke') && Boolean(pkg.scripts['v1205h77:evidence-2-smoke']));

const now='2026-10-09T18:30:00.000Z';
const graph={
  schemaVersion:3,
  service:{id:'svc',name:'Teste',updatedAt:now,project:{definition:{problemIds:['pr1'],personaIds:['p1'],evidenceIds:['e1']}}},
  entities:{
    evidence:{e1:{id:'e1',type:'evidence',serviceId:'svc',title:'Entrevistas mostram abandono',description:'6 de 8 participantes abandonaram após ver o prazo.',interpretation:'Prazo pode ser fator de abandono.',sourceType:'interview',sourceName:'Entrevistas Discovery lote A',method:'Entrevista semiestruturada',collectedAt:'2026-10-08',sample:'8 participantes',confidence:'high',relatedIds:['p1','h1','pr1'],personaIds:['p1'],hypothesisIds:['h1'],problemIds:['pr1'],createdAt:now,updatedAt:now}},
    persona:{p1:{id:'p1',type:'persona',serviceId:'svc',title:'Cliente novo',relatedIds:['e1'],evidenceIds:['e1'],createdAt:now,updatedAt:now}},
    need:{},job:{},pain:{},
    problemHypothesis:{h1:{id:'h1',type:'problemHypothesis',serviceId:'svc',title:'Prazo causa abandono',relatedIds:['e1'],evidenceIds:['e1'],evidenceLinks:[{evidenceId:'e1',stance:'supports'}],createdAt:now,updatedAt:now}},
    problem:{pr1:{id:'pr1',type:'problem',serviceId:'svc',title:'Abandono por prazo',status:'validated',relatedIds:['e1'],evidenceIds:['e1'],supportingEvidenceIds:['e1'],contradictingEvidenceIds:[],createdAt:now,updatedAt:now}},
  },
  views:{whiteboards:{}},journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}},
};

const initial=buildEvidenceStudioReport(graph,'e1');
ok('Domínio reconhece contexto bidirecional', initial?.connectionCounts.persona === 1 && initial?.connections.some((x)=>x.id==='p1' && x.direction==='both'));
ok('Domínio reconhece stance de hipótese', initial?.supportCount === 2 && initial?.contradictionCount === 0);
ok('Qualidade chega a 100% com proveniência e uso completos', initial?.qualityScore === 100 && initial?.readyForDecision === true);

const draft={...evidenceProfileFromEntity(graph.entities.evidence.e1),interpretation:'Prazo é um fator relevante, ainda sujeito a triangulação.'};
const updated=updateEvidenceProfile({graph,evidenceId:'e1',draft,connectedIds:['p1','h1','pr1'],relationStances:{h1:'contradicts',pr1:'neutral'},owner:'Research',tags:['checkout','prazo'],now:'2026-10-09T18:35:00.000Z'});
const report=buildEvidenceStudioReport(updated,'e1');
ok('Perfil avançado persiste sem perder observação', updated.entities.evidence.e1.description.includes('6 de 8') && updated.entities.evidence.e1.interpretation.includes('triangulação'));
ok('Evidência mantém IDs tipados', updated.entities.evidence.e1.personaIds.includes('p1') && updated.entities.evidence.e1.hypothesisIds.includes('h1') && updated.entities.evidence.e1.problemIds.includes('pr1'));
ok('Relação Evidência↔Persona é bidirecional', updated.entities.persona.p1.relatedIds.includes('e1') && updated.entities.persona.p1.evidenceIds.includes('e1'));
ok('Stance da Hipótese é atualizado', updated.entities.problemHypothesis.h1.evidenceLinks.some((x)=>x.evidenceId==='e1' && x.stance==='contradicts'));
ok('Problema neutraliza listas direcionais sem perder vínculo', updated.entities.problem.pr1.evidenceIds.includes('e1') && !updated.entities.problem.pr1.supportingEvidenceIds.includes('e1') && !updated.entities.problem.pr1.contradictingEvidenceIds.includes('e1'));
ok('Relatório reflete contradição atualizada', report?.contradictionCount === 1 && report?.supportCount === 0 && report?.contextualCount === 1);

const unlinked=updateEvidenceProfile({graph:updated,evidenceId:'e1',draft,connectedIds:['p1'],relationStances:{},now:'2026-10-09T18:40:00.000Z'});
ok('Desvincular remove evidenceLinks da Hipótese', !unlinked.entities.problemHypothesis.h1.evidenceIds.includes('e1') && !unlinked.entities.problemHypothesis.h1.evidenceLinks.some((x)=>x.evidenceId==='e1'));
ok('Desvincular remove arrays do Problema', !unlinked.entities.problem.pr1.evidenceIds.includes('e1'));

const removed=removeContextEntity(updated,'evidence','e1');
ok('Remoção limpa relação genérica', !removed.entities.evidence.e1 && !removed.entities.persona.p1.relatedIds.includes('e1'));
ok('Remoção limpa evidenceLinks estruturados', !removed.entities.problemHypothesis.h1.evidenceLinks.some((x)=>x.evidenceId==='e1'));
ok('Remoção limpa suporte/contradição do Problema', !removed.entities.problem.pr1.evidenceIds.includes('e1') && !removed.entities.problem.pr1.supportingEvidenceIds.includes('e1'));
ok('Remoção limpa Service Definition', !removed.service.project.definition.evidenceIds.includes('e1'));

const created=createEvidenceRecord({graph:removed,id:'e2',title:'Nova observação',description:'Usuário hesitou no formulário',sourceType:'observation',confidence:'medium',now:'2026-10-09T18:45:00.000Z'});
ok('Criação direta nasce como evidence capturada', created.evidenceId==='e2' && created.graph.entities.evidence.e2.status==='captured' && created.graph.entities.evidence.e2.evidenceVersion===2);

const failed=checks.filter(([,v])=>!v);
console.log(`\nV1.20.5-H7.7 Evidências 2.0: ${checks.length-failed.length}/${checks.length} OK`);
if(failed.length) process.exit(1);

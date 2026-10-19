import fs from 'node:fs';
import {
  BLUEPRINT_LANE_PRESETS, BLUEPRINT_SEMANTIC_ZOOM_META, SERVICE_BLUEPRINT_LANES,
  addBlueprintLaneItem, addCustomBlueprintLane, applyBlueprintLanePreset, buildServiceBlueprintReport,
  getBlueprintSettings, getVisibleBlueprintLanes, removeCustomBlueprintLane, setBlueprintSemanticZoom,
  syncBlueprintFromJourney, updateBlueprintLaneConfig,
} from '../src/services/service-blueprint-studio.ts';

const checks=[]; const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const read=(p)=>fs.readFileSync(p,'utf8');
const model=read('src/domain/model.ts');
const schema=read('src/domain/schema.ts');
const service=read('src/services/service-blueprint-studio.ts');
const view=read('src/views/BlueprintView.tsx');
const css=read('src/runtime/blueprint-semantic-h728.css');
const style=read('src/style.css');
const pkg=JSON.parse(read('package.json'));
const preflight=read('preflight-linux.sh');

ok('modelo define BlueprintSemanticZoom', model.includes("export type BlueprintSemanticZoom = 'strategic' | 'journey' | 'operational'"));
ok('modelo define BlueprintLaneRole', model.includes("export type BlueprintLaneRole = 'evidence' | 'customer' | 'frontstage' | 'backstage' | 'process' | 'system' | 'custom'"));
ok('modelo define BlueprintLaneConfig', model.includes('export type BlueprintLaneConfig = {'));
ok('lane guarda visibleIn por zoom', model.includes('visibleIn: BlueprintSemanticZoom[]'));
ok('lane guarda required', model.includes('required: boolean'));
ok('modelo define BlueprintSettings', model.includes('export type BlueprintSettings = {'));
ok('settings guarda semanticZoom', model.includes('semanticZoom: BlueprintSemanticZoom'));
ok('settings guarda preset', model.includes("preset: 'standard' | 'healthcare' | 'hospitality' | 'saas' | 'custom'"));
ok('Whiteboard guarda blueprintSettings opcional', model.includes('blueprintSettings?: BlueprintSettings'));

ok('schema valida zoom semântico', schema.includes("const blueprintSemanticZoom=z.enum(['strategic','journey','operational'])"));
ok('schema valida lane configurável', schema.includes('const blueprintLane=z.object'));
ok('schema exige ao menos um zoom visível', schema.includes('visibleIn:z.array(blueprintSemanticZoom).min(1)'));
ok('schema valida blueprintSettings', schema.includes('const blueprintSettings=z.object'));
ok('schema mantém settings opcional e retrocompatível', schema.includes('blueprintSettings:blueprintSettings.optional()'));

ok('serviço mantém seis lanes canônicas', SERVICE_BLUEPRINT_LANES.length===6);
ok('customer aparece nos três zooms', SERVICE_BLUEPRINT_LANES.find(l=>l.key==='customer')?.visibleIn.length===3);
ok('processo nasce só no operacional', JSON.stringify(SERVICE_BLUEPRINT_LANES.find(l=>l.key==='process')?.visibleIn)==='["operational"]');
ok('evidência aparece Journey + operacional', JSON.stringify(SERVICE_BLUEPRINT_LANES.find(l=>l.key==='evidence')?.visibleIn)==='["journey","operational"]');
ok('metadata contém Estratégico', BLUEPRINT_SEMANTIC_ZOOM_META.strategic.label==='Estratégico');
ok('metadata contém Journey', BLUEPRINT_SEMANTIC_ZOOM_META.journey.label==='Journey');
ok('metadata contém Operacional', BLUEPRINT_SEMANTIC_ZOOM_META.operational.label==='Operacional');
ok('preset Saúde existe', Boolean(BLUEPRINT_LANE_PRESETS.healthcare));
ok('preset Hospitalidade existe', Boolean(BLUEPRINT_LANE_PRESETS.hospitality));
ok('preset SaaS existe', Boolean(BLUEPRINT_LANE_PRESETS.saas));
ok('SaaS inclui Customer Success', BLUEPRINT_LANE_PRESETS.saas.custom.some(l=>l.key==='customer-success'));
ok('Saúde inclui Regulação', BLUEPRINT_LANE_PRESETS.healthcare.custom.some(l=>l.key==='regulation'));
ok('Hospitalidade inclui Housekeeping', BLUEPRINT_LANE_PRESETS.hospitality.custom.some(l=>l.key==='housekeeping'));
ok('serviço expõe default settings', service.includes('createDefaultBlueprintSettings'));
ok('serviço normaliza boards legados', service.includes('getBlueprintSettings'));
ok('serviço filtra visible lanes', service.includes('getVisibleBlueprintLanes'));
ok('serviço altera zoom semântico', service.includes('setBlueprintSemanticZoom'));
ok('serviço cria custom lane', service.includes('addCustomBlueprintLane'));
ok('serviço remove custom lane com proteção', service.includes('removeCustomBlueprintLane'));
ok('serviço atualiza config de lane', service.includes('updateBlueprintLaneConfig'));
ok('serviço aplica presets', service.includes('applyBlueprintLanePreset'));
ok('report expõe settings', service.includes('settings: BlueprintSettings'));
ok('report expõe lanes visíveis', service.includes('visibleLanes: BlueprintLaneDefinition[]'));
ok('custom lane opcional não vira gap automaticamente', service.includes('const requiredLanes = lanes.filter((lane) => lane.required)'));
ok('Blueprint Health continua usando required lanes', service.includes('const totalChecks = stageReports.reduce'));

ok('view H7.28 usa marker de zoom', view.includes('data-blueprint-semantic-zoom={zoom}'));
ok('view possui toolbar de zoom semântico', view.includes('data-semantic-zoom-toolbar="1"'));
ok('view expõe Estratégico Journey Operacional via metadata', view.includes('BLUEPRINT_SEMANTIC_ZOOM_META'));
ok('view possui gerenciador de camadas', view.includes('data-custom-blueprint-layers="1"'));
ok('view permite nova camada', view.includes('Nova camada'));
ok('view permite marcar camada obrigatória', view.includes('Obrigatória'));
ok('view exibe modelos de serviço', view.includes('Modelos:'));
ok('view aplica preset Saúde/Hospitalidade/SaaS', view.includes('applyPreset(preset)'));
ok('view permite visibilidade por zoom', view.includes('toggleLaneZoom'));
ok('view remove custom lane', view.includes('deleteLane(lane.key)'));
ok('matrix usa somente visibleLanes', view.includes('report.visibleLanes.map((lane)'));
ok('custom lane renderiza célula própria', view.includes('bo-h728-cell--custom'));
ok('gap summary respeita zoom atual', view.includes('visibleGaps'));
ok('Health informa visão completa', view.includes('críticos · visão completa'));

ok('CSS H7.28 existe', fs.existsSync('src/runtime/blueprint-semantic-h728.css'));
ok('CSS H7.28 importado após H7.27', style.indexOf('service-proposition-h727.css') < style.indexOf('blueprint-semantic-h728.css'));
ok('CSS possui semantic toolbar', css.includes('.bo-h728-semantic-toolbar'));
ok('CSS possui zoom switch', css.includes('.bo-h728-zoom-switch'));
ok('CSS possui layer manager', css.includes('.bo-h728-layer-manager'));
ok('CSS possui presets', css.includes('.bo-h728-presets'));
ok('CSS possui custom lane styles', css.includes('.bo-h728-lane--custom'));
ok('CSS distingue visão estratégica', css.includes('.bo-h728-matrix.is-strategic'));
ok('CSS é responsivo', css.includes('@media(max-width:760px)'));

ok('script H7.28 registrado', Boolean(pkg.scripts['v1205h728:blueprint-semantic-smoke']));
ok('QA acumulado inclui H7.28', pkg.scripts.qa?.includes('v1205h728:blueprint-semantic-smoke'));
ok('package descreve H7.28', String(pkg.description).includes('H7.28 Blueprint Semantic Zoom + Custom Layers'));
ok('preflight conhece CSS H7.28', preflight.includes('blueprint-semantic-h728.css'));
ok('preflight conhece smoke H7.28', preflight.includes('v1205h728-blueprint-semantic-smoke.mjs'));

const graph={
 schemaVersion:3,
 service:{id:'svc',name:'Lavanderia',description:'',journeyIds:['j1'],createdAt:'2026-10-13T22:00:00.000Z',updatedAt:'2026-10-13T22:00:00.000Z'},
 journeys:{j1:{id:'j1',serviceId:'svc',name:'Jornada principal',stageIds:['s1','s2']}},
 stages:{
  s1:{id:'s1',journeyId:'j1',title:'Coleta',customerAction:'Entrega as roupas',emotion:'neutral',touchpointIds:[],problemIds:[],opportunityIds:[],evidenceIds:['e1']},
  s2:{id:'s2',journeyId:'j1',title:'Entrega',customerAction:'Recebe as roupas',emotion:'positive',touchpointIds:[],problemIds:[],opportunityIds:[],evidenceIds:[]},
 },
 touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},
 entities:{evidence:{e1:{id:'e1',type:'evidence',serviceId:'svc',title:'Entrevista 01'}}},research:{sources:{},projects:{},observations:{},collections:{}},
 views:{whiteboards:{bp1:{id:'bp1',serviceId:'svc',name:'Blueprint Lavanderia',journeyId:'j1',viewKind:'blueprint',layoutMode:'blueprint',items:{},edges:{}}}},
};
const board=graph.views.whiteboards.bp1;
let settings=getBlueprintSettings(board,'2026-10-13T22:00:00.000Z');
ok('board legado recebe settings default sem migração destrutiva', settings.semanticZoom==='operational' && settings.lanes.length===6 && !board.blueprintSettings);
ok('default operacional mostra seis lanes', getVisibleBlueprintLanes(board).length===6);
let g=setBlueprintSemanticZoom(graph,'bp1','strategic','2026-10-13T22:01:00.000Z');
ok('domínio persiste zoom estratégico no board', g.views.whiteboards.bp1.blueprintSettings?.semanticZoom==='strategic');
ok('zoom não altera itens do Blueprint', JSON.stringify(g.views.whiteboards.bp1.items)==='{}');
ok('estratégico mostra três lanes centrais', getVisibleBlueprintLanes(g.views.whiteboards.bp1).map(l=>l.key).join(',')==='customer,frontstage,backstage');
g=setBlueprintSemanticZoom(g,'bp1','journey','2026-10-13T22:02:00.000Z');
ok('Journey mostra quatro lanes', getVisibleBlueprintLanes(g.views.whiteboards.bp1).map(l=>l.key).join(',')==='evidence,customer,frontstage,backstage');
g=setBlueprintSemanticZoom(g,'bp1','operational','2026-10-13T22:03:00.000Z');
ok('Operacional volta a seis lanes', getVisibleBlueprintLanes(g.views.whiteboards.bp1).length===6);

let added=addCustomBlueprintLane({graph:g,boardId:'bp1',label:'Parceiros logísticos',tone:'rose',required:false,visibleIn:['journey','operational'],now:'2026-10-13T22:04:00.000Z'});
g=added.graph; const customKey=added.laneKey;
ok('domínio cria custom lane', Boolean(customKey) && getBlueprintSettings(g.views.whiteboards.bp1).lanes.some(l=>l.key===customKey && l.custom));
ok('custom lane nasce opcional', getBlueprintSettings(g.views.whiteboards.bp1).lanes.find(l=>l.key===customKey)?.required===false);
ok('custom lane aparece Journey+Operacional', getBlueprintSettings(g.views.whiteboards.bp1).lanes.find(l=>l.key===customKey)?.visibleIn.join(',')==='journey,operational');
g=updateBlueprintLaneConfig(g,'bp1',customKey,{required:true,visibleIn:['operational']},'2026-10-13T22:05:00.000Z');
ok('domínio altera required da custom lane', getBlueprintSettings(g.views.whiteboards.bp1).lanes.find(l=>l.key===customKey)?.required===true);
ok('domínio altera visibilidade sem apagar lane', getBlueprintSettings(g.views.whiteboards.bp1).lanes.find(l=>l.key===customKey)?.visibleIn.join(',')==='operational');
let report=buildServiceBlueprintReport(g,'bp1');
ok('required custom vazia gera gap por etapa', report?.stages.every(stage=>stage.gaps.some(gap=>gap.lane===customKey))===true);
const cell=addBlueprintLaneItem({graph:g,boardId:'bp1',stageId:'s1',lane:customKey,text:'Parceiro recebe a rota',itemId:'custom-item',now:'2026-10-13T22:06:00.000Z'});
g=cell.graph; report=buildServiceBlueprintReport(g,'bp1');
ok('custom lane aceita item operacional', cell.itemId==='custom-item' && g.views.whiteboards.bp1.items['custom-item'].blueprintLane===customKey);
ok('report conta item da custom lane', report?.stages.find(stage=>stage.stage.id==='s1')?.laneCounts[customKey]===1);
ok('gap some apenas da etapa preenchida', !report?.stages.find(stage=>stage.stage.id==='s1')?.gaps.some(gap=>gap.lane===customKey) && report?.stages.find(stage=>stage.stage.id==='s2')?.gaps.some(gap=>gap.lane===customKey));
let removed=removeCustomBlueprintLane({graph:g,boardId:'bp1',laneKey:customKey,now:'2026-10-13T22:07:00.000Z'});
ok('remoção é bloqueada quando a lane contém itens', removed.removed===false && removed.reason?.includes('itens'));

let preset=applyBlueprintLanePreset({graph:g,boardId:'bp1',preset:'saas',now:'2026-10-13T22:08:00.000Z'});
g=preset.graph;
ok('preset SaaS adiciona quatro camadas', preset.added===4);
ok('preset fica registrado', g.views.whiteboards.bp1.blueprintSettings?.preset==='saas');
ok('preset inclui interface', getBlueprintSettings(g.views.whiteboards.bp1).lanes.some(l=>l.key==='interface'));
ok('preset inclui automação', getBlueprintSettings(g.views.whiteboards.bp1).lanes.some(l=>l.key==='automation'));
const preset2=applyBlueprintLanePreset({graph:g,boardId:'bp1',preset:'saas',now:'2026-10-13T22:09:00.000Z'});
ok('aplicar mesmo preset é idempotente', preset2.added===0);
const beforeSettings=JSON.stringify(preset2.graph.views.whiteboards.bp1.blueprintSettings);
const synced=syncBlueprintFromJourney(preset2.graph,'bp1','2026-10-13T22:10:00.000Z');
ok('sync Journey preserva settings H7.28', JSON.stringify(synced.graph.views.whiteboards.bp1.blueprintSettings)===beforeSettings);
ok('sync Journey continua trazendo estágio/evidência', synced.added>=3);
report=buildServiceBlueprintReport(synced.graph,'bp1');
ok('report final continua reconhecendo Journey', report?.journeyName==='Jornada principal' && report.stageCount===2);
ok('report final mantém lanes customizadas', report?.lanes.some(l=>l.key==='customer-success') && report?.lanes.some(l=>l.key===customKey));

const failed=checks.filter(([,v])=>!v);
console.log(`\nV1.20.5-H7.28 Blueprint Semantic Zoom + Custom Layers: ${checks.length-failed.length}/${checks.length} OK`);
if(failed.length) process.exit(1);

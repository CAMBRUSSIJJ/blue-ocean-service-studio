#!/usr/bin/env python3
"""Canvas acceptance against the real host, graph, storage and history."""
import functools,json,os,shutil,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/blueprint-canvas';OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
 def copyfile(self,source,output):
  try:super().copyfile(source,output)
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start();URL=f'http://127.0.0.1:{server.server_port}'
def check(name,value=True):
 assert value,name
 checks.append(name);print('PASS '+name,flush=True)
def graph(page):return page.evaluate("()=>window.BlueOceanRuntime.api('dataBridge').get()")
def saved(f):expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
def stage(f,name):
 f.get_by_role('button',name='Adicionar etapa',exact=True).first.click();field=f.locator('#cad-quick-form [name=title]');field.fill(name);field.press('Enter');saved(f)
def details(f,note_id):
 """Use the canonical card-selection interaction instead of transient context menus."""
 mobile=f.locator('.cad-shell').evaluate('()=>matchMedia("(max-width:760px)").matches')
 if mobile:
  f.locator(f'.cad-mobile-card [data-act="cad-select"][data-id="{note_id}"]').click()
 else:
  f.get_by_role('button',name='Ajustar',exact=True).click()
  f.locator(f'.cad-node[data-id="{note_id}"]').click()
 form=f.locator('#cad-component-form')
 expect(form).to_be_visible(timeout=5000)
 return form
def add(f,kind,title,stage_index=0,**values):
 if f.locator('.cad-shell').evaluate('()=>matchMedia("(max-width:760px)").matches'):f.get_by_role('button',name='+ Componente',exact=True).click()
 button=f.locator(f'[data-act="cad-add"][data-kind="{kind}"]:visible')
 try:
  expect(button).to_be_enabled(timeout=4000)
 except AssertionError:
  frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
  diagnostics=frame.evaluate("""() => ({
    pending:cadState.pending,
    readOnly:S.readOnly,
    saveLabel,
    quick:cadState.quick?.kind||null,
    creating:cadState.creating?.kind||null,
    error:cadState.error
  })""")
  raise AssertionError(f'Editor permanece bloqueado antes de criar {kind}: {diagnostics}')
 button.click();field=f.locator('#cad-quick-form [name=title]');field.fill(title);field.press('Enter');saved(f)
 fr=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame();note_id=fr.evaluate('(title)=>Object.values(S.c).flat().find(note=>note.t===title).i',title)
 form=details(f,note_id);form.locator('[name=stageKey]').select_option(index=stage_index)
 for name,value in values.items():form.locator(f'[name={name}]').fill(str(value))
 form.get_by_role('button',name='Salvar componente',exact=True).click();saved(f)
def audit(frame,label):
 frame.add_script_tag(content=(ROOT/'node_modules/axe-core/axe.min.js').read_text());violations=frame.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
 (OUT/f'{label}-axe.json').write_text(json.dumps(violations,indent=2));check('Accessibility '+label,not violations)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  context=browser.new_context(viewport={'width':1600,'height':1000},accept_downloads=True);page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
  page.add_locator_handler(page.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click())
  page.goto(URL,wait_until='networkidle');page.get_by_role('button',name='Abrir workspace local sem conta').click()
  page.get_by_role('button',name='Novo projeto',exact=True).click();page.get_by_label('Nome do projeto',exact=True).fill('Canvas QA');page.get_by_label('Serviço principal',exact=True).fill('Clínica');page.get_by_role('button',name='Criar projeto',exact=True).click()
  page.evaluate("""()=>window.BlueOceanRuntime.api('dataBridge').transact(g=>{g.entities.channel||={};g.entities.channel['qa-whatsapp']={id:'qa-whatsapp',type:'channel',serviceId:g.service.id,title:'WhatsApp QA',createdAt:new Date().toISOString()};return g},'Canal fictício')""")
  page.get_by_role('button',name='Criar mapa',exact=True).click();page.get_by_role('button',name='Em branco',exact=False).first.click()
  f=page.frame_locator('.bo-blueprint-reference-frame');saved(f)
  for name in ['Agendar','Atender','Acompanhar']:stage(f,name)
  f.locator('[data-cad-view]').select_option('blueprint');saved(f);expect(f.locator('#cad-svg')).to_be_visible();check('Blueprint opens canvas over the existing Journey')
  f.locator('[data-act="cad-stage-edit"][data-si="0"]').click();f.get_by_role('textbox',name='Nome da etapa',exact=True).fill('Agendar consulta');f.get_by_role('textbox',name='Nome da etapa',exact=True).press('Enter');saved(f);check('Canvas stage properties update the canonical stage',any(stage['title']=='Agendar consulta' for stage in graph(page)['stages'].values()))
  for kind,title,index in [('activity','Confirmar agendamento',0),('touchpoint','Solicitar horário',0),('artifact','Confirmação por mensagem',0),('decision','Verificar prontuário',1),('system','Agenda clínica',0),('resource','Sala de consulta',1),('metric','Tempo de espera',1)]:add(f,kind,title,index,owner='Ana',team='Recepção',durationMinutes=5,waitMinutes=10,targetMinutes=12)
  expect(f.locator('.cad-node')).to_have_count(7);g=graph(page);journey=next(iter(g['journeys'].values()));jid=journey['id'];check('All seven components create canonical records',bool(g['touchpoints']) and bool(g['entities']['resource']) and bool(g['entities']['metric']))
  frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
  note_id=frame.evaluate("()=>Object.values(S.c).flat().find(n=>n.t==='Confirmar agendamento').i")
  f.get_by_role('button',name='Ajustar',exact=True).click();node=f.locator(f'.cad-node[data-id="{note_id}"]');node.focus();node.press('Enter');expect(f.locator('#cad-quick-form')).to_be_visible();check('Keyboard Enter opens quick card editing');f.get_by_role('button',name='Fechar edição rápida',exact=True).click();details(f,note_id)
  field=f.locator('#cad-component-form [name=owner]');field.fill('Beatriz');field.press('Tab');expect(f.locator('#cad-component-form [name=team]')).to_be_focused();check('Editing fields keeps focus through input and change')
  f.get_by_role('button',name='Cancelar',exact=True).click();node=f.locator(f'.cad-node[data-id="{note_id}"]');details(f,note_id);expect(f.locator('#cad-component-form [name=owner]')).to_have_value('Ana');check('Cancel discards the inspector draft')
  f.locator('#cad-component-form [name=owner]').fill('Beatriz');f.locator('#cad-component-form [name=row]').select_option('bk');f.locator('#cad-component-form [name=stageKey]').select_option(index=1);f.get_by_role('button',name='Salvar componente',exact=True).click();saved(f)
  check('Move through inspector preserves visual identity',frame.evaluate('(id)=>S.c["bk|1"].some(n=>n.i===id&&n.activity.owner==="Beatriz")',note_id))
  f.get_by_role('button',name='Desfazer',exact=True).click();saved(f);frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame();check('Undo restores location and ownership',frame.evaluate('(id)=>S.c["fl|0"].some(n=>n.i===id&&n.activity.owner==="Ana")',note_id))
  f.get_by_role('button',name='Refazer',exact=True).click();saved(f);frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame();check('Redo restores moved component',frame.evaluate('(id)=>S.c["bk|1"].some(n=>n.i===id)',note_id))
  ids=frame.evaluate('()=>Object.fromEntries(Object.values(S.c).flat().map(n=>[n.canvas.kind,n.i]))')
  form=details(f,ids['touchpoint']);form.locator('[name=stageKey]').select_option(index=1);form.get_by_role('button',name='Salvar componente',exact=True).click();saved(f)
  check('Moving a touchpoint updates its canonical stage membership',all(not stage.get('touchpointIds') for stage in list(graph(page)['stages'].values())[:1]) and bool(list(graph(page)['stages'].values())[1].get('touchpointIds')))
  node=f.locator(f'.cad-node[data-id="{note_id}"]');form=details(f,note_id);form.locator('[name=channelId]').select_option('qa-whatsapp');form.locator('[name=metricId]').select_option(index=1);form.get_by_role('button',name='Salvar componente',exact=True).click();saved(f)
  check('Channel and metric bindings reach canonical records',any(rec.get('canvasChannelId')=='qa-whatsapp' and rec.get('canvasMetricId') for rec in graph(page)['entities']['backstage'].values()))
  f.get_by_role('button',name='Ajustar',exact=True).click();node=f.locator(f'.cad-node[data-id="{note_id}"]');source=node.bounding_box();target=f.locator('.cad-cell[data-row="bk"][data-si="2"]').bounding_box();page.mouse.move(source['x']+source['width']/2,source['y']+source['height']/2);page.mouse.down();page.mouse.move(target['x']+target['width']/2,target['y']+target['height']*.3,steps=12);page.mouse.up();saved(f)
  check('Pointer drag moves the same component to another stage',frame.evaluate('(id)=>(S.c["bk|2"]||[]).some(n=>n.i===id)',note_id))
  before_invalid=graph(page);frame.evaluate("()=>cadSend('canvas-create',{input:{kind:'system',title:'Inválido',row:'fl',stageId:S.steps[0].hostStageId}})");expect(f.locator('[data-cad-status]')).to_contain_text('compatível');check('Host rejects invalid components without creating orphan records',graph(page)==before_invalid);frame.evaluate("()=>cadAction('cad-cancel',{})")
  def link(kind,a,b,**values):
   f.get_by_role('button',name='Ajustar',exact=True).click();f.locator(f'.cad-node[data-id="{a}"]').click(button='right');f.get_by_role('button',name='Conectar a outro cartão',exact=True).click();f.locator('[data-cad-connect-type]').select_option(kind);f.locator(f'.cad-node[data-id="{b}"]').click()
   if kind!='handoff':return f.locator('[data-cad-status]')
   form=f.locator('#cad-link-form')
   for name,value in values.items():form.locator(f'[name={name}]').fill(str(value))
   form.get_by_role('button',name='Salvar conexão',exact=True).click();return form
  link('sequence',ids['touchpoint'],ids['activity']);saved(f);link('dependency',ids['decision'],ids['activity']);saved(f);link('uses',ids['activity'],ids['system']);saved(f)
  link('handoff',ids['activity'],ids['decision'],fromTeam='Recepção',toTeam='Clínica',deliverable='Prontuário conferido',deadlineMinutes=15,acceptance='Identificação e histórico completos');saved(f)
  check('Four typed connections persist with handoff terms',len(graph(page)['journeys'][jid]['matrixContent']['connections'])==4)
  form=link('dependency',ids['activity'],ids['decision']);expect(f.locator('[data-cad-status]')).to_contain_text('ciclo');check('Cyclic dependency rejected without mutation',len(graph(page)['journeys'][jid]['matrixContent']['connections'])==4);f.get_by_role('button',name='Cancelar conexão',exact=True).click()
  form=link('sequence',ids['touchpoint'],ids['activity']);expect(f.locator('[data-cad-status]')).to_contain_text('já existe');check('Duplicate relation rejected');f.get_by_role('button',name='Cancelar conexão',exact=True).click()
  expect(f.locator('.cad-edge')).to_have_count(4);page.screenshot(path=str(OUT/'connected-overview.png'),animations='disabled')
  for i in range(5):add(f,'activity','Atividade adicional '+str(i),0)
  check('Dense automatic layout has no overlaps',frame.evaluate('()=>{const ns=cadState.layout.nodes;return ns.every((a,i)=>ns.slice(i+1).every(b=>a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y))}'))
  f.locator('.cad-options summary').click();f.locator('[data-cad-links]').select_option('all');saved(f);expect(f.locator('.cad-edge')).to_have_count(4)
  f.get_by_role('button',name='Ajustar',exact=True).click();check('Semantic zoom activates overview at low zoom',frame.evaluate('()=>cadState.camera.zoom<.7'))
  f.locator('[data-cad-detail]').select_option('detail');check('User can explicitly choose the detail level',page.locator('.bo-blueprint-reference-frame').element_handle().content_frame().evaluate("()=>cadState.detail==='detail'"));f.locator('.cad-options summary').click()
  f.get_by_role('button',name='Revisar operação',exact=True).click();expect(f.locator('#business-review')).to_be_visible();expect(f.locator('#business-review')).to_contain_text('ultrapassam');f.get_by_role('button',name='Fechar revisão',exact=True).click();check('Operational review identifies recorded waits and missed deadlines')
  f.locator('.cad-options summary').click()
  with page.expect_download() as download:f.get_by_role('button',name='Exportar SVG',exact=True).click()
  path=OUT/'blueprint.svg';download.value.save_as(path);svg=path.read_text();check('SVG keeps arrowheads, labels and handoff acceptance','arrow-handoff' in svg and 'Identificação e histórico completos' in svg and 'Passagem entre equipes' in svg)
  f.locator('.cad-options summary').click();page.screenshot(path=str(OUT/'desktop.png'),animations='disabled');audit(frame,'desktop')
  system_count=len(graph(page)['entities']['system']);f.locator('[data-act="cad-add"][data-kind="system"]').click();form=f.locator('#cad-quick-form');form.locator('[name=title]').fill('Preservar nome original');form.locator('.cad-quick-reuse summary').click();form.locator('[name=referenceId]').select_option(index=1);form.get_by_role('button',name='Criar cartão',exact=True).click();saved(f);check('Reusing a system preserves its record and original title',len(graph(page)['entities']['system'])==system_count and all(rec.get('title')!='Preservar nome original' for rec in graph(page)['entities']['system'].values()))
  before=frame.evaluate('()=>Object.values(S.c).flat().map(n=>n.i).sort()');f.locator('[data-cad-view]').select_option('matrix');saved(f);expect(f.locator('.matrix')).to_be_visible();f.get_by_role('button',name='Canvas',exact=True).click();saved(f);check('Matrix and canvas share placements and stable IDs',frame.evaluate('()=>Object.values(S.c).flat().map(n=>n.i).sort()')==before)
  page.reload(wait_until='networkidle');page.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click();page.locator('[data-journey-library]').get_by_role('button',name='Abrir mapa',exact=True).first.click();f=page.frame_locator('.bo-blueprint-reference-frame');saved(f);frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame();expect(f.locator('#cad-svg')).to_be_visible();check('Canvas preference, metadata and links survive reload',len(graph(page)['journeys'][jid]['matrixContent']['connections'])==4 and frame.evaluate('()=>Object.values(S.c).flat().map(n=>n.i).sort()')==before)
  page.set_viewport_size({'width':390,'height':844});expect(f.locator('.cad-stage-nav')).to_be_visible();check('Phone uses a navigable one-stage layout')
  add(f,'activity','Retorno por telefone',2,owner='Carlos');check('Phone can add components using closable sheets')
  f.get_by_role('button',name='Próxima etapa',exact=True).click();f.get_by_role('button',name='Próxima etapa',exact=True).click();mobile_id=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame().evaluate("()=>Object.values(S.c).flat().find(note=>note.t==='Retorno por telefone').i");details(f,mobile_id);expect(f.locator('#cad-inspector-sheet')).to_be_visible();f.locator('#cad-component-form [name=owner]').fill('Diana');f.get_by_role('button',name='Salvar componente',exact=True).click();saved(f);expect(f.locator('#cad-inspector-sheet')).not_to_be_visible();check('Phone saves properties and returns to stage navigation')
  f.get_by_role('button',name='+ Componente',exact=True).click();f.get_by_role('button',name='Fechar componentes',exact=True).click();expect(f.locator('#cad-library-sheet')).not_to_be_visible();check('Phone library can be closed without covering the map')
  frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame();audit(frame,'phone');check('Phone content does not overflow horizontally',frame.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'));page.screenshot(path=str(OUT/'phone.png'),animations='disabled')
  page.set_viewport_size({'width':834,'height':1000});expect(f.locator('#cad-svg')).to_be_visible();frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame();audit(frame,'tablet');check('Tablet preserves canvas controls without horizontal overflow',frame.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'));page.screenshot(path=str(OUT/'tablet.png'),animations='disabled')
  owner=page.evaluate("()=>window.BlueOceanRuntime.api('collaboration').currentMember().id")
  page.evaluate("()=>{const api=window.BlueOceanRuntime.api('collaboration');api.setCurrentUser(api.addMember({name:'Leitor QA',role:'viewer'}))}")
  page.reload(wait_until='networkidle');page.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click();page.locator('[data-journey-library]').get_by_role('button',name='Abrir mapa',exact=True).first.click();f=page.frame_locator('.bo-blueprint-reference-frame');saved(f);expect(f.get_by_role('button',name='+ Componente',exact=True)).to_be_disabled();check('Viewer sees disabled editing controls');expect(f.get_by_role('textbox',name='Nome do mapa',exact=True)).to_have_attribute('readonly','')
  frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame();before_readonly=graph(page)
  response=frame.evaluate("""()=>new Promise(resolve=>{const id='readonly-qa';const receive=e=>{if(e.data?.type==='canvas-result'&&e.data.requestId===id){removeEventListener('message',receive);resolve({ok:e.data.ok,error:e.data.error})}};addEventListener('message',receive);parent.postMessage({boBlueprintHost:1,type:'canvas-create',requestId:id,input:{kind:'system',title:'Não autorizado',row:'sy',stageId:S.steps[0].hostStageId}},location.origin)})""")
  check('Host rejects direct mutation for viewer',not response['ok'] and 'leitura' in response['error'] and graph(page)==before_readonly)
  page.evaluate("id=>window.BlueOceanRuntime.api('collaboration').setCurrentUser(id)",owner)
  check('No JavaScript errors',not errors);browser.close()
finally:
 server.shutdown();(OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
print(f'Canvas browser: {len(checks)} PASS',flush=True)

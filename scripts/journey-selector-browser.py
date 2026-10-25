#!/usr/bin/env python3
"""Acceptance of the universal service-element selector, creation and atomic linking."""
import functools,json,os,shutil,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from map_browser_support import use_matrix, matrix_perspective
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/journey-selector';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_): pass
 def copyfile(self,source,output):
  try: super().copyfile(source,output)
  except (BrokenPipeError,ConnectionResetError): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}';checks=[]
def check(name,ok):
 assert ok,name
 checks.append(name);print('PASS '+name,flush=True)
def graph(p): return p.evaluate("()=>window.BlueOceanRuntime.api('dataBridge').get()")
def saved(f):
    expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
    use_matrix(f)
def frame(p): return p.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
def add(f,key,kind):
 f.locator(f'[data-cell="{key}"]>.content-add').click();f.get_by_role('button',name='Adicionar '+kind,exact=True).click()
def inline(f,key,value,kind='Texto'):
 add(f,key,kind);field=f.locator(f'[data-cell="{key}"] [data-ed="c"]').last;expect(field).to_be_focused();field.fill(value);field.press('Tab');saved(f)
def audit(p,label):
 fr=frame(p);fr.add_script_tag(content=(ROOT/'node_modules/axe-core/axe.min.js').read_text());result=fr.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
 (OUT/(label+'-axe.json')).write_text(json.dumps(result,indent=2));check('No axe violations: '+label,not result)
def tool(f,name,key=None):
 f.get_by_role('button',name='+ Adicionar faixa',exact=True).click()
 f.get_by_role('searchbox',name='Buscar tipo de conteúdo',exact=True).fill(name)
 f.get_by_role('button',name='Mostrar '+name,exact=True).click();saved(f)
 if key and name=='Gráfico de emoções':
  f.get_by_role('button',name='Cancelar',exact=True).click();f.locator('[data-act="emotion-edit"][data-si="'+key.split('|')[1]+'"]').click()
def link(f,key,kind,record):
 add(f,key,kind);dialog=f.locator('#element-selector');dialog.locator('[data-act="elements-select"][data-source="'+record+'"]').click();dialog.get_by_role('button',name='Vincular à etapa',exact=True).click();expect(dialog).not_to_be_visible();saved(f)
def reopen(page):
 page.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click();page.get_by_role('button',name='Abrir mapa',exact=True).first.click();return page.frame_locator('.bo-blueprint-reference-frame')
def select_record(dialog,record): dialog.locator('[data-act="elements-select"][data-source="'+record+'"]').click()
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_locator_handler(page.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click())
  page.goto(URL,wait_until='networkidle');page.get_by_role('button',name='Abrir workspace local sem conta').click();page.get_by_role('button',name='Novo projeto',exact=True).click()
  page.get_by_label('Nome do projeto',exact=True).fill('QA Seletor Universal');page.get_by_label('Serviço principal',exact=True).fill('Atendimento');page.get_by_role('button',name='Criar projeto',exact=True).click()
  page.get_by_role('button',name='Criar mapa',exact=True).click();page.get_by_role('button',name='Em branco').first.click()
  f=page.frame_locator('.bo-blueprint-reference-frame');saved(f)
  for name in ['Descobrir','Usar']:
   f.get_by_role('button',name='Adicionar etapa',exact=True).click();f.get_by_role('textbox',name='Nome da nova etapa',exact=True).fill(name);f.get_by_role('button',name='Adicionar etapa ao mapa',exact=True).click();saved(f)
  state=graph(page);jid=next(iter(state['journeys']));s1,s2=state['journeys'][jid]['stageIds']
  page.evaluate("""()=>window.BlueOceanRuntime.api('dataBridge').transact(g=>{
   g.entities.need.n={id:'n',type:'need',serviceId:g.service.id,title:'Receber previsão'};
   g.entities.evidence.e={id:'e',type:'evidence',serviceId:g.service.id,title:'Entrevista com cliente',source:'Pesquisa de atendimento'};
   g.entities.pain.p={id:'p',type:'pain',serviceId:g.service.id,title:'Espera sem previsão',description:'Não recebe retorno sobre o prazo',category:'Tempo',relatedIds:['n'],evidenceIds:['e'],createdBy:'member-local-owner'};
   g.entities.pain.q={id:'q',type:'pain',serviceId:g.service.id,title:'Informação incompleta',description:'Faltam detalhes',category:'Comunicação'};
   return g
  },'Dados fictícios de teste do seletor')""");saved(f)
  add(f,'ac|0','Dor');d=f.locator('#element-selector');search=d.get_by_role('searchbox',name='Pesquisar dores',exact=True);expect(search).to_be_focused()
  check('Opening the selector is read-only and lists real canonical records',len(graph(page)['entities']['pain'])==2 and d.locator('.element-record').count()==2)
  search.fill('PREVISAO');expect(d.locator('.element-record')).to_have_count(1);search.press('ArrowDown');page.keyboard.press('Enter')
  expect(d.locator('[data-source="p"]')).to_have_attribute('aria-pressed','true')
  check('Accent-insensitive search and keyboard selection expose real needs and evidence','Receber previsão' in d.locator('.element-detail').inner_text() and 'Entrevista com cliente' in d.locator('.element-detail').inner_text())
  d.get_by_role('button',name='Criados por mim',exact=True).click();expect(d.locator('.element-record')).to_have_count(1)
  d.get_by_role('button',name='Desta Jornada',exact=True).click();expect(d.locator('.element-record')).to_have_count(0)
  check('Journey and creator filters do not infer ownership or fabricate stage usage',True)
  d.get_by_role('button',name='Todos os registros',exact=True).click();search.fill('');d.get_by_text('Filtros personalizados',exact=True).click()
  d.get_by_label('Categoria',exact=True).select_option('Comunicação');expect(d.locator('.element-record')).to_have_count(1)
  d.get_by_label('Com evidências vinculadas',exact=True).check();expect(d.locator('.element-record')).to_have_count(0)
  d.get_by_role('button',name='Limpar filtros',exact=True).click();expect(d.locator('.element-record')).to_have_count(2)
  select_record(d,'p');d.get_by_label('Legenda no mapa',exact=True).fill('Dor deste momento');d.get_by_role('button',name='Vincular à etapa',exact=True).click();expect(d).not_to_be_visible();saved(f)
  check('Linking uses the existing identity and preserves canonical research and stage actions',len(graph(page)['entities']['pain'])==2 and graph(page)['journeys'][jid]['matrixContent']['cells'][s1]['ac'][0]['referenceId']=='p' and not graph(page)['stages'][s1]['customerAction'])
  add(f,'ac|1','Dor');d=f.locator('#element-selector');d.get_by_role('button',name='Desta Jornada',exact=True).click();expect(d.locator('.element-record')).to_have_count(1);select_record(d,'p')
  check('A linked pain exposes its real stage in the details pane','Descobrir' in d.locator('.element-detail').inner_text())
  d.get_by_role('button',name='Vincular à etapa',exact=True).click();expect(d).not_to_be_visible();saved(f)
  add(f,'ac|0','Dor');d=f.locator('#element-selector');select_record(d,'p');before=graph(page);d.get_by_role('button',name='Vincular à etapa',exact=True).click();expect(d.locator('.form-error')).to_contain_text('já está vinculado')
  check('A duplicate link is rejected with no canonical mutation',graph(page)==before);d.get_by_role('button',name='Cancelar',exact=True).click()
  add(f,'ac|0','Dor');d=f.locator('#element-selector');d.get_by_role('searchbox').fill('Dor cancelada');d.get_by_role('button',name='+ Criar nova dor',exact=True).click();expect(d.get_by_label('Nome do registro',exact=True)).to_have_value('Dor cancelada');d.get_by_label('Descrição',exact=True).fill('Rascunho');page.keyboard.press('Escape')
  expect(f.locator('[data-cell="ac|0"]>.content-add')).to_be_focused();check('Escape discards creation drafts and restores the insertion control',graph(page)==before)
  created={}
  for kind,label,title in [('pain','Dor','Retorno demorado'),('need','Necessidade','Saber o prazo'),('persona','Persona','Marina'),('evidence','Evidência','Observação do atendimento'),('channel','Canal','Canal <script>window.selectorInjected=1</script>'),('opportunity','Oportunidade','Avisar o prazo')]:
   add(f,'ac|1',label);d=f.locator('#element-selector');d.locator('[data-act="elements-create"]').click();d.get_by_label('Nome do registro',exact=True).fill(title);d.get_by_label('Descrição',exact=True).fill('Contexto fornecido pela equipe');d.locator('#element-create-form').get_by_label('Categoria',exact=True).fill('Atendimento')
   if kind=='evidence':
    previous=graph(page);d.get_by_role('button',name='Criar e vincular à etapa',exact=True).click();check('Evidence creation requires a real source before any transaction',graph(page)==previous);d.get_by_label('Fonte da evidência',exact=True).fill('Registro de observação, equipe de atendimento')
   d.get_by_role('button',name='Criar e vincular à etapa',exact=True).click();expect(d).not_to_be_visible();saved(f)
   current=graph(page);cells=current['journeys'][jid]['matrixContent']['cells'][s2]['ac']
   records=current['opportunities'] if kind=='opportunity' else current['entities'][kind]
   linked=[(note,records.get(note.get('referenceId'))) for note in cells if note.get('type')==kind]
   matches=[(note,record) for note,record in linked if record and record.get('title')==title]
   if len(matches)!=1 or matches[0][1].get('createdBy')!='member-local-owner':
    print('CREATE_DIAGNOSTIC',kind,[(note.get('referenceId'),record.get('title') if record else None,record.get('createdBy') if record else None) for note,record in linked])
   check('Creation persists one canonical '+kind+' and its reference together',len(matches)==1 and matches[0][1].get('createdBy')=='member-local-owner')
   record_id=matches[0][0]['referenceId'];created[kind]=record_id
   if kind=='pain':
    f.get_by_role('button',name='Desfazer',exact=True).click();expect(f.locator('.type-pain .service-reference b').filter(has_text=title)).to_have_count(0);check('One undo removes both creation and placement',record_id not in graph(page)['entities']['pain'])
    f.get_by_role('button',name='Refazer',exact=True).click();expect(f.locator('.type-pain .service-reference b').filter(has_text=title)).to_have_count(1);check('Redo restores both with the same identity',record_id in graph(page)['entities']['pain'])
  check('User content is escaped in both selector and cards',not frame(page).evaluate('window.selectorInjected||false'))
  original=f.locator('[data-cell="ac|0"] .type-pain').first;original_id=original.get_attribute('data-nid');original.locator('summary[aria-label="Ações da nota"]').click();original.get_by_role('button',name='Editar elemento',exact=True).click()
  d=f.locator('#element-selector');select_record(d,'q');d.get_by_label('Legenda no mapa',exact=True).fill('Legenda revisada');d.get_by_role('button',name='Vincular à etapa',exact=True).click();expect(d).not_to_be_visible();saved(f)
  edited=graph(page)['journeys'][jid]['matrixContent']['cells'][s1]['ac'][0]
  check('Editing changes the reference and local caption while preserving the card identity',edited['id']==original_id and edited['referenceId']=='q' and edited['text']=='Legenda revisada' and graph(page)['entities']['pain']['p']['title']=='Espera sem previsão')
  add(f,'ac|0','Dor');d=f.locator('#element-selector');d.get_by_role('button',name='Criados por mim',exact=True).click();expect(d.locator('.element-record')).to_have_count(2);select_record(d,created['pain'])
  detail=d.locator('.element-detail').inner_text();check('New records become searchable with correct ownership and stage usage','Usar' in detail)
  d.get_by_text('Filtros personalizados',exact=True).click();d.get_by_label('Etapa em que aparece',exact=True).select_option(s2);expect(d.locator('.element-record')).to_have_count(2);d.get_by_role('button',name='Cancelar',exact=True).click()
  for width in [1440,834,390]:
   page.set_viewport_size({'width':width,'height':1000});add(f,'ac|0','Dor');d=f.locator('#element-selector');select_record(d,'p');audit(page,'selector-'+str(width));box=d.bounding_box()
   check('Selector remains inside the viewport at '+str(width)+'px',box['x']>=0 and box['x']+box['width']<=width and frame(page).evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.screenshot(path=str(OUT/('selector-'+str(width)+'.png')),animations='disabled');d.get_by_role('button',name='Cancelar',exact=True).click()
  page.set_viewport_size({'width':1440,'height':1000});add(f,'ac|0','Persona');d=f.locator('#element-selector');d.locator('[data-act="elements-create"]').click();audit(page,'create-form');d.get_by_role('button',name='Cancelar',exact=True).click()
  f.get_by_role('button',name='Voltar para mapas do serviço',exact=True).click();page.reload(wait_until='networkidle');f=reopen(page)
  expect(f.locator('.type-persona .service-reference b')).to_have_text('Marina');check('Reload retains all six created records and their canonical references',all(created[kind] in (graph(page)['opportunities'] if kind=='opportunity' else graph(page)['entities'][kind]) for kind in created))
  f.get_by_role('button',name='Apresentar',exact=True).click()
  with page.expect_download() as download:f.get_by_role('button',name='Baixar resumo HTML',exact=True).click()
  exported=Path(download.value.path()).read_text();check('The standalone report exports canonical content with safe escaping','Marina' in exported and '&lt;script&gt;' in exported and '<script>window.selectorInjected' not in exported);f.get_by_role('button',name='Voltar ao mapa',exact=True).click()
  f.get_by_role('button',name='Voltar para mapas do serviço',exact=True).click()
  touch=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,storage_state=page.context.storage_state());mobile=touch.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)));mobile.add_locator_handler(mobile.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click())
  mobile.goto(URL,wait_until='networkidle');mobile.get_by_role('button',name='Abrir workspace local sem conta').click();mobile.get_by_role('button',name='Abrir navegação',exact=True).click();mf=reopen(mobile);saved(mf)
  mf.locator('.lb').first.tap();mf.locator('[data-cell="ac|0"]>.content-add').tap();mf.get_by_role('button',name='Adicionar Persona',exact=True).tap();md=mf.locator('#element-selector');select_record(md,created['persona']);audit(mobile,'selector-touch');md.get_by_role('button',name='Vincular à etapa',exact=True).tap();expect(md).not_to_be_visible();saved(mf)
  check('Touch insertion reuses a canonical persona without duplication',len(graph(mobile)['entities']['persona'])==1 and mf.locator('.type-persona').count()==2);touch.close()
  f=reopen(page);viewer=page.evaluate("()=>window.BlueOceanRuntime.api('collaboration').addMember({name:'Leitor de QA',role:'viewer'})")
  page.evaluate("id=>window.BlueOceanRuntime.api('collaboration').setCurrentUser(id)",viewer)
  saved(f);before_readonly=graph(page)
  result=frame(page).evaluate("""async input=>new Promise(resolve=>{
   const handler=event=>{if(event.source===parent&&event.data.type==='element-result'&&event.data.requestId==='readonly-qa'){removeEventListener('message',handler);resolve(event.data)}};
   addEventListener('message',handler);parent.postMessage({boBlueprintHost:1,type:'element-link',requestId:'readonly-qa',input},location.origin)
  })""",{'elementType':'pain','stageId':s1,'rowId':'ac','newRecord':{'title':'Não permitido'}})
  after_readonly=graph(page)
  check('The host rejects creation for a read-only member without mutation',not result['ok'] and 'somente leitura' in result['error'] and after_readonly['entities']==before_readonly['entities'] and after_readonly['journeys'][jid]['matrixContent']==before_readonly['journeys'][jid]['matrixContent'])
  check('No uncaught browser errors',not errors);(OUT/'results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2));browser.close()
except Exception:
 print('Browser errors:',errors if 'errors' in globals() else [],flush=True)
 raise
finally:server.shutdown();server.server_close()

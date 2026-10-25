#!/usr/bin/env python3
"""Acceptance of existing service references and original Journey tools."""
import functools,json,os,shutil,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from map_browser_support import use_matrix, matrix_perspective
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/journey-elements';OUT.mkdir(parents=True,exist_ok=True)
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
 add(f,key,kind);dialog=f.locator('#element-selector');dialog.locator('[data-act="elements-select"][data-source="'+record+'"]').click();dialog.get_by_role('button',name='Vincular à etapa',exact=True).click();saved(f)
def reopen(page):
 page.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click();page.get_by_role('button',name='Abrir mapa',exact=True).first.click();return page.frame_locator('.bo-blueprint-reference-frame')
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.add_locator_handler(page.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click())
  page.goto(URL,wait_until='networkidle');page.get_by_role('button',name='Abrir workspace local sem conta').click();page.get_by_role('button',name='Novo projeto',exact=True).click();page.get_by_label('Nome do projeto',exact=True).fill('QA Elementos do serviço');page.get_by_label('Serviço principal',exact=True).fill('Atendimento');page.get_by_role('button',name='Criar projeto',exact=True).click();page.get_by_role('button',name='Criar mapa',exact=True).click();page.get_by_role('button',name='Em branco').first.click()
  f=page.frame_locator('.bo-blueprint-reference-frame');saved(f);expect(f.get_by_role('button',name='Adicionar etapa',exact=True)).to_be_visible()
  tool(f,'Gráfico de emoções');expect(f.get_by_role('textbox',name='Nome da nova etapa',exact=True)).to_be_focused();check('Choosing the emotion tool on a blank map asks for a real stage without inventing emotion data',not graph(page)['stages'])
  f.get_by_role('textbox',name='Nome da nova etapa',exact=True).fill('Descobrir');f.get_by_role('button',name='Adicionar etapa ao mapa',exact=True).click();saved(f)
  f.get_by_role('button',name='Adicionar etapa',exact=True).click();f.get_by_role('textbox',name='Nome da nova etapa',exact=True).fill('Usar');f.get_by_role('button',name='Adicionar etapa ao mapa',exact=True).click();saved(f)
  state=graph(page);jid=next(iter(state['journeys']));sid,second=state['journeys'][jid]['stageIds']
  add(f,'ac|0','Persona');dialog=f.locator('#element-selector');expect(dialog.get_by_role('button',name='Vincular à etapa',exact=True)).to_be_disabled();check('An empty service library is explained without creating a placeholder persona','Nenhum registro de persona' in dialog.inner_text() and not graph(page)['entities']['persona']);dialog.get_by_role('button',name='Cancelar',exact=True).click()
  page.evaluate("""sid=>window.BlueOceanRuntime.api('dataBridge').transact(g=>{
   const now=new Date().toISOString();for(const [type,title,description] of [['persona','Marina','Tem pouco tempo'],['channel','WhatsApp','Atendimento digital'],['need','Receber previsão','Precisa organizar a rotina'],['evidence','Entrevista de pesquisa','Registro fornecido pelo cliente'],['pain','Sem retorno','Dor registrada na pesquisa']]){g.entities[type]||={};g.entities[type]['qa-'+type]={id:'qa-'+type,type,serviceId:g.service.id,title,description,stageId:sid,createdAt:now,updatedAt:now}}
   g.opportunities['qa-opportunity']={id:'qa-opportunity',stageId:sid,title:'Avisar o prazo',description:'Proposta de melhoria',problemIds:[],taskIds:[],createdAt:now,updatedAt:now};g.stages[sid].opportunityIds.push('qa-opportunity');return g
  },'Fixtures de pesquisa para inserção')""",sid);saved(f)
  inline(f,'ac|0','Pesquisar atendimento')
  f.get_by_role('button',name='+ Adicionar faixa',exact=True).click();f.get_by_role('searchbox',name='Buscar tipo de conteúdo',exact=True).fill('canal');f.get_by_role('button',name='Criar faixa de Canal',exact=True).click();saved(f);lane=f.locator('.r[data-row^="x"]').last.get_attribute('data-row');key=lane+'|0'
  check('Canal creates a typed lane instead of a generic text card',graph(page)['journeys'][jid]['matrixContent']['rows'][lane]['defaultType']=='channel')
  link(f,key,'Canal','qa-channel');link(f,'ac|0','Persona','qa-persona');link(f,'ac|0','Necessidade','qa-need');link(f,key,'Dor','qa-pain');link(f,key,'Oportunidade','qa-opportunity')
  tool(f,'Evidências físicas e digitais');link(f,'ev|0','Evidência','qa-evidence')
  check('Existing service elements render their current source and description',f.locator('.service-reference b').count()==6 and f.locator('.type-persona .reference-details').count()==1)
  check('Inserting references creates no extra canonical entities or fake customer actions',all(len(graph(page)['entities'][kind])==1 for kind in ['persona','channel','need','evidence','pain']) and graph(page)['stages'][sid]['customerAction']=='Pesquisar atendimento')
  caption=f.locator('[data-cell="ac|0"] .type-persona [data-ed="c"]');caption.fill('Cliente nesta experiência');caption.press('Tab');saved(f);check('A local persona caption does not rename or reassign the canonical persona',graph(page)['entities']['persona']['qa-persona']['title']=='Marina')
  f.get_by_role('button',name='Desfazer',exact=True).click();expect(f.locator('[data-cell="ac|0"] .type-persona [data-ed="c"]')).to_have_text('');f.get_by_role('button',name='Refazer',exact=True).click();expect(f.locator('[data-cell="ac|0"] .type-persona [data-ed="c"]')).to_have_text('Cliente nesta experiência');check('Undo and redo retain the reference identity and source data',graph(page)['entities']['persona']['qa-persona']['description']=='Tem pouco tempo')
  tool(f,'Dores e ideias');f.locator('[data-act="addi"][data-t="d"]').first.click();pain=f.locator('.it.d [data-ed="ix"]').first;pain.fill('Espera sem previsão');pain.press('Tab');saved(f);problem=next(iter(graph(page)['problems']));link(f,key,'Dor',problem)
  check('A newly recorded pain is immediately available in the same catalog',f.locator('.service-reference b').filter(has_text='Espera sem previsão').count()==1)
  f.locator('.it.d [data-ed="ix"]').first.fill('Espera com pouco retorno');f.locator('.it.d [data-ed="ix"]').first.press('Tab');saved(f);expect(f.locator('.service-reference b').filter(has_text='Espera com pouco retorno')).to_have_count(1);check('Editing a native pain refreshes its linked card without a reload',True)
  f.locator('.toolbar>.menu').first.locator('summary').click();f.get_by_role('button',name='Aquisição e relacionamento',exact=False).click();expect(f.locator('[data-row="em"]')).to_have_count(0)
  tool(f,'Gráfico de emoções','ac|1');expect(f.get_by_role('slider',name='Intensidade em Usar',exact=True)).to_be_focused();check('The lane catalog restores the real emotion graph and a selected point remains editable without recording neutral values',f.locator('#curve').count()==1 and f.locator('.dt.unknown').count()==2 and f.locator('#curve path').get_attribute('d')=='')
  f.get_by_role('button',name='Cancelar',exact=True).click();tool(f,'Gráfico de emoções');f.get_by_role('slider',name='Intensidade em Descobrir',exact=True).press('Home');f.get_by_role('button',name='Concluir',exact=True).click();saved(f)
  tool(f,'Gráfico de emoções','ac|1');f.get_by_role('slider',name='Intensidade em Usar',exact=True).press('End');f.get_by_role('button',name='Concluir',exact=True).click();saved(f)
  check('Recorded stage emotions draw the original curve and stay hypotheses without evidence',f.locator('#curve').count()==1 and ' C' in f.locator('#curve path').get_attribute('d') and all(graph(page)['stages'][s]['emotionStatus']=='hypothesis' for s in [sid,second]))
  f.locator('.sh').first.get_by_role('button',name='Mover etapa para a direita',exact=True).click();saved(f);check('Stage reorder retains service cards under stable canonical stage IDs',graph(page)['journeys'][jid]['stageIds'][1]==sid and graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane][0]['referenceId']=='qa-channel')
  page.evaluate("()=>window.BlueOceanRuntime.api('dataBridge').transact(g=>{g.entities.persona['qa-persona'].title='Marina atualizada';g.entities.persona['qa-persona'].description='Contexto atualizado na biblioteca';return g},'Atualizar Persona na biblioteca')");expect(f.locator('.service-reference b').filter(has_text='Marina atualizada')).to_have_count(1);check('A library edit refreshes the canonical title without replacing the local caption',f.locator('.type-persona [data-ed="c"]').inner_text()=='Cliente nesta experiência')
  f.get_by_role('button',name='Apresentar',exact=True).click()
  with page.expect_download() as download:f.get_by_role('button',name='Baixar resumo HTML',exact=True).click()
  exported=Path(download.value.path()).read_text();check('Presentation and HTML export include the linked persona, channel and research context','Marina atualizada' in exported and 'WhatsApp' in exported and 'Contexto atualizado na biblioteca' in exported);f.get_by_role('button',name='Voltar ao mapa',exact=True).click()
  f.get_by_role('button',name='Voltar para mapas do serviço',exact=True).click();page.reload(wait_until='networkidle');f=reopen(page);expect(f.locator('.service-reference b').filter(has_text='Marina atualizada')).to_have_count(1);check('Reload preserves typed references, local captions and the emotion curve',' C' in f.locator('#curve path').get_attribute('d') and f.locator('.type-persona [data-ed="c"]').inner_text()=='Cliente nesta experiência')
  for width in [1440,834,390]:
   page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(250);f.get_by_role('button',name='+ Adicionar faixa',exact=True).click();f.get_by_role('searchbox',name='Buscar tipo de conteúdo',exact=True).fill('emoções');audit(page,f'tools-{width}');page.screenshot(path=str(OUT/f'tools-{width}.png'),animations='disabled');f.get_by_role('button',name='Cancelar',exact=True).click();audit(page,f'map-{width}');check(f'Linked elements and graph fit the page at {width}px',frame(page).evaluate('document.documentElement.scrollWidth<=innerWidth'))
  f.get_by_role('button',name='Voltar para mapas do serviço',exact=True).click();touch=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,storage_state=page.context.storage_state());mobile=touch.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)));mobile.add_locator_handler(mobile.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click());mobile.goto(URL,wait_until='networkidle');mobile.get_by_role('button',name='Abrir workspace local sem conta').click();mobile.get_by_role('button',name='Abrir navegação',exact=True).click();mobile.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click();mobile.get_by_role('button',name='Abrir mapa',exact=True).first.click();mf=mobile.frame_locator('.bo-blueprint-reference-frame');saved(mf);mobile.wait_for_function("async()=>{const r=await window.BlueOceanRuntime.api('dataBridge').recovery();return r.durableOk&&r.durableRevision>=r.revision}");mf.locator('.lb').first.tap()
  mf.locator('[data-cell="ac|0"]>.content-add').tap();mf.get_by_role('searchbox',name='Buscar tipo de conteúdo',exact=True).fill('persona');mf.get_by_role('button',name='Adicionar Persona',exact=True).tap();mf.locator('#element-selector [data-source="qa-persona"]').tap();audit(mobile,'persona-dialog-touch');mf.get_by_role('button',name='Vincular à etapa',exact=True).tap();saved(mf);check('A touch device inserts an existing persona without duplicating the source',len(graph(mobile)['entities']['persona'])==1 and mf.locator('.type-persona').count()==2);audit(mobile,'map-touch');touch.close();page.set_viewport_size({'width':1440,'height':1000});f=reopen(page)
  page.evaluate("()=>window.BlueOceanRuntime.api('dataBridge').transact(g=>{delete g.entities.channel['qa-channel'];return g},'Excluir canal de QA')");expect(f.locator('.type-channel .reference-missing')).to_have_count(1);check('A missing source remains visibly unavailable rather than being recreated',not graph(page)['entities']['channel'])
  check('No uncaught browser errors',not errors);(OUT/'results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2));browser.close()
except Exception:
 print('Browser errors:',errors if 'errors' in globals() else [],flush=True)
 raise
finally:server.shutdown();server.server_close()

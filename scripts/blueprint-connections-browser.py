#!/usr/bin/env python3
"""Acceptance of responsive map editing and independent Journey/Blueprint perspectives."""
import functools, json, os, shutil, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from map_browser_support import use_matrix, matrix_perspective
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/blueprint-connections'
OUT.mkdir(parents=True, exist_ok=True)
checks, errors, skipped = [], [], []

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass
    def copyfile(self, source, output):
        try: super().copyfile(source, output)
        except (BrokenPipeError, ConnectionResetError): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}'

def check(name, value):
    assert value, name
    checks.append(name)
    print('PASS ' + name, flush=True)

def graph(page): return page.evaluate("()=>window.BlueOceanRuntime.api('dataBridge').get()")
def saved(f):
    expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
    use_matrix(f)
def stage(f, name):
    f.get_by_role('button', name='Adicionar etapa', exact=True).click()
    f.get_by_role('textbox', name='Nome da nova etapa', exact=True).fill(name)
    f.get_by_role('button', name='Adicionar etapa ao mapa', exact=True).click(); saved(f)
def add(f, key, text):
    f.locator(f'[data-cell="{key}"]>.content-add').click()
    f.get_by_role('button', name='Adicionar Cartão', exact=True).click()
    field=f.locator(f'[data-cell="{key}"] [data-ed="c"]').last
    field.fill(text); field.press('Tab'); saved(f)
def perspective(f, name):
    matrix_perspective(f, name)

def customize(f, row, visible):
    f.get_by_role('button', name='Personalizar visualização', exact=True).click()
    f.locator(f'[data-view-row="{row}"]').set_checked(visible); saved(f)
    f.get_by_role('button', name='Concluir', exact=True).click()
def filters(f, query):
    if f.locator('[data-act="cards-toggle-filters"]').get_attribute('aria-expanded') != 'true':
        f.locator('[data-act="cards-toggle-filters"]').click()
    f.get_by_role('searchbox', name='Buscar cartões', exact=True).fill(query)
    f.get_by_role('button', name='Aplicar filtros', exact=True).click(); saved(f)
def audit(page, label):
    axe=ROOT/'node_modules/axe-core/axe.min.js'
    if not axe.exists():
        skipped.append('axe '+label+': dependência axe-core ausente')
        print('SKIP '+skipped[-1],flush=True);return
    frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
    frame.add_script_tag(content=axe.read_text())
    violations=frame.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
    (OUT/f'{label}-axe.json').write_text(json.dumps(violations,indent=2))
    check('Accessibility '+label,not violations)
def screenshot(page, label): page.screenshot(path=str(OUT/f'{label}.png'),animations='disabled')

try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_locator_handler(page.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click())
        page.goto(URL,wait_until='networkidle');page.get_by_role('button',name='Abrir workspace local sem conta').click()
        page.get_by_role('button',name='Novo projeto',exact=True).click();page.get_by_label('Nome do projeto',exact=True).fill('Blueprint conectado QA');page.get_by_label('Serviço principal',exact=True).fill('Atendimento');page.get_by_role('button',name='Criar projeto',exact=True).click()
        page.evaluate("""()=>window.BlueOceanRuntime.api('dataBridge').transact(g=>{g.entities.system||={};g.entities.system['qa-crm']={id:'qa-crm',type:'system',serviceId:g.service.id,title:'CRM de atendimento',createdAt:new Date().toISOString()};return g},'Recurso fictício')""")
        page.get_by_role('button',name='Criar mapa',exact=True).click();page.get_by_role('button',name='Em branco',exact=False).first.click()
        f=page.frame_locator('.bo-blueprint-reference-frame');saved(f)
        for name in ['Solicitar atendimento','Acompanhar','Receber retorno']:stage(f,name)
        jid=next(iter(graph(page)['journeys']))
        def resize(index,delta):
            handle=f.locator(f'[data-stage-resize="{index}"]');handle.scroll_into_view_if_needed();handle.focus();box=handle.bounding_box();x,y=box['x']+box['width']/2,box['y']+box['height']/2
            page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+delta,y,steps=8);page.mouse.up();saved(f)
        def alignment(label):
            frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
            frame.wait_for_function("""()=>[...document.querySelectorAll('[data-row=st]>.sh')].every((header,i)=>{const h=header.getBoundingClientRect(),d=document.querySelector('#curve .dt[data-si="'+i+'"]')?.getBoundingClientRect(),c=document.querySelectorAll('.emotion-stage')[i]?.getBoundingClientRect();return d&&c&&Math.abs(h.x+h.width/2-d.x-d.width/2)<1.5&&Math.abs(h.x+h.width/2-c.x-c.width/2)<1.5})""")
            check('Emotion and supplemental cells align: '+label,True)
        resize(0,260);resize(1,130);alignment('unequal widths')
        f.locator('#curve .dt[data-si="0"]').focus();f.locator('#curve .dt[data-si="0"]').press('End');saved(f)
        expect(f.locator('[data-card-count]')).to_contain_text('1 emoção registrada')
        f.get_by_role('button',name='Ampliar zoom',exact=True).click();saved(f);alignment('zoom 110%')
        f.get_by_role('button',name='Restaurar zoom a 100 por cento',exact=True).click();saved(f)
        f.get_by_role('button',name='Ajustar à tela',exact=True).click();saved(f);alignment('fit')
        f.get_by_role('button',name='Ajustar à tela',exact=True).click();saved(f)
        f.get_by_role('button',name='Distribuir larguras',exact=True).click();saved(f);alignment('equal distribution')
        widths=f.locator('[data-row=st]>.sh').evaluate_all('nodes=>nodes.map(n=>n.getBoundingClientRect().width)');check('Distribute widths clears individual overrides',max(widths)-min(widths)<1)
        perspective(f,'Blueprint');expect(f.locator('[data-row=fl] .blueprint-lane-role')).to_have_text('Frontstage');expect(f.locator('[data-row=bk] .blueprint-lane-role')).to_have_text('Backstage')
        expect(f.get_by_role('button',name='Configurar faixa Evidências físicas e digitais',exact=True)).to_be_visible()
        add(f,'ac|0','Envia a solicitação');add(f,'fl|0','Confirma recebimento');add(f,'bk|1','Analisa e resolve');add(f,'sy|0','Sistema de chamados')
        def card(key):return f.locator(f'[data-cell="{key}"] .content-block').first
        def activity(key,owner,team,category='activity',row=None):
            card(key).get_by_label('Ações da nota',exact=True).click();card(key).get_by_role('button',name='Detalhes operacionais',exact=True).click();d=f.locator('#blueprint-activity-dialog')
            d.get_by_label('Responsável',exact=True).fill(owner);d.get_by_label('Equipe',exact=True).fill(team);d.get_by_label('Natureza do cartão',exact=True).select_option(category)
            if row:d.get_by_label('Faixa da atividade',exact=True).select_option(row)
            return d
        d=activity('fl|0','Ana','Atendimento');d.get_by_label('CRM de atendimento',exact=True).check();d.get_by_label('Regra ou condição',exact=True).fill('Informar protocolo');d.get_by_label('Execução (min)',exact=True).fill('0');d.get_by_label('Prazo combinado (min)',exact=True).fill('30');audit(page,'activity-desktop');d.get_by_role('button',name='Salvar atividade',exact=True).click();saved(f)
        d=activity('bk|1','Bruno','Especialistas');d.get_by_role('button',name='Salvar atividade',exact=True).click();saved(f)
        check('Activity cards expose owner, team and canonical resource names','Ana' in card('fl|0').inner_text() and 'CRM de atendimento' in card('fl|0').inner_text())
        state=graph(page);bid=next(b['id'] for b in state['views']['whiteboards'].values() if b.get('viewKind')=='blueprint');front=next(it for it in state['views']['whiteboards'][bid]['items'].values() if it.get('objectKind')=='frontstage');record=state['entities']['frontstage'][front['objectId']]
        check('Metadata writes through to the canonical activity',record['owner']=='Ana' and record['team']=='Atendimento' and record['resourceRefs']==['system:qa-crm'] and record['operationalDetails']['durationMinutes']==0)
        ids={key:card(key).get_attribute('data-nid') for key in ['ac|0','fl|0','bk|1','sy|0']}
        def connect(a,b,kind,deliverable=''):
            f.locator('[data-act=bp-links]').click();form=f.locator('#blueprint-link-form');form.get_by_label('Origem',exact=True).select_option(ids[a]);form.get_by_label('Destino',exact=True).select_option(ids[b]);form.get_by_label('Relação',exact=True).select_option(kind)
            if kind=='handoff':form.get_by_label('O que será transferido',exact=True).fill(deliverable)
            return form
        connect('ac|0','fl|0','sequence').get_by_role('button',name='Criar conexão',exact=True).click();saved(f)
        connect('fl|0','bk|1','dependency').get_by_role('button',name='Criar conexão',exact=True).click();saved(f)
        connect('bk|1','sy|0','uses').get_by_role('button',name='Criar conexão',exact=True).click();saved(f)
        form=connect('fl|0','bk|1','handoff','Chamado com protocolo');form.get_by_label('Equipe de destino',exact=True).fill('Atendimento');form.get_by_role('button',name='Criar conexão',exact=True).click();expect(form.locator('.form-error')).to_contain_text('diferentes')
        form.get_by_label('Equipe de destino',exact=True).fill('Especialistas');form.get_by_label('Prazo da transferência (min)',exact=True).fill('15');form.get_by_label('Condição de aceite',exact=True).fill('Protocolo e diagnóstico preenchidos');audit(page,'connection-dialog');form.get_by_role('button',name='Criar conexão',exact=True).click();saved(f)
        check('All four relationship types persist with validated handoff details',len(graph(page)['journeys'][jid]['matrixContent']['connections'])==4)
        f.get_by_label('Exibir conexões',exact=True).select_option('all');saved(f);expect(f.locator('.blueprint-edge')).to_have_count(4);expect(f.locator('.blueprint-handoff-dot')).to_have_count(1)
        f.locator('[data-row=st]').scroll_into_view_if_needed();screenshot(page,'connected-blueprint-1440')
        f.get_by_label('Exibir conexões',exact=True).select_option('selected');saved(f);card('sy|0').focus();expect(f.locator('.blueprint-edge')).to_have_count(1)
        f.get_by_label('Exibir conexões',exact=True).select_option('off');saved(f);expect(f.locator('.blueprint-edge')).to_have_count(0)
        check('Connection visibility follows selected/all/hidden modes',True)
        f.get_by_label('Exibir conexões',exact=True).select_option('all');saved(f);customize(f,'bk',False);expect(f.locator('.blueprint-edge')).to_have_count(1);check('Hiding a layer preserves connections without drawing dangling edges',len(graph(page)['journeys'][jid]['matrixContent']['connections'])==4);customize(f,'bk',True)
        # A mistakenly placed execution activity can be reclassified while retaining its original resource record.
        add(f,'sy|2','Encerra o chamado');old_state=graph(page);old_item=next(it for it in old_state['views']['whiteboards'][bid]['items'].values() if old_state['entities'].get(it.get('objectKind'),{}).get(it.get('objectId'),{}).get('title')=='Encerra o chamado');old_id=old_item['objectId']
        d=activity('sy|2','Bruno','Especialistas',row='bk');d.get_by_role('button',name='Salvar atividade',exact=True).click();saved(f)
        expect(f.locator('[data-cell="bk|2"] .content-block')).to_have_count(1)
        state=graph(page);check('Reclassification retains original source and visual identity',old_id in state['entities']['system'] and state['views']['whiteboards'][bid]['items'][old_item['id']]['objectKind']=='backstage')
        f.get_by_role('button',name='Desfazer',exact=True).click();saved(f);expect(f.locator('[data-cell="sy|2"] .content-block')).to_have_count(1)
        f.get_by_role('button',name='Refazer',exact=True).click();saved(f);expect(f.locator('[data-cell="bk|2"] .content-block')).to_have_count(1);check('Activity reclassification supports undo/redo',True)
        f.locator('[data-act=bp-links]').click();f.get_by_role('button',name='Excluir conexão 4',exact=True).click();saved(f);f.get_by_role('button',name='Fechar conexões',exact=True).click();expect(f.locator('.blueprint-handoff-dot')).to_have_count(0)
        f.get_by_role('button',name='Desfazer',exact=True).click();saved(f);expect(f.locator('.blueprint-handoff-dot')).to_have_count(1);check('Connection deletion is reversible with handoff metadata intact',graph(page)['journeys'][jid]['matrixContent']['connections'][-1]['handoff']['deadlineMinutes']==15)
        perspective(f,'Jornada');check('Journey keeps operational content and links without showing operational layers',len(graph(page)['journeys'][jid]['matrixContent']['connections'])==4 and f.locator('[data-row=bk]').count()==0);perspective(f,'Blueprint')
        customize(f,'em',True)
        for width in [1440,834,390]:
            page.set_viewport_size({'width':width,'height':1000 if width>390 else 844});alignment(str(width));audit(page,f'map-{width}');screenshot(page,f'connected-{width}')
            f.locator('[data-act=bp-links]').click();audit(page,f'link-form-{width}');f.get_by_role('button',name='Fechar conexões',exact=True).click()
        page.set_viewport_size({'width':1440,'height':1000});f.get_by_role('button',name='Apresentar',exact=True).click();expect(f.locator('.report-connections')).to_contain_text('Chamado com protocolo')
        with page.expect_download() as download_info:f.get_by_role('button',name='Baixar resumo HTML',exact=True).click()
        download=download_info.value;download.save_as(str(OUT/'summary.html'));summary=(OUT/'summary.html').read_text();check('Standalone HTML includes owners, resources and relationship/acceptance details','Protocolo e diagnóstico preenchidos' in summary and 'CRM de atendimento' in summary and 'Ana' in summary)
        f.get_by_role('button',name='Voltar ao mapa',exact=True).click();saved(f)
        before=graph(page)['journeys'][jid]['matrixContent'];f.get_by_role('button',name='Voltar para mapas do serviço',exact=True).click();page.reload(wait_until='networkidle');page.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click();page.locator('[data-journey-library]').get_by_role('button',name='Abrir mapa',exact=True).first.click();saved(f)
        check('Reload reconstructs activity metadata and typed connections without duplication',graph(page)['journeys'][jid]['matrixContent']==before)
        perspective(f,'Blueprint');expect(card('fl|0')).to_contain_text('Ana');expect(f.locator('.blueprint-edge')).to_have_count(4);alignment('reload')
        mobile_context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,storage_state=context.storage_state());mobile=mobile_context.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)));mobile.add_locator_handler(mobile.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click());mobile.goto(URL,wait_until='networkidle');mobile.get_by_role('button',name='Abrir workspace local sem conta').click();mobile.get_by_role('button',name='Abrir navegação',exact=True).click();mobile.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click();mobile.locator('[data-journey-library]').get_by_role('button',name='Abrir mapa',exact=True).first.click();mf=mobile.frame_locator('.bo-blueprint-reference-frame');saved(mf)
        mf.locator('[data-cell="fl|0"] .content-block').get_by_label('Ações da nota',exact=True).tap();mf.get_by_role('button',name='Detalhes operacionais',exact=True).tap();mf.get_by_label('Responsável',exact=True).fill('Ana no celular');mf.get_by_role('button',name='Salvar atividade',exact=True).tap();saved(mf);check('Operational editing works by touch', 'Ana no celular' in json.dumps(graph(mobile),ensure_ascii=False));audit(mobile,'activity-touch');mobile_context.close()
        check('No uncaught browser errors',not errors);browser.close()
finally:
    (OUT/'results.json').write_text(json.dumps({'checks':checks,'skipped':skipped,'errors':errors},ensure_ascii=False,indent=2));server.shutdown();server.server_close()

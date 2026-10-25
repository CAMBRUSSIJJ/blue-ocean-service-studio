#!/usr/bin/env python3
"""Journey growth acceptance: drawing → pain → canonical action → measurement → executive delivery."""
import functools
import json
import os
import shutil
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from map_browser_support import use_matrix, matrix_perspective
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'journey-growth';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_args): pass
    def copyfile(self,source,outputfile):
        try: super().copyfile(source,outputfile)
        except (BrokenPipeError,ConnectionResetError): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}'
checks=[]
def check(name,ok):
    assert ok,name
    checks.append(name);print('PASS '+name,flush=True)
def graph(page): return page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').get()")
def saved(f):
    expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
    use_matrix(f)
def stage(f,title,inline=False):
    f.get_by_role('button',name='Adicionar etapa à direita' if inline else 'Adicionar etapa',exact=True).click()
    f.get_by_role('textbox',name='Nome da nova etapa',exact=True).fill(title)
    f.get_by_role('button',name='Adicionar etapa ao mapa',exact=True).click();saved(f)
def preset(f,name):
    f.locator('.toolbar>.menu').first.locator('summary').click();f.get_by_role('button',name=name,exact=False).click();saved(f)
def note(f,key,value):
    f.locator(f'[data-cell="{key}"] .ad').click();f.get_by_role('button',name='Adicionar Cartão',exact=True).click();edit=f.locator(f'[data-cell="{key}"] [data-ed="c"]').last
    expect(edit).to_be_focused();edit.fill(value);edit.press('Tab');saved(f)
def audit(frame,label):
    frame.add_script_tag(content=(ROOT/'node_modules/axe-core/axe.min.js').read_text())
    result=frame.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
    (OUT/(label+'-axe.json')).write_text(json.dumps(result,indent=2))
    check('No axe violations: '+label,not result)
def frame(page): return page.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
def open_plan(f):
    f.get_by_role('button',name='Planejar melhoria',exact=True).click();return f.get_by_role('dialog',name='Planejar melhoria',exact=True)

try:
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_locator_handler(page.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click())
    page.goto(URL,wait_until='networkidle');page.get_by_role('button',name='Abrir workspace local sem conta').click()
    page.get_by_role('button',name='Novo projeto',exact=True).click()
    page.get_by_label('Nome do projeto',exact=True).fill('QA Evolução da Jornada');page.get_by_label('Serviço principal',exact=True).fill('Atendimento ao cliente')
    page.get_by_role('button',name='Criar projeto',exact=True).click()
    page.get_by_role('button',name='Criar mapa',exact=True).click();page.get_by_role('button',name='Em branco').first.click()
    f=page.frame_locator('.bo-blueprint-reference-frame');saved(f);expect(f.get_by_role('button',name='Adicionar etapa',exact=True)).to_be_visible()
    jid=next(iter(graph(page)['journeys']))
    f.get_by_role('button',name='Adicionar etapa',exact=True).click();f.get_by_role('textbox',name='Nome da nova etapa').fill('Etapa cancelada');f.get_by_role('button',name='Cancelar',exact=True).click()
    check('Cancelling a stage draft creates no placeholder or graph record',not graph(page)['journeys'][jid]['stageIds'])
    stage(f,'Descobrir')
    f.get_by_role('button',name='Adicionar etapa à direita',exact=True).click();field=f.get_by_role('textbox',name='Nome da nova etapa',exact=True);field.fill('Considerar');field.press('Enter');saved(f)
    check('Enter creates a named stage and keeps an empty focused draft for the next stage',field.input_value()=='' and field.evaluate('e=>e===document.activeElement'))
    field.fill('Usar');f.get_by_role('button',name='Adicionar etapa ao mapa',exact=True).click();saved(f)
    ids=graph(page)['journeys'][jid]['stageIds'];sid=ids[0]
    check('Named stages are shared with the canonical Journey without invented actions',len(ids)==3 and all(not graph(page)['stages'][id]['customerAction'] for id in ids))
    check('Comfortable columns do not stretch to half the screen',f.locator('.sh').first.bounding_box()['width']<=360)
    check('Unrecorded emotions are empty markers and do not draw a curve',f.locator('.dt.unknown').count()==3 and f.locator('.cvb path').get_attribute('d')=='')
    check('Emotion chart hides numeric ticks and category legend while retaining grid positions',
          f.locator('[data-emotion-tick]').count()==0 and f.locator('.emotion-legend').count()==0 and f.locator('[data-emotion-level]').count()==5)
    check('Unrecorded points remain editable but no unknown label is printed on the chart',
          f.locator('.dt.unknown').count()==3 and f.locator('#curve').inner_text().strip()=='')

    context=f.get_by_role('textbox',name='Contexto em Descobrir',exact=True);context.fill('Cliente percebe uma necessidade. <script>alert("teste")</script>');context.press('Tab');saved(f)
    note(f,'ac|0','Pesquisar alternativas de atendimento')
    check('Context and customer action have independent canonical contents',graph(page)['stages'][sid]['thoughts'].startswith('Cliente percebe') and graph(page)['stages'][sid]['customerAction']=='Pesquisar alternativas de atendimento')
    f.locator('[data-act="emotion-edit"]').first.click();f.get_by_role('slider',name='Intensidade em Descobrir').press('Home');f.get_by_role('textbox',name='Observação emocional em Descobrir').fill('Estimativa para discutir com a equipe');f.get_by_role('button',name='Concluir',exact=True).click();saved(f)
    check('Recording an estimate is explicitly a hypothesis',graph(page)['stages'][sid]['emotionStatus']=='hypothesis' and f.locator('.dt.hypothesis').count()==1)
    f.locator('[data-act="emotion-edit"]').last.click();f.get_by_role('combobox',name='Tipo de registro em Usar').select_option('validated');f.get_by_role('button',name='Concluir',exact=True).click()
    check('Validation requires a source and does not silently modify the stage',not f.get_by_role('textbox',name='Fonte da evidência em Usar').evaluate('e=>e.checkValidity()') and not graph(page)['stages'][ids[-1]]['emotionRecorded'])
    f.get_by_role('textbox',name='Fonte da evidência em Usar').fill('Entrevista simulada para QA');f.get_by_role('button',name='Concluir',exact=True).click();saved(f)
    check('Validated emotions preserve their source and leave a gap at unknown stages',graph(page)['stages'][ids[-1]]['emotionSource']=='Entrevista simulada para QA' and ' C' not in f.locator('.cvb path').get_attribute('d'))
    check('Emotion captions fit inside the curve instead of overlapping the next row',f.locator('.cvb').evaluate('e=>[...e.querySelectorAll(".dl")].every(n=>n.getBoundingClientRect().bottom<=e.getBoundingClientRect().bottom)'))
    chart_text = f.locator('#curve').inner_text()
    chart_labels = [el.inner_text().strip() for el in f.locator('#curve .dl').all()]
    check('Visible curve only presents recorded emotion names, not states or values',
          'Hipótese' not in chart_text and 'Validado' not in chart_text and 'Não informado' not in chart_text
          and chart_labels[0]=='Frustrada' and chart_labels[1]=='' and f.locator('#curve .dt.validated').count()==1)
    check('Hover titles omit internal classifications and numeric score',
          all('Hipótese' not in (title or '') and 'Validado' not in (title or '') and ' · ' not in (title or '')
              for title in [el.get_attribute('title') for el in f.locator('#curve .dt').all()]))
    check('Distinct validation states are reflected in accessible point names', 'Validado' in f.locator('.dt.validated').get_attribute('aria-label') and 'Hipótese' in f.locator('.dt.hypothesis').get_attribute('aria-label'))
    f.locator('#curve .dt[data-si="1"]').focus()
    f.locator('#curve .dt[data-si="1"]').press('ArrowUp'); saved(f)
    mid = graph(page)['stages'][ids[1]]
    check('Keyboard adjustments persist and never turn missing information into neutral', mid['emotionScore']==1 and mid['emotionStatus']=='hypothesis' and mid['emotionRecorded'] is True)
    check('Keyboard edit fills missing point without reintroducing a legend or numeric ticks',
          f.locator('.dt.unknown').count()==0 and f.locator('.emotion-legend').count()==0 and f.locator('[data-emotion-tick]').count()==0)
    f.locator('#curve .dt[data-si="1"]').press('End'); saved(f)
    check('End key sets the maximum positive emotion', graph(page)['stages'][ids[1]]['emotionScore']==2)
    f.locator('#curve .dt[data-si="1"]').press('Home'); saved(f)
    check('Home key sets the minimum negative emotion', graph(page)['stages'][ids[1]]['emotionScore']==-2)

    preset(f,'Aquisição e relacionamento')
    for key,value in [('go|0','Gerar interesse qualificado'),('ch|0','Busca e indicação'),('pr|0','Atendimento com previsão clara'),('br|0','Receio de esperar sem retorno'),('rr|0','Cumprir o prazo e convidar ao retorno'),('ki|0','Solicitações que avançam para contratação')]: note(f,key,value)
    marketing=graph(page)['journeys'][jid]['acquisitionCells'][sid]
    f.locator('.sh').first.get_by_role('button',name='Mover etapa para a direita').click();saved(f)
    check('Reordering stages preserves acquisition notes under their canonical stage identity',graph(page)['journeys'][jid]['stageIds'][1]==sid and graph(page)['journeys'][jid]['acquisitionCells'][sid]==marketing)
    f.get_by_role('button',name='Desfazer',exact=True).click();expect(f.locator('.sh [data-ed="sn"]').first).to_have_text('Descobrir')
    check('Undo retains the selected presentation preferences',graph(page)['journeys'][jid]['matrixView']['preset']=='acquisition')
    f.locator('[data-act="addi"][data-t="d"]').first.click();pain=f.locator('.it.d [data-ed="ix"]').first;pain.fill('Não recebe previsão de atendimento');pain.press('Tab');saved(f)
    dialog=open_plan(f);dialog.get_by_label('Ação proposta').fill('Informar previsão no primeiro contato');dialog.get_by_label('Responsável',exact=True).fill('Equipe de atendimento');dialog.get_by_label('Prazo',exact=True).fill('2026-12-01');dialog.get_by_label('Resultado esperado').fill('Reduzir incerteza e tempo de espera')
    dialog.locator('summary').click();dialog.get_by_label('Nome do indicador').fill('Tempo de espera');dialog.get_by_label('Unidade',exact=True).fill('minutos');dialog.get_by_label('Valor inicial').fill('20');dialog.get_by_label('Meta',exact=True).fill('10')
    audit(frame(page),'plan-desktop');page.screenshot(path=str(OUT/'plan-desktop.png'),animations='disabled');dialog.get_by_role('button',name='Salvar plano',exact=True).click();expect(f.locator('#growth-plan-dialog')).not_to_be_visible();saved(f)
    state=graph(page);initiative=next(iter(state['service']['improvementPortfolio']['initiatives'].values()));plan_id=initiative['id'];metric_id=initiative['metricIds'][0]
    check('A pain creates one linked canonical initiative and indicator',len(state['service']['improvementPortfolio']['initiatives'])==1 and len(state['entities']['metric'])==1)
    f.get_by_role('button',name='Desfazer',exact=True).click();expect(f.get_by_role('button',name='Planejar melhoria',exact=True)).to_be_visible()
    check('One undo removes the complete planning transaction while retaining the pain',not graph(page)['service'].get('improvementPortfolio',{}).get('initiatives') and len(graph(page)['problems'])==1)
    f.get_by_role('button',name='Refazer',exact=True).click();expect(f.get_by_role('button',name='Editar plano',exact=True)).to_be_visible()
    check('Redo restores the same initiative, metric and bindings',plan_id in graph(page)['service']['improvementPortfolio']['initiatives'] and metric_id in graph(page)['entities']['metric'])
    f.get_by_role('button',name='Editar plano',exact=True).click();dialog=f.get_by_role('dialog',name='Editar plano',exact=True);dialog.get_by_label('Ação proposta').fill('Cancelar alteração');dialog.get_by_role('button',name='Cancelar',exact=True).click()
    check('Cancelling a plan edit preserves the saved action',graph(page)['service']['improvementPortfolio']['initiatives'][plan_id]['title']=='Informar previsão no primeiro contato')
    f.get_by_role('button',name='Editar plano',exact=True).click();dialog=f.get_by_role('dialog',name='Editar plano',exact=True);dialog.get_by_label('Status',exact=True).select_option('implemented');dialog.get_by_role('button',name='Salvar plano',exact=True).click();expect(dialog).not_to_be_visible()
    check('Editing the same pain does not duplicate plans or metrics',len(graph(page)['service']['improvementPortfolio']['initiatives'])==1 and len(graph(page)['entities']['metric'])==1)
    f.get_by_role('button',name='Acompanhar',exact=True).click();track=f.get_by_role('dialog',name='Acompanhar melhoria',exact=True)
    expect(track.get_by_text('Resultado ainda não medido',exact=True)).to_be_visible();check('An implemented action without measurements does not claim a result',track.get_by_text('Sem medição',exact=False).count()>0)
    track.get_by_label('Novo valor medido').fill('8');track.get_by_label('Observação da medição').fill('Medição simulada de QA');audit(frame(page),'measurement-desktop');track.get_by_role('button',name='Registrar medição',exact=True).click();expect(track).not_to_be_visible()
    check('A measurement updates the shared indicator and retains its source',graph(page)['entities']['metric'][metric_id]['value']==8 and len(graph(page)['service']['outcomes']['measurements'])==1)
    f.get_by_role('button',name='Acompanhar',exact=True).click();expect(f.get_by_text('Meta atingida segundo as medições registradas',exact=True)).to_be_visible();f.get_by_role('button',name='Fechar acompanhamento',exact=True).click()
    before_duplicate=graph(page)
    f.locator('.sh').first.get_by_role('button',name='Duplicar etapa',exact=True).click();saved(f)
    duplicated=graph(page);copy_sid=duplicated['journeys'][jid]['stageIds'][1]
    check('Duplicating a stage creates a distinct pain without moving the original plan source',len(duplicated['problems'])==2 and duplicated['problems'][next(iter(before_duplicate['problems']))]['stageId']==sid and duplicated['stages'][copy_sid]['problemIds']!=duplicated['stages'][sid]['problemIds'])
    f.get_by_role('button',name='Desfazer',exact=True).click();expect(f.locator('.sh')).to_have_count(3)
    f.locator('.tools-menu summary').click();f.get_by_label('Cenário da jornada').fill('Pessoa buscando atendimento');f.get_by_label('Objetivo da Jornada').fill('Dar clareza desde o primeiro contato');f.locator('.tools-menu summary').click();saved(f)
    f.get_by_role('button',name='Apresentar',exact=True).click();expect(f.locator('.executive-report h1')).to_be_visible();check('Presentation is read-only and includes source-linked actions',f.locator('[contenteditable]').count()==0 and f.get_by_text('Dor de origem: Não recebe previsão de atendimento',exact=True).count()==1)
    audit(frame(page),'executive-desktop');page.screenshot(path=str(OUT/'executive-desktop.png'),animations='disabled')
    with page.expect_download() as download: f.get_by_role('button',name='Baixar resumo HTML',exact=True).click()
    export=Path(download.value.path()).read_text();check('The exported summary is standalone and escapes user-provided markup','&lt;script&gt;' in export and '<script>' not in export and 'Informar previsão no primeiro contato' in export and 'Meta: 10 minutos' in export)
    frame(page).evaluate('window.print=()=>window.__printed=true');f.get_by_role('button',name='Imprimir / PDF',exact=True).click();check('The print action opens the presentation print flow',frame(page).evaluate('window.__printed===true'))
    f.get_by_role('button',name='Voltar ao mapa',exact=True).click();f.locator('.tools-menu summary').click()
    with page.expect_download() as backup: f.get_by_role('button',name='Baixar backup do projeto',exact=True).click()
    backup_text=Path(backup.value.path()).read_text();check('A real project backup includes acquisition, plan, indicator and measurement',all(text in backup_text for text in ['acquisitionCells',plan_id,metric_id,'Medição simulada de QA']))
    f.locator('.tools-menu summary').click();f.get_by_role('button',name='Voltar para mapas do serviço',exact=True).click();page.reload(wait_until='networkidle');page.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click();page.get_by_role('button',name='Abrir mapa',exact=True).first.click();f=page.frame_locator('.bo-blueprint-reference-frame');saved(f);expect(f.locator('[data-row="ch"]')).to_be_visible()
    check('Reload preserves marketing notes, independent context, action and outcome',graph(page)['journeys'][jid]['acquisitionCells'][sid]==marketing and graph(page)['stages'][sid]['customerAction']=='Pesquisar alternativas de atendimento' and graph(page)['entities']['metric'][metric_id]['value']==8)
    for width in [1440,834,390]:
        page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(300);saved(f);audit(frame(page),f'map-{width}')
        check(f'No page overflow at {width}px',frame(page).evaluate('document.documentElement.scrollWidth<=innerWidth'))
        f.get_by_role('button',name='Editar plano',exact=True).click();audit(frame(page),f'plan-{width}');f.get_by_role('button',name='Fechar plano',exact=True).click()
        if f.get_by_role('button',name='Mostrar todos os comandos',exact=True).is_visible():f.get_by_role('button',name='Mostrar todos os comandos',exact=True).click()
        f.get_by_role('button',name='Apresentar',exact=True).click();audit(frame(page),f'executive-{width}');page.screenshot(path=str(OUT/f'executive-{width}.png'),animations='disabled');f.get_by_role('button',name='Voltar ao mapa',exact=True).click()
    f.get_by_role('button',name='Voltar para mapas do serviço',exact=True).click()
    touch=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,accept_downloads=True,storage_state=page.context.storage_state())
    mobile=touch.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)))
    mobile.add_locator_handler(mobile.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click())
    mobile.goto(URL,wait_until='networkidle');mobile.get_by_role('button',name='Abrir workspace local sem conta').click();mobile.get_by_role('button',name='Abrir navegação',exact=True).click();mobile.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click();mobile.get_by_role('button',name='Abrir mapa',exact=True).first.click()
    mf=mobile.frame_locator('.bo-blueprint-reference-frame');saved(mf)
    mobile.wait_for_function("async()=>{const r=await window.BlueOceanRuntime.api('dataBridge').recovery();return r.durableOk&&r.durableRevision>=r.revision}");mf.locator('.lb').first.click()
    mf.get_by_role('button',name='Editar plano',exact=True).tap();md=mf.get_by_role('dialog',name='Editar plano',exact=True);md.get_by_label('Responsável',exact=True).fill('Equipe no celular');md.get_by_role('button',name='Salvar plano',exact=True).tap();expect(md).not_to_be_visible()
    check('A real touch device can edit the existing shared plan',graph(mobile)['service']['improvementPortfolio']['initiatives'][plan_id]['owner']=='Equipe no celular')
    mf.get_by_role('button',name='Acompanhar',exact=True).tap();md=mf.get_by_role('dialog',name='Acompanhar melhoria',exact=True);md.get_by_label('Novo valor medido').fill('9');md.get_by_label('Observação da medição').fill('Medição de QA por toque');md.get_by_role('button',name='Registrar medição',exact=True).tap();expect(md).not_to_be_visible()
    check('Touch measurements preserve the earlier measurement history',len(graph(mobile)['service']['outcomes']['measurements'])==2 and graph(mobile)['entities']['metric'][metric_id]['value']==9)
    if mf.get_by_role('button',name='Mostrar todos os comandos',exact=True).is_visible():mf.get_by_role('button',name='Mostrar todos os comandos',exact=True).tap()
    mf.get_by_role('button',name='Apresentar',exact=True).tap();audit(frame(mobile),'executive-touch');mobile.screenshot(path=str(OUT/'executive-touch.png'),animations='disabled');mf.get_by_role('button',name='Voltar ao mapa',exact=True).tap();touch.close()
    check('No uncaught browser errors',not errors)
    (OUT/'results.json').write_text(json.dumps(checks,indent=2,ensure_ascii=False));browser.close()
finally:
    server.shutdown();server.server_close()

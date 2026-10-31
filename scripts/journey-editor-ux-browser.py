#!/usr/bin/env python3
"""Acceptance of responsive map editing and independent Journey/Blueprint perspectives."""
import functools, json, os, shutil, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from map_browser_support import use_matrix, matrix_perspective
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/journey-editor-ux'
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
        context=browser.new_context(viewport={'width':1440,'height':1000})
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_locator_handler(page.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click())
        page.goto(URL,wait_until='networkidle')
        page.get_by_role('button',name='Abrir workspace local sem conta').click()
        page.get_by_role('button',name='Novo projeto',exact=True).click();page.locator('[data-project-creation-page] .bo-h744-option-grid button').first.click()
        page.get_by_label('Nome do projeto',exact=False).fill('UX dos mapas QA')
        page.locator('details.bo-h744-additional summary').click();page.get_by_label('Nome do serviço',exact=True).fill('Atendimento')
        page.get_by_role('button',name='Criar projeto e começar',exact=True).click()
        page.get_by_role('button',name='Criar mapa',exact=True).click()
        page.get_by_role('button',name='Em branco',exact=False).first.click()
        f=page.frame_locator('.bo-blueprint-reference-frame');saved(f)
        expect(f.get_by_role('button',name='Adicionar a primeira etapa',exact=True)).to_be_visible()
        expect(f.locator('[data-card-count]')).to_contain_text('Nenhum cartão')
        check('Blank map provides a clear first action and no phantom cards',f.locator('.content-block').count()==0)
        stage(f,'Descobrir')
        expect(f.locator('[data-cell="ac|0"]>.content-add')).to_have_css('opacity','1')
        width=f.locator('[data-row="st"]>.sh').first.bounding_box()['width']
        check('One stage has a comfortable bounded width',260<=width<=441)
        screenshot(page,'one-stage-1440')
        f.locator('[data-cell="ac|0"]>.content-add').click()
        f.get_by_role('button',name='Adicionar Cartão',exact=True).click();saved(f)
        expect(f.locator('[data-card-count]')).to_contain_text('1 rascunho sem texto')
        expect(f.locator('[data-card-count]')).to_contain_text('Nenhum cartão')
        field=f.locator('[data-cell="ac|0"] [data-ed="c"]').last
        field.fill('Solicitar atendimento');field.press('Tab');saved(f)
        expect(f.locator('[data-card-count]')).to_have_text('1 cartão nas faixas abertas')
        check('Inline editing updates the count without reopening the map',True)
        stage(f,'Solicitar')
        widths=f.locator('[data-row="st"]>.sh').evaluate_all('(nodes)=>nodes.map(n=>n.getBoundingClientRect().width)')
        check('Two stages share the available area without oversized cards',all(260<=w<=441 for w in widths))
        screenshot(page,'two-stages-1440')
        f.locator('[data-stage-resize="0"]').focus()
        f.locator('[data-stage-resize="0"]').press('ArrowLeft');saved(f)
        resized=f.locator('[data-row="st"]>.sh').first.bounding_box()['width']
        f.get_by_role('button',name='Ajustar à tela',exact=True).click();saved(f)
        fitted=f.locator('[data-row="st"]>.sh').first.bounding_box()['width']
        check('Fit to screen reflows manually resized columns',fitted>resized)
        f.get_by_role('button',name='Ajustar à tela',exact=True).click();saved(f)
        check('Leaving fit restores manual column widths',abs(f.locator('[data-row="st"]>.sh').first.bounding_box()['width']-resized)<1)

        jid=next(iter(graph(page)['journeys']))
        original_name=f.get_by_role('textbox',name='Nome do mapa',exact=True).input_value()
        customize(f,'em',False)
        filters(f,'Solicitar')
        journey_view=graph(page)['journeys'][jid]['matrixView']
        perspective(f,'Blueprint')
        expect(f.locator('[data-boundary]')).to_have_count(3)
        check('Blueprint starts with operational lanes and clear filters',f.locator('[data-row="fl"]').count()==1 and f.locator('.content-block').count()==1)
        add(f,'fl|0','Receber solicitação')
        add(f,'bk|0','Preparar atendimento')
        f.get_by_role('button',name='Configurar faixa Bastidores',exact=True).click()
        dialog=f.get_by_role('dialog',name='Configurar faixa',exact=True)
        expect(dialog.locator('.row-advanced')).not_to_have_attribute('open','')
        expect(dialog.locator('.row-method')).to_contain_text('Tipo metodológico: Bastidores')
        dialog.get_by_label('Nome da faixa',exact=True).fill('Preparação interna')
        expect(dialog.locator('[data-row-preview] b')).to_have_text('Preparação interna')
        dialog.get_by_text('Personalização avançada',exact=True).click()
        dialog.get_by_label('Cor de destaque',exact=True).select_option('violet')
        dialog.get_by_label('Altura da faixa (px)',exact=True).fill('140')
        audit(page,'row-config-desktop');dialog.get_by_text('Personalização avançada',exact=True).click();screenshot(page,'row-configuration')
        dialog.get_by_role('button',name='Salvar faixa',exact=True).click();saved(f)
        check('Renaming and styling preserve the backstage role and existing card',f.locator('[data-row="bk"]').get_attribute('data-tone')=='violet' and f.locator('[data-cell="bk|0"] .content-block').count()==1 and f.locator('[data-boundary="bk"]').count()==1)
        customize(f,'fl',False)
        expect(f.locator('.blueprint-notice')).to_contain_text('Linha de frente')
        check('Hiding frontstage suspends the visibility divider with an explanation',f.locator('[data-boundary="bk"]').count()==0 and f.locator('.blueprint-gap').count()==1)
        expect(f.locator('[data-card-count]')).to_contain_text('1 em faixas ocultas')
        perspective(f,'Jornada')
        view=graph(page)['journeys'][jid]['matrixView']
        check('Journey restores its own hidden lanes, filters and order',all(view[k]==journey_view[k] for k in ['hiddenRows','cardFilters','rowOrder']))
        check('Journey hides methodological dividers while keeping all canonical cards',f.locator('.dv').count()==0 and f.get_by_role('textbox',name='Nome do mapa',exact=True).input_value()==original_name)
        perspective(f,'Jornada')
        check('Clicking the current perspective retains personalization',f.locator('[data-row="em"]').count()==0)
        perspective(f,'Blueprint')
        check('Returning to Blueprint restores its hidden frontstage lane',f.locator('[data-row="fl"]').count()==0)
        customize(f,'fl',True)
        expect(f.locator('[data-boundary]')).to_have_count(3)
        perspective(f,'Jornada')
        filters(f,'')
        add(f,'ac|0','Comparar opções')
        count_before=f.locator('[data-cell="ac|0"] .content-block').count()
        f.get_by_role('button',name='Desfazer',exact=True).click();saved(f)
        expect(f.locator('[data-cell="ac|0"] [data-ed="c"]').last).to_have_text('')
        expect(f.locator('[data-card-count]')).to_contain_text('1 rascunho sem texto')
        f.get_by_role('button',name='Refazer',exact=True).click();saved(f)
        expect(f.locator('[data-cell="ac|0"] .content-block')).to_have_count(count_before)
        expect(f.locator('[data-cell="ac|0"] [data-ed="c"]').last).to_have_text('Comparar opções')
        check('Card editing retains undo and redo without counting an empty draft',True)
        for name in ['Receber','Usar','Avaliar','Retornar']:stage(f,name)
        overflow=f.locator('.bd').evaluate('(el)=>el.scrollWidth>el.clientWidth')
        check('Several stages enable horizontal scrolling inside the workspace',overflow)
        f.get_by_role('button',name='Ajustar à tela',exact=True).click();saved(f)
        f.get_by_role('button',name='Visualizações',exact=True).click()
        f.get_by_label('Nome da visualização',exact=True).fill('Revisão UX')
        f.get_by_role('button',name='Salvar visualização atual',exact=True).click();saved(f)
        f.get_by_role('button',name='Voltar ao mapa',exact=True).click()
        perspective(f,'Blueprint')
        f.get_by_role('button',name='Visualizações',exact=True).click()
        f.get_by_role('button',name='Aplicar visualização Revisão UX',exact=True).click();saved(f)
        expect(f.locator('.map-perspective-label')).to_have_text('Jornada')
        check('Saved views restore the active perspective with current data',f.locator('[data-cell="ac|0"] .content-block').count()==2)
        for width in [1440,834,390]:
            page.set_viewport_size({'width':width,'height':1000 if width>390 else 844})
            expect(f.get_by_role('button',name='Adicionar etapa',exact=True)).to_be_visible()
            frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
            check(f'No document overflow at {width}px',frame.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
            f.locator('[data-cell="ac|1"]>.content-add').focus()
            expect(f.locator('[data-cell="ac|1"]>.content-add')).to_be_focused()
            audit(page,f'matrix-{width}');screenshot(page,f'matrix-{width}')
        page.set_viewport_size({'width':1440,'height':1000})
        before=graph(page)['journeys'][jid]
        f.get_by_role('button',name='Voltar para mapas do serviço',exact=True).click()
        page.reload(wait_until='networkidle')
        page.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click()
        page.locator('[data-journey-library]').get_by_role('button',name='Abrir mapa',exact=True).first.click();saved(f)
        check('Reload preserves content and independent perspective memory',graph(page)['journeys'][jid]['matrixContent']==before['matrixContent'] and graph(page)['journeys'][jid]['matrixView']['perspectiveViews']==before['matrixView']['perspectiveViews'])
        mobile_context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,storage_state=context.storage_state())
        mobile=mobile_context.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)))
        mobile.add_locator_handler(mobile.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click())
        mobile.goto(URL,wait_until='networkidle');mobile.get_by_role('button',name='Abrir workspace local sem conta').click()
        mobile.get_by_role('button',name='Abrir navegação',exact=True).click();mobile.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click()
        mobile.locator('[data-journey-library]').get_by_role('button',name='Abrir mapa',exact=True).first.click()
        mf=mobile.frame_locator('.bo-blueprint-reference-frame');saved(mf)
        mf.locator('[data-cell="ac|1"]>.content-add').tap();mf.get_by_role('button',name='Adicionar Cartão',exact=True).tap()
        field=mf.locator('[data-cell="ac|1"] [data-ed="c"]').last
        field.fill('Solicitação por toque');field.press('Tab');saved(mf)
        check('Touch insertion creates a card in the same canonical map','Solicitação por toque' in json.dumps(graph(mobile),ensure_ascii=False))
        screenshot(mobile,'touch-390');mobile_context.close()
        check('No uncaught browser errors',not errors)
        browser.close()
finally:
    (OUT/'results.json').write_text(json.dumps({'checks':checks,'skipped':skipped,'errors':errors},ensure_ascii=False,indent=2))
    server.shutdown();server.server_close()

#!/usr/bin/env python3
"""Progressive Journey UI: real controls, canonical persistence and responsive access."""
import functools
import json
import os
import shutil
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'journey-progressive'
OUT.mkdir(parents=True, exist_ok=True)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}'
results = []

def check(name, condition):
    assert condition, name
    results.append(name)
    print('PASS ' + name, flush=True)

def graph(page):
    return page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').get()")

def enter(page):
    page.goto(URL, wait_until='networkidle')
    page.get_by_role('button', name='Abrir workspace local sem conta').click()
    page.get_by_role('button', name='Novo projeto', exact=True).click()
    page.get_by_label('Nome do projeto', exact=True).fill('Jornada progressiva QA')
    page.get_by_label('Serviço principal', exact=True).fill('Atendimento')
    page.get_by_role('button', name='Criar projeto', exact=True).click()

def new_journey(page):
    page.locator('.bo-h724-journey-pane').get_by_role('button', name='Criar Jornada', exact=True).click()
    page.get_by_role('button', name='Em branco').first.click()
    f = page.frame_locator('.bo-blueprint-reference-frame')
    expect(f.locator('[data-empty-journey="1"]')).to_be_visible(timeout=15000)
    return f

def preset(f, name):
    f.locator('.toolbar>.menu').first.locator('summary').click()
    f.get_by_role('button', name=name, exact=False).click()
    expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')

def note(f, key, text):
    f.locator(f'[data-cell="{key}"] .ad').click()
    f.get_by_role('button',name='Adicionar Cartão',exact=True).click()
    edit = f.locator(f'[data-cell="{key}"] [data-ed="c"]').last
    expect(edit).to_be_focused()
    edit.fill(text)
    edit.press('Tab')
    expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), args=['--no-sandbox', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width':1440, 'height':960})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        enter(page)
        f = new_journey(page)
        jid = next(iter(graph(page)['journeys']))
        expect(f.locator('.matrix>.r')).to_have_count(4)
        check('Blank Journey begins with exactly four essential rows and closed Insights', f.locator('.matrix>.r').count() == 4 and not f.locator('.pnl').count())
        name = f.get_by_role('textbox', name='Nome da jornada', exact=True)
        name.fill('Atendimento ao cliente')
        name.press('Tab')
        page.wait_for_function("id => window.BlueOceanRuntime.api('dataBridge').get().journeys[id].name==='Atendimento ao cliente'", arg=jid)
        check('Journey title updates the canonical Journey without a Blueprint suffix', 'Blueprint' not in name.input_value())
        for title in ['Descobrir', 'Solicitar', 'Receber']:
            f.get_by_role('button', name='Adicionar etapa', exact=True).click()
            f.get_by_role('textbox',name='Nome da nova etapa',exact=True).fill(title)
            f.get_by_role('button',name='Adicionar etapa ao mapa',exact=True).click()
        note(f, 'ac|0', 'Comparar opções de atendimento')
        page.wait_for_timeout(750)  # End the editor's existing 700ms undo grouping window.
        f.locator('[data-cell="ac|0"] .note-menu summary').click()
        f.locator('[data-cell="ac|0"] [data-act="dn"]').click()
        expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
        check('Duplicating a note keeps direct editing focus', f.locator('[data-cell="ac|0"] [data-ed="c"]').count() == 2 and f.locator('[data-cell="ac|0"] [data-ed="c"]').last.evaluate('e=>e===document.activeElement'))
        f.get_by_role('button',name='Desfazer',exact=True).click()
        expect(f.locator('[data-cell="ac|0"] [data-ed="c"]')).to_have_count(1)
        f.get_by_role('button',name='Refazer',exact=True).click()
        expect(f.locator('[data-cell="ac|0"] [data-ed="c"]')).to_have_count(2)
        f.locator('[data-cell="ac|0"] .note-menu summary').last.click()
        f.locator('[data-cell="ac|0"] [data-act="rn"]').last.click()
        expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
        check('Undo, redo and note removal stay available', f.locator('[data-cell="ac|0"] [data-ed="c"]').count() == 1)
        preset(f, 'Matriz completa')
        for key, text in [('ev|0','Confirmação do pedido'), ('fl|0','Acolher a solicitação'), ('bk|0','Conferir o cadastro'), ('sy|0','Sistema de atendimento')]:
            note(f, key, text)
        f.get_by_role('button', name='+ Adicionar faixa', exact=True).click()
        f.get_by_role('button',name='Criar faixa de Texto',exact=True).click()
        f.locator('[data-ed="ln"]').fill('Necessidades')
        f.locator('[data-ed="ln"]').press('Tab')
        custom = f.locator('.r[data-row^="x"]').get_attribute('data-row')
        note(f, custom+'|0', 'Receber uma resposta clara')
        f.locator('[data-act="addi"][data-t="d"]').first.click()
        f.locator('[data-ed="ix"]').fill('Tempo de espera sem previsão')
        f.locator('[data-ed="ix"]').press('Tab')
        page.wait_for_function("() => Object.values(window.BlueOceanRuntime.api('dataBridge').get().problems).some(x=>x.description==='Tempo de espera sem previsão')")
        expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
        before = graph(page)
        preset(f, 'Jornada essencial')
        after = graph(page)
        for key in ['stages', 'problems', 'opportunities', 'entities']:
            check('Hiding rows preserves canonical '+key, before.get(key) == after.get(key))
        check('Hidden operational cards remain on the same Blueprint', next(iter(before['views']['whiteboards'].values()))['items'] == next(iter(after['views']['whiteboards'].values()))['items'])
        check('Returning to Essential hides optional custom rows', f.locator('.matrix>.r').count() == 4)
        note(f, 'ac|1', 'Solicitar atendimento pelo aplicativo')
        preset(f, 'Matriz completa')
        check('Editing visible rows preserves hidden custom and operational content', f.get_by_text('Conferir o cadastro', exact=True).is_visible() and f.get_by_text('Receber uma resposta clara', exact=True).is_visible())
        preset(f, 'Jornada essencial')
        f.get_by_role('button', name='Personalizar visualização', exact=True).click()
        dialog = f.get_by_role('dialog', name='Personalizar visualização')
        dialog.get_by_role('checkbox', name='Evidência física', exact=True).check()
        dialog.get_by_role('button', name='Mover Evidência física para cima', exact=True).click()
        dialog.get_by_role('button', name='Concluir', exact=True).click()
        check('Closing customization restores focus to its trigger', f.locator('[data-act="customize"]').first.evaluate('e=>e===document.activeElement'))
        check('Selected optional row appears and reordering persists', f.locator('.r[data-row="ev"]').count() == 1 and graph(page)['journeys'][jid]['matrixView']['preset'] == 'custom')
        f.locator('[data-act="emotion-edit"]').first.click()
        slider = f.locator('[data-act="emo"]').first
        slider.focus()
        slider.press('Home')
        f.get_by_role('textbox', name='Observação emocional em Descobrir').fill('Insegurança antes do primeiro contato')
        f.get_by_role('button', name='Concluir', exact=True).click()
        sid = graph(page)['journeys'][jid]['stageIds'][0]
        page.wait_for_function("id=>window.BlueOceanRuntime.api('dataBridge').get().stages[id].emotionScore===-2", arg=sid)
        check('Compact emotion controls save score and observation on the canonical stage', graph(page)['stages'][sid]['emotionNote'] == 'Insegurança antes do primeiro contato')
        f.locator('[data-act="emotion-edit"]').last.click()
        f.get_by_role('combobox',name='Tipo de registro em Receber').select_option('hypothesis')
        f.get_by_role('button',name='Concluir',exact=True).click()
        expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
        neutral_id = graph(page)['journeys'][jid]['stageIds'][-1]
        check('A confirmed neutral emotion is recorded without changing its score', graph(page)['stages'][neutral_id]['emotionScore'] == 0 and graph(page)['stages'][neutral_id]['emotionRecorded'])
        f.get_by_role('button', name='Insights', exact=True).click()
        expect(f.get_by_role('tab', name='Orientações')).to_be_focused()
        f.get_by_role('tab', name='Orientações').press('ArrowRight')
        expect(f.get_by_role('tab', name='Análise')).to_be_focused()
        expect(f.get_by_text('Prioridade de melhoria', exact=True)).to_be_visible()
        f.get_by_role('tab', name='Análise').press('ArrowRight')
        expect(f.get_by_text('Cobertura da qualidade (SERVQUAL)', exact=True)).to_be_visible()
        check('Insights provides three keyboard accessible tabs', f.get_by_role('tab').count() == 3)
        f.get_by_role('button', name='Fechar Insights').click()
        page.wait_for_function("id=>window.BlueOceanRuntime.api('dataBridge').get().journeys[id].matrixView.insightsOpen===false",arg=jid)
        saved_view = graph(page)['journeys'][jid]['matrixView']
        f.locator('.tools-menu summary').click()
        f.get_by_role('button', name='Recursos avançados').click()
        tools = page.get_by_role('dialog', name='Ferramentas da Jornada')
        expect(tools).to_be_visible()
        check('Advanced tools remain available with the Journey label', tools.get_by_role('button', name='Revisar entrega').is_visible() and tools.get_by_role('button', name='Importar / Exportar').is_visible())
        tools.locator('.rt144-x').click()
        f.get_by_role('button', name='Voltar para Jornadas').click()
        page.reload(wait_until='networkidle')
        page.get_by_role('button', name='Abrir Jornadas', exact=True).click()
        page.get_by_role('button', name='Abrir Jornada', exact=True).first.click()
        f = page.frame_locator('.bo-blueprint-reference-frame')
        expect(f.locator('.r[data-row="ev"]')).to_be_visible()
        check('Reopening restores per-Journey visibility, order and Insights preferences', graph(page)['journeys'][jid]['matrixView'] == saved_view and not f.locator('.pnl').count())
        check('Emotion and observation survive reload', graph(page)['stages'][sid]['emotionScore'] == -2 and graph(page)['stages'][sid]['emotionNote'] == 'Insegurança antes do primeiro contato')
        first_view = graph(page)['journeys'][jid]['matrixView']
        f.get_by_role('button', name='Voltar para Jornadas').click()
        f = new_journey(page)
        check('Another Journey starts essential without inheriting the previous preferences', f.locator('.matrix>.r').count() == 4 and graph(page)['journeys'][jid]['matrixView'] == first_view)
        f.get_by_role('button', name='Voltar para Jornadas').click()
        # Open the original named Journey card.
        page.locator('article').filter(has=page.get_by_text('Atendimento ao cliente', exact=True)).get_by_role('button', name='Abrir Jornada', exact=True).click()
        f = page.frame_locator('.bo-blueprint-reference-frame')
        expect(f.locator('.bd')).to_be_visible()
        axe = (ROOT/'node_modules/axe-core/axe.min.js').read_text()
        for width in [1440,834,390]:
            page.set_viewport_size({'width':width,'height':960})
            page.wait_for_timeout(300)  # Let the application finish its responsive layout update.
            frame = page.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
            frame.add_script_tag(content=axe)
            audit = frame.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.map(n=>n.target)}))}")
            (OUT/f'axe-{width}.json').write_text(json.dumps(audit,indent=2))
            check(f'No WCAG A/AA axe violations at {width}px', not audit)
            check(f'Page does not overflow horizontally at {width}px', frame.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            f.get_by_role('button', name='Personalizar visualização', exact=True).click()
            expect(f.get_by_role('dialog',name='Personalizar visualização')).to_be_visible()
            dialog_audit = frame.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(x=>x.id)}")
            check(f'Customization has no axe violations at {width}px', not dialog_audit)
            f.get_by_role('button', name='Fechar personalização').click()
            page.screenshot(path=str(OUT/f'journey-{width}.png'),animations='disabled')
            f.get_by_role('button',name='Insights',exact=True).click()
            page.wait_for_function("id=>window.BlueOceanRuntime.api('dataBridge').get().journeys[id].matrixView.insightsOpen===true",arg=jid)
            expect(f.get_by_role('button',name='Fechar Insights',exact=True)).to_be_visible()
            panel_audit = frame.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(x=>x.id)}")
            check(f'Expanded Insights has no axe violations at {width}px', not panel_audit)
            page.screenshot(path=str(OUT/f'insights-{width}.png'),animations='disabled')
            f.get_by_role('button',name='Fechar Insights',exact=True).click()
            page.wait_for_function("id=>window.BlueOceanRuntime.api('dataBridge').get().journeys[id].matrixView.insightsOpen===false",arg=jid)
        # A real touch context, not only a resized desktop viewport.
        f.get_by_role('button',name='Voltar para Jornadas',exact=True).click()
        touch = browser.new_context(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True, storage_state=page.context.storage_state())
        mobile = touch.new_page()
        # Imported browser storage can include the existing recovery notification.
        mobile.add_locator_handler(mobile.locator('.rt155-recovery-notice.show'), lambda notice: notice.locator('i').click(), times=1)
        mobile.on('pageerror', lambda error: errors.append(str(error)))
        mobile.goto(URL,wait_until='networkidle')
        mobile.get_by_role('button',name='Abrir workspace local sem conta').click()
        mobile.get_by_role('button',name='Abrir navegação',exact=True).click()
        mobile.get_by_role('button',name='Abrir Jornadas',exact=True).click()
        mobile.locator('.bo-h724-journey-card').filter(has_text='Atendimento ao cliente').get_by_role('button',name='Abrir Jornada',exact=True).click()
        mf = mobile.frame_locator('.bo-blueprint-reference-frame')
        expect(mf.locator('.bd')).to_be_visible()
        expect(mf.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
        iframe_handle=mobile.locator('.bo-blueprint-reference-frame').element_handle()
        mobile.wait_for_function("async()=>{const r=await window.BlueOceanRuntime.api('dataBridge').recovery();return r.durableOk&&r.durableRevision>=r.revision}")
        check('Opening the editor preserves the hydrated iframe while durable initialization completes',iframe_handle.evaluate('e=>e.isConnected'))
        mf.locator('.lb').first.click()  # Settle any imported-session notification before asserting input focus.
        check('Touch devices expose cell actions without hover', mf.locator('[data-cell="ac|0"] .ad').evaluate('e=>getComputedStyle(e).opacity') == '1')
        note(mf,'ac|0','Comparar opções no celular')
        mobile.wait_for_function("id=>window.BlueOceanRuntime.api('dataBridge').get().stages[id].customerAction.includes('Comparar opções no celular')",arg=sid)
        check('Touch editing persists through the canonical graph', 'Comparar opções no celular' in graph(mobile)['stages'][sid]['customerAction'])
        mf.get_by_role('button',name='Personalizar visualização',exact=True).click()
        mf.get_by_role('checkbox',name='Evidência física',exact=True).uncheck()
        mf.get_by_role('button',name='Concluir',exact=True).click()
        expect(mf.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
        check('Touch visualization preferences are persisted', 'ev' in graph(mobile)['journeys'][jid]['matrixView']['hiddenRows'])
        touch.close()
        check('No uncaught browser errors', not errors)
        (OUT/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
        browser.close()
finally:
    server.shutdown()
    server.server_close()

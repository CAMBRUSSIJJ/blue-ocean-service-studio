#!/usr/bin/env python3
"""Shared Journey/Blueprint library, matrix appearance and preserved editing tools."""
import functools, json, os, shutil, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/shared-map-matrix'
OUT.mkdir(parents=True, exist_ok=True)
checks, errors = [], []

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass
    def copyfile(self, source, output):
        try: super().copyfile(source, output)
        except (BrokenPipeError, ConnectionResetError): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}'

def check(name, condition):
    assert condition, name
    checks.append(name)
    print('PASS ' + name, flush=True)

def graph(page): return page.evaluate("()=>window.BlueOceanRuntime.api('dataBridge').get()")
def saved(frame): expect(frame.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
def stage(frame, name):
    frame.get_by_role('button', name='Adicionar etapa', exact=True).click()
    frame.get_by_role('textbox', name='Nome da nova etapa', exact=True).fill(name)
    frame.get_by_role('button', name='Adicionar etapa ao mapa', exact=True).click()
    saved(frame)
def add(frame, key, text, before=False):
    cell = frame.locator(f'[data-cell="{key}"]')
    cell.locator('.content-insert' if before else ':scope > .content-add').first.click()
    frame.get_by_role('button', name='Adicionar Cartão', exact=True).click()
    card = cell.locator('.content-block').first if before else cell.locator('.content-block').last
    card.locator('[data-ed=c]').fill(text)
    card.locator('[data-ed=c]').press('Tab'); saved(frame)
def tools(frame):
    frame.locator('.tools-menu summary').click()
    frame.get_by_role('button', name='Recursos avançados', exact=False).click()
def audit(page, name, frame=False):
    target = page.locator('.bo-blueprint-reference-frame').element_handle().content_frame() if frame else page
    target.add_script_tag(content=(ROOT / 'node_modules/axe-core/axe.min.js').read_text())
    violations = target.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
    (OUT / f'{name}-axe.json').write_text(json.dumps(violations, indent=2))
    check('Accessibility: ' + name, not violations)

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), args=['--no-sandbox', '--disable-dev-shm-usage'])
        context = browser.new_context(viewport={'width': 1440, 'height': 1000})
        page = context.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
        page.add_locator_handler(page.locator('.rt155-recovery-notice.show'), lambda n: n.locator('i').click())
        page.goto(URL, wait_until='networkidle')
        page.get_by_role('button', name='Abrir workspace local sem conta').click()
        page.get_by_role('button', name='Novo projeto', exact=True).click()
        page.get_by_label('Nome do projeto', exact=True).fill('Matriz compartilhada QA')
        page.get_by_label('Serviço principal', exact=True).fill('Atendimento')
        page.get_by_role('button', name='Criar projeto', exact=True).click()
        page.get_by_role('button', name='Abrir Jornadas e Blueprints', exact=True).click()
        expect(page.locator('[data-journey-library]')).to_be_visible()
        expect(page.locator('[data-blueprint-library]')).to_be_visible()
        check('One navigation entry opens both libraries', page.locator('[data-service-journey-nav]').count() == 1 and page.locator('[data-service-blueprint-nav]').get_attribute('data-service-journey-nav') == '1')
        audit(page, 'shared-library')
        page.screenshot(path=str(OUT / 'library-1440.png'), animations='disabled', full_page=True)
        page.locator('[data-journey-library]').get_by_role('button', name='Criar Jornada', exact=True).click()
        expect(page.locator('[data-journey-starter]')).to_be_visible()
        page.screenshot(path=str(OUT / 'starter.png'), animations='disabled')
        page.get_by_role('button', name='Em branco', exact=False).first.click()
        f = page.frame_locator('.bo-blueprint-reference-frame')
        stage(f, 'Descobrir'); stage(f, 'Solicitar'); stage(f, 'Receber')
        # Editor de Mapas H1/H2: zoom and direct manipulation survive the canonical preference bridge.
        f.get_by_role('button', name='Ampliar zoom').click(); saved(f)
        first_journey_id = next(iter(graph(page)['journeys']))
        check('Zoom preference is saved in the canonical Journey view', graph(page)['journeys'][first_journey_id]['matrixView']['zoom'] == 110)
        f.get_by_role('button', name='Restaurar zoom a 100 por cento').click(); saved(f)
        resize = f.locator('[data-stage-resize="0"]')
        box = resize.bounding_box()
        x, y = box['x']+box['width']/2, box['y']+box['height']/2
        page.mouse.move(x,y); page.mouse.down(); page.mouse.move(x+80,y,steps=8); page.mouse.up(); saved(f)
        check('Stage width persists after pointer drag', graph(page)['journeys'][first_journey_id]['matrixView']['stageWidths'][0] >= 320)
        f.locator('[data-act="lane-collapse"][data-id="sd"]').click(); saved(f)
        check('Collapsing a lane retains content and is persisted', 'sd' in graph(page)['journeys'][first_journey_id]['matrixView']['collapsedRows'] and f.locator('[data-row="sd"]').get_attribute('data-collapsed') == 'true')
        f.locator('[data-act="lane-collapse"][data-id="sd"]').click(); saved(f)
        check('Expanding restores the lane editor', f.locator('[data-cell="sd|0"]').count() == 1)
        f.locator('[data-lane-handle="sd"]').drag_to(f.locator('[data-row="em"] > .lb'))
        saved(f)
        order = graph(page)['journeys'][first_journey_id]['matrixView']['rowOrder']
        check('Lane drag changes persistent order', order.index('sd') > order.index('ac'))
        f.locator('[data-lane-resize="ac"]').focus()
        f.locator('[data-lane-resize="ac"]').press('ArrowDown'); saved(f)
        check('Lane height can be adjusted accessibly by keyboard', graph(page)['journeys'][first_journey_id]['matrixView']['rowHeights']['ac'] >= 96)
        check('Filters start collapsed to leave the matrix visible', not f.locator('#card-filter-form').is_visible())
        add(f, 'ac|0', 'Solicitar atendimento')
        first_id = f.locator('[data-cell="ac|0"] .content-block').get_attribute('data-nid')
        add(f, 'ac|0', 'Comparar opções', before=True)
        check('Ruled Add card inserts before the chosen stable card', f.locator('[data-cell="ac|0"] .content-block').last.get_attribute('data-nid') == first_id)
        initial = graph(page); jid = next(iter(initial['journeys'])); bid = next(b['id'] for b in initial['views']['whiteboards'].values() if b.get('viewKind') == 'blueprint')
        stages = initial['journeys'][jid]['stageIds']
        # Drag an initially unrecorded emotional point to the highest score.
        dot = f.locator('#curve .dt[data-si="1"]')
        start = dot.bounding_box()
        check('Unrecorded emotion exposes a draggable point', 'unknown' in dot.get_attribute('class'))
        cx, cy = start['x'] + start['width'] / 2, start['y'] + start['height'] / 2
        page.mouse.move(cx, cy); page.mouse.down()
        page.mouse.move(cx, cy - 30, steps=9); page.mouse.up(); saved(f)
        recorded = graph(page)['stages'][stages[1]]
        check('Dragging emotion stores canonical score and hypothesis', recorded['emotionScore'] == 2 and recorded['emotionRecorded'] and recorded['emotionStatus'] == 'hypothesis')
        check('Curve updates without losing stage markers', f.locator('#curve .dt.hypothesis').count() == 1 and f.locator('#curve [data-emotion-curve-line]').get_attribute('d') != '')
        f.get_by_role('button', name='Blueprint', exact=True).click(); saved(f)
        expect(f.locator('[data-row=fl]')).to_be_visible()
        check('Changing perspective keeps the same Journey, board and stages', list(graph(page)['journeys']) == [jid] and graph(page)['journeys'][jid]['stageIds'] == stages and len([b for b in graph(page)['views']['whiteboards'].values() if b.get('viewKind') == 'blueprint']) == 1)
        check('Blueprint keeps conceptual boundaries', f.locator('.dv').count() >= 3)
        add(f, 'fl|0', 'Confirmar recebimento')
        card = f.locator('[data-cell="fl|0"] .content-block')
        card.get_by_label('Ações da nota', exact=True).click()
        card.get_by_role('button', name='Detalhes operacionais', exact=True).click()
        dialog = page.get_by_role('dialog', name='Detalhes da atividade', exact=True)
        expect(dialog).to_be_visible()
        dialog.get_by_label('Tempo de execução (min)', exact=True).fill('5')
        dialog.get_by_role('button', name='Salvar atividade', exact=True).click(); saved(f)
        check('Canonical activity details remain editable from the card', any(r.get('operationalDetails', {}).get('durationMinutes') == 5 for r in graph(page)['entities']['frontstage'].values()))
        f.get_by_role('button', name='+ Adicionar faixa', exact=True).click()
        f.get_by_role('button', name='Faixa personalizada →', exact=True).click()
        f.get_by_role('button', name='Criar faixa de Cartão', exact=True).click(); saved(f)
        name = f.locator('[data-ed=ln]').last; name.fill('Pontos de atenção'); name.press('Tab'); saved(f)
        lane = name.get_attribute('data-id')
        add(f, lane + '|1', 'Acompanhar o prazo de retorno')
        check('Custom lane configuration and card creation remain available', any(r['n'] == 'Pontos de atenção' for r in graph(page)['journeys'][jid]['matrixContent']['rows'].values()))
        for width in [1440, 834, 390]:
            page.set_viewport_size({'width': width, 'height': 1000})
            # Inspect real rendered rules, not a source-text approximation.
            button = f.locator('[data-cell="sd|0"] > .content-add')
            button.hover()
            expect(button).to_have_css('opacity', '1')
            rendered = button.evaluate("e=>({line:getComputedStyle(e,'::before').borderTopStyle,span:!!e.querySelector('span'),visible:getComputedStyle(e).opacity})")
            check(f'Add card uses a dashed insertion rule at {width}px', rendered['line'] == 'dashed' and rendered['span'] and rendered['visible'] == '1')
            check(f'Cards have a consistent paper border at {width}px', card.evaluate("e=>getComputedStyle(e).borderTopStyle") == 'solid')
            audit(page, 'matrix-' + str(width), frame=True)
            page.screenshot(path=str(OUT / f'matrix-{width}.png'), animations='disabled')
        page.set_viewport_size({'width': 1440, 'height': 1000})
        ids_before = set(graph(page)['views']['whiteboards'][bid]['items'])
        tools(f)
        tools_dialog = page.get_by_role('dialog', name='Ferramentas da Jornada', exact=True)
        for label in ['Revisar entrega', 'Estratégia e qualidade', 'Importar / Exportar', 'Guia do Blueprint', 'Integridade do Service Graph', 'Editor operacional completo']:
            expect(tools_dialog.get_by_role('button', name=label, exact=False)).to_be_visible()
        tools_dialog.get_by_role('button', name='Editor operacional completo', exact=False).click()
        expect(page.get_by_role('button', name='Voltar à matriz', exact=True)).to_be_visible()
        page.get_by_role('button', name='Opções', exact=True).click()
        expect(page.get_by_role('dialog', name='Ferramentas do editor', exact=True)).to_be_visible()
        check('Full operational tools remain reachable', page.get_by_role('button', name='Voltar à matriz', exact=True).count() == 1)
        page.get_by_role('dialog', name='Ferramentas do editor', exact=True).get_by_role('button', name='Fechar', exact=True).click()
        page.get_by_role('button', name='Voltar à matriz', exact=True).click(); saved(f)
        check('Returning to the matrix retains canonical item identities', set(graph(page)['views']['whiteboards'][bid]['items']) == ids_before)
        f.get_by_role('button', name='Voltar para Jornadas e Blueprints', exact=True).click()
        page.locator('[data-blueprint-library]').get_by_role('button', name='Abrir Blueprint', exact=True).first.click(); saved(f)
        check('Blueprint library opens the same matrix component', f.locator('.map-perspectives').count() == 1 and f.locator('[data-cell="ac|0"] .content-block').count() == 2)
        f.get_by_role('button', name='Voltar para Jornadas e Blueprints', exact=True).click()
        page.reload(wait_until='networkidle')
        page.get_by_role('button', name='Abrir Jornadas e Blueprints', exact=True).click()
        expect(page.locator('[data-blueprint-library]')).to_be_visible()
        page.locator('[data-journey-library]').get_by_role('button', name='Abrir Jornada', exact=True).first.click(); saved(f)
        check('Reload retains both perspectives, card order and custom lanes', f.locator('[data-cell="ac|0"] .content-block').last.get_attribute('data-nid') == first_id and f.locator('[data-row="' + lane + '"]').count() == 1)
        f.get_by_role('button', name='Voltar para Jornadas e Blueprints', exact=True).click()
        mobile_context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, storage_state=context.storage_state())
        mobile = mobile_context.new_page(); mobile.on('pageerror', lambda e: errors.append(str(e)))
        mobile.add_locator_handler(mobile.locator('.rt155-recovery-notice.show'), lambda n: n.locator('i').click())
        mobile.goto(URL, wait_until='networkidle')
        mobile.get_by_role('button', name='Abrir workspace local sem conta').click()
        mobile.get_by_role('button', name='Abrir navegação', exact=True).click()
        mobile.get_by_role('button', name='Abrir Jornadas e Blueprints', exact=True).click()
        mobile.locator('[data-journey-library]').get_by_role('button', name='Abrir Jornada', exact=True).first.click()
        mf = mobile.frame_locator('.bo-blueprint-reference-frame'); saved(mf)
        mf.get_by_role('button', name='Jornada', exact=True).tap(); saved(mf)
        check('Custom lanes remain visible when changing perspective', mf.locator('[data-row="' + lane + '"]').count() == 1)
        add(mf, 'ac|0', 'Cartão criado no celular')
        check('Touch Add card persists in the same canonical stage', 'Cartão criado no celular' in graph(mobile)['stages'][stages[0]]['customerAction'])
        audit(mobile, 'matrix-touch', frame=True)
        mobile_context.close()
        # A Blueprint can be removed without deleting the Journey.
        page.locator('[data-blueprint-library]').get_by_role('button', name='Excluir Blueprint', exact=False).first.click()
        delete_blueprint = page.locator('[data-delete-blueprint-dialog]')
        expect(delete_blueprint).to_be_visible()
        check('Blueprint deletion requires confirmation', bid in graph(page)['views']['whiteboards'])
        delete_blueprint.get_by_role('button', name='Excluir Blueprint', exact=True).click()
        check('Blueprint deletion preserves its Journey', bid not in graph(page)['views']['whiteboards'] and jid in graph(page)['journeys'])
        # Remove the Journey independently once the Blueprint has been deleted.
        page.locator('[data-journey-library]').get_by_role('button', name='Excluir Jornada', exact=False).first.click()
        delete_journey = page.locator('[data-delete-journey-dialog]')
        expect(delete_journey).to_be_visible()
        delete_journey.get_by_role('button', name='Confirmar exclusão', exact=True).click()
        check('Confirmed Journey deletion removes the record', jid not in graph(page)['journeys'])
        check('No uncaught browser errors', not errors)
        browser.close()
    (OUT / 'results.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2))
finally:
    server.shutdown(); server.server_close()

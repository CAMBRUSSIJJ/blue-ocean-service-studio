#!/usr/bin/env python3
"""Journey acceptance tests using visible controls and the persisted document.

Set BLUE_OCEAN_URL for a running server, or build first to test dist locally.
"""
import functools
import json
import os
import re
import shutil
import threading
import traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'journey-editor'
OUT.mkdir(parents=True, exist_ok=True)
checks, failures = [], []

def check(name, condition):
    checks.append({'name': name, 'passed': bool(condition)})
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)
    if not condition:
        raise AssertionError(name)

def graph(page):
    return page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').get()")

def current(page):
    jid = page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').currentJourneyId()")
    return graph(page)['journeys'][jid]

def lanes(page):
    return current(page).get('mapLayout', {}).get('lanes', [])

def row(page, lane_id):
    return page.locator(f'[data-lane-id="{lane_id}"]')

def cell(page, lane_id, stage_id):
    return row(page, lane_id).locator(f'[data-stage-id="{stage_id}"]')

def add_lane(page, name):
    page.locator('.bo-h1705-menubar').get_by_role('button', name='Adicionar faixa', exact=True).click()
    page.locator('.bo-h1706-lane-menu').get_by_role('button', name=name, exact=True).click()
    return lanes(page)[-1]['id']

def stage(page, title):
    if page.get_by_placeholder('Nome da etapa', exact=True).count() == 0:
        page.locator('.bo-h1705-top-actions').get_by_role('button', name='Nova etapa', exact=True).click()
    page.get_by_placeholder('Nome da etapa', exact=True).fill(title)
    page.get_by_role('button', name='Criar etapa', exact=True).click()
    return current(page)['stageIds'][-1]

def project(page):
    page.goto(URL, wait_until='networkidle')
    page.get_by_role('button', name='Abrir workspace local sem conta').click()
    page.get_by_role('button', name='Novo projeto', exact=True).click()
    page.get_by_label('Nome do projeto', exact=True).fill('Jornada configurável QA')
    page.get_by_label('Serviço principal', exact=True).fill('Atendimento')
    page.get_by_role('button', name='Criar projeto', exact=True).click()
    page.get_by_role('button', name='Abrir serviço', exact=True).click()
    page.get_by_role('button', name=re.compile(r'^\+ Nova Jornada')).click()
    page.get_by_role('button', name=re.compile(r'^Em branco')).click()
    expect(page.locator('.bo-h1705-journey')).to_be_visible()

def card(page, lane_id, stage_id, text):
    target = cell(page, lane_id, stage_id)
    target.get_by_role('button', name='Adicionar cartão', exact=True).click()
    target.locator('textarea').last.fill(text)
    return lanes(page)[next(i for i, lane in enumerate(lanes(page)) if lane['id'] == lane_id)]['cardItems'][stage_id][-1]['id']

def actions(page, lane_id, action):
    target = row(page, lane_id)
    target.get_by_role('button', name=re.compile('^Ações da faixa ')).click()
    target.get_by_role('button', name=action, exact=True).click()

def desktop(page):
    project(page)
    editor = page.locator('.bo-h1705-journey')
    jid = current(page)['id']
    sidebar = page.locator('aside[data-bo-precision-sidebar-native="1"]')
    before_width = sidebar.bounding_box()['width']
    page.get_by_role('button', name='Recolher sidebar', exact=True).click()
    expect(sidebar).to_have_attribute('data-sidebar-collapsed', '1')
    expect(sidebar).to_have_css('width', '64px')
    check('Sidebar can collapse using a visible control and frees canvas space', sidebar.bounding_box()['width'] < before_width and page.get_by_role('button', name='Expandir sidebar', exact=True).is_visible())
    toggle_box = page.get_by_role('button', name='Expandir sidebar', exact=True).bounding_box()
    switcher_box = sidebar.locator('.bo1163-service-switcher').bounding_box()
    check('Collapsed navigation keeps the toggle and project switcher apart', toggle_box['y'] + toggle_box['height'] <= switcher_box['y'])

    page.keyboard.press('Control+Backslash')
    expect(sidebar).to_have_attribute('data-sidebar-collapsed', '0')
    page.keyboard.press('Control+Backslash')
    expect(sidebar).to_have_attribute('data-sidebar-collapsed', '1')
    check('Sidebar keyboard shortcut uses the same saved preference', page.evaluate("localStorage.getItem('bo-sidebar-collapsed')") == '1')
    page.locator('summary[aria-label="Ações do projeto"]').click()
    expect(page.locator('.bo-simple-project-actions')).to_have_attribute('open', '')
    check('Project backups remain available in the grouped actions', page.get_by_role('button', name='Exportar', exact=True).is_visible())
    page.keyboard.press('Escape')
    check('Escape closes the project actions and restores focus', not page.locator('.bo-simple-project-actions').evaluate('e => e.open') and page.locator('summary[aria-label="Ações do projeto"]').evaluate('e => e === document.activeElement'))

    check('Blank Journey has no imposed stages or lanes', not current(page)['stageIds'] and not lanes(page))
    name = page.get_by_role('textbox', name='Nome da Jornada', exact=True)
    name.fill('Título cancelado'); name.press('Escape')
    check('Escape cancels Journey rename', current(page)['name'] == 'Nova Jornada')
    name.fill('Atendimento configurável'); name.press('Enter')
    check('Journey title is directly editable', current(page)['name'] == 'Atendimento configurável')
    stages = [stage(page, text) for text in ['Solicitação', 'Atendimento', 'Retorno']]
    check('First and subsequent stages can be created by mouse', len(stages) == 3)
    check('Editing does not expand the collapsed sidebar', sidebar.get_attribute('data-sidebar-collapsed') == '1')
    check('Each stage has one persistent action menu', editor.locator('.bo-h1706-stage-tools button:not(.bo-simple-stage-grip)').count() == len(stages) and editor.get_by_role('button', name='Remover Retorno', exact=True).count() == 0)

    text_id = add_lane(page, 'Texto')
    row(page, text_id).get_by_role('textbox', name='Nome da faixa', exact=True).fill('Momentos do cliente')
    editor.get_by_role('button', name='Desfazer', exact=True).click()
    check('Undo restores the preceding lane name', lanes(page)[0]['label'] == 'Texto')
    editor.get_by_role('button', name='Refazer', exact=True).click()
    check('Redo restores the edited lane name', lanes(page)[0]['label'] == 'Momentos do cliente')
    ids = [card(page, text_id, sid, f'Cartão da etapa {i + 1}') for i, sid in enumerate(stages)]
    check('Every stage accepts a directly editable card', all(lanes(page)[0]['cardItems'][sid][0]['content'] == f'Cartão da etapa {i + 1}' for i, sid in enumerate(stages)))
    first = cell(page, text_id, stages[0])
    first.get_by_role('button', name='Duplicar cartão', exact=True).click()
    copied = first.locator('textarea').last
    copied.fill('Cartão independente')
    copied.press('Alt+ArrowUp')
    check('Card duplication and keyboard ordering retain independent identities', lanes(page)[0]['cardItems'][stages[0]][0]['content'] == 'Cartão independente' and lanes(page)[0]['cardItems'][stages[0]][1]['id'] == ids[0])
    source = first.locator(f'[data-card-id="{ids[0]}"] [draggable]')
    source.drag_to(cell(page, text_id, stages[1]).locator('.bo-h1709-card-stack'))
    check('Dragging moves a card between stages', len(lanes(page)[0]['cardItems'][stages[0]]) == 1 and len(lanes(page)[0]['cardItems'][stages[1]]) == 2)
    actions(page, text_id, 'Duplicar faixa')
    duplicate_id = lanes(page)[1]['id']
    check('Lane duplication copies content with fresh identities', lanes(page)[1]['label'].endswith('cópia') and lanes(page)[1]['cardItems'][stages[0]][0]['id'] != lanes(page)[0]['cardItems'][stages[0]][0]['id'])
    cell(page, duplicate_id, stages[0]).locator('textarea').fill('Só na cópia')
    check('Editing a duplicated lane preserves the source', lanes(page)[0]['cardItems'][stages[0]][0]['content'] == 'Cartão independente')
    actions(page, duplicate_id, 'Mover para cima')
    check('Lane order changes using its context menu', lanes(page)[0]['id'] == duplicate_id)
    actions(page, duplicate_id, 'Ocultar faixa')
    expect(row(page, duplicate_id)).to_have_count(0)
    page.get_by_role('button', name='Mostrar Momentos do cliente · cópia', exact=True).click()
    check('A hidden lane can be restored with its content', row(page, duplicate_id).is_visible() and lanes(page)[0]['cardItems'][stages[0]][0]['content'] == 'Só na cópia')
    actions(page, text_id, 'Propriedades')
    panel = page.locator('.bo-j2-lane-inspector')
    panel.get_by_label('Altura mínima da faixa', exact=True).select_option('240')
    panel.get_by_role('button', name='Cor Azul', exact=True).click()
    panel.get_by_label('Tipo de conteúdo da faixa', exact=True).select_option('stage')
    check('Lane properties change dimensions, color and presentation', next(x for x in lanes(page) if x['id'] == text_id)['height'] == 240 and row(page, text_id).get_by_text('Subetapa 1', exact=True).count() > 0)
    panel.get_by_label('Tipo de conteúdo da faixa', exact=True).select_option('text')
    panel.get_by_role('button', name='Fechar propriedades da faixa', exact=True).click()
    editor.get_by_role('button', name=re.compile('^Visualizações')).click()
    page.get_by_label('Largura das etapas', exact=True).select_option('360')
    page.keyboard.press('Escape')
    check('Column width is configurable', current(page)['mapLayout']['stageWidth'] == 360)
    # All advertised lane types have observable behavior, not just a label.
    sub = add_lane(page, 'Subetapas'); card(page, sub, stages[0], 'Conferir pedido')
    check('Substage lane numbers its entries', cell(page, sub, stages[0]).get_by_text('Subetapa 1', exact=True).is_visible())
    checklist = add_lane(page, 'Lista de verificação'); card(page, checklist, stages[0], 'Pedido conferido')
    cell(page, checklist, stages[0]).get_by_role('checkbox').check()
    check('Checklist stores completion', next(x for x in lanes(page) if x['id'] == checklist)['cardItems'][stages[0]][0]['checked'])
    icons = add_lane(page, 'Ícones'); card(page, icons, stages[0], 'Contato por telefone')
    cell(page, icons, stages[0]).get_by_role('combobox').select_option('📞')
    check('Icon lane stores the chosen icon', next(x for x in lanes(page) if x['id'] == icons)['cardItems'][stages[0]][0]['icon'] == '📞')
    image_id = add_lane(page, 'Imagem')
    page.route('https://journey.test/image.svg', lambda route: route.fulfill(content_type='image/svg+xml', body='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="blue"/></svg>'))
    cell(page, image_id, stages[0]).get_by_role('textbox').fill('https://journey.test/image.svg')
    expect(cell(page, image_id, stages[0]).locator('img')).to_be_visible()
    check('Image lane renders an image reference', cell(page, image_id, stages[0]).locator('img').get_attribute('src') == 'https://journey.test/image.svg')
    link = add_lane(page, 'Link de referência')
    cell(page, link, stages[0]).get_by_role('textbox').fill('https://example.org/research')
    check('Reference lane opens a valid URL', cell(page, link, stages[0]).get_by_role('link').get_attribute('href') == 'https://example.org/research')
    divider = add_lane(page, 'Divisor')
    check('Divider lane renders a separator', cell(page, divider, stages[0]).locator('hr').count() == 1)
    emotion = add_lane(page, 'Emoções')
    cell(page, emotion, stages[0]).get_by_role('button', name='Satisfeito', exact=True).click()
    check('Emotion lane updates the actual service stage', graph(page)['stages'][stages[0]]['emotion'] == 'positive')
    linked = add_lane(page, '+ Ações do cliente')
    cell(page, linked, stages[0]).get_by_role('textbox').fill('Cliente solicita ajuda')
    check('Service lane edits the canonical customer action', graph(page)['stages'][stages[0]]['customerAction'] == 'Cliente solicita ajuda')
    # Cancellation, deletion and history are tested after many independent edits.
    page.once('dialog', lambda dialog: dialog.dismiss())
    actions(page, duplicate_id, 'Excluir faixa…')
    check('Cancelling lane deletion preserves it', any(x['id'] == duplicate_id for x in lanes(page)))
    page.once('dialog', lambda dialog: dialog.accept())
    actions(page, duplicate_id, 'Excluir faixa…')
    check('Confirmed deletion removes only the chosen lane', not any(x['id'] == duplicate_id for x in lanes(page)) and graph(page)['stages'][stages[0]]['customerAction'] == 'Cliente solicita ajuda')
    editor.focus(); page.keyboard.press('Control+z')
    check('Keyboard undo restores the lane and all its cards', any(x['id'] == duplicate_id and x['cardItems'][stages[0]][0]['content'] == 'Só na cópia' for x in lanes(page)))
    page.keyboard.press('Control+Shift+z')
    check('Keyboard redo reapplies lane deletion', not any(x['id'] == duplicate_id for x in lanes(page)))
    editor.get_by_role('button', name='Desfazer', exact=True).click()
    page.get_by_role('button', name='Ações da etapa Solicitação', exact=True).click()
    page.get_by_role('button', name='Mover Solicitação para direita', exact=True).click()
    check('Stage controls reorder the canonical Journey', current(page)['stageIds'] == [stages[1], stages[0], stages[2]])
    editor.get_by_role('button', name='Desfazer', exact=True).click()
    page.once('dialog', lambda dialog: dialog.accept())
    page.get_by_role('button', name='Ações da etapa Retorno', exact=True).click()
    page.get_by_role('button', name='Remover Retorno', exact=True).click()
    check('Removing a stage also removes its lane cells', stages[2] not in current(page)['stageIds'] and all(stages[2] not in lane.get('cardItems', {}) for lane in lanes(page)))
    editor.get_by_role('button', name='Desfazer', exact=True).click()
    check('Undo restores a deleted stage together with its cards', current(page)['stageIds'] == stages and next(x for x in lanes(page) if x['id'] == text_id)['cardItems'][stages[2]][0]['content'] == 'Cartão da etapa 3')
    page.get_by_role('button', name='Ações da etapa Solicitação', exact=True).click()
    page.get_by_role('button', name='Detalhes de Solicitação', exact=True).click()
    details = page.get_by_role('complementary', name='Editar etapa Solicitação', exact=True)
    details.get_by_label('Novo ponto de contato', exact=True).fill('Central de ajuda')
    details.get_by_role('button', name='Adicionar ponto de contato', exact=True).click()
    details.get_by_role('button', name='Registrar descoberta', exact=True).click()
    details.get_by_label('Tipo de descoberta', exact=True).select_option('need')
    details.get_by_placeholder('O que você descobriu?', exact=True).fill('Receber retorno do atendimento')
    details.get_by_role('button', name='Registrar', exact=True).click()
    check('Context capture creates a canonical need and touchpoint', len(graph(page)['stages'][stages[0]]['needIds']) == 1 and len(graph(page)['stages'][stages[0]]['touchpointIds']) == 1)
    details.get_by_text('Relacionar informações existentes', exact=True).click()
    need = details.get_by_role('checkbox', name='Receber retorno do atendimento', exact=True)
    need.uncheck()
    check('Unlinking a need preserves its service record', not graph(page)['stages'][stages[0]]['needIds'] and len(graph(page)['entities']['need']) == 1)
    need.check()
    details.get_by_role('button', name='Fechar detalhes', exact=True).click()
    before_reload = current(page)['mapLayout']
    expect(editor.locator('.bo-h1705-saving')).to_contain_text('Salvo neste dispositivo')
    page.reload(wait_until='networkidle')
    check('Reload preserves all cards, settings and lane order', graph(page)['journeys'][jid]['mapLayout'] == before_reload)
    expect(sidebar).to_have_attribute('data-sidebar-collapsed', '1')
    check('Sidebar stays collapsed after reload', page.get_by_role('button', name='Expandir sidebar', exact=True).is_visible())
    page.get_by_role('button', name='Continuar projeto', exact=True).click()
    page.get_by_role('button', name='Abrir serviço', exact=True).click()
    page.locator('.bo-h1704-recent-card').filter(has_text='Atendimento configurável').click()
    expect(editor).to_be_visible()
    # Journey, library and service navigation must not rewrite the document.
    page.get_by_role('button', name='Todas as Jornadas', exact=True).click()
    page.get_by_role('button', name='Abrir Journey', exact=True).click()
    editor.get_by_role('button', name=re.compile('^Visualizações')).click()
    editor.get_by_role('button', name='Voltar ao serviço', exact=True).click()
    page.locator('.bo-h1704-recent-card').filter(has_text='Atendimento configurável').click()
    check('Library and service navigation retain the latest map', current(page)['mapLayout'] == before_reload)
    page.once('dialog', lambda dialog: dialog.accept())
    editor.get_by_role('button', name='Blueprint', exact=True).click()
    expect(page.locator('.bo1174-board')).to_be_visible()
    boards = [x for x in graph(page)['views']['whiteboards'].values() if x.get('viewKind') == 'blueprint']
    check('Blueprint draft shares Journey identity and stages', len(boards) == 1 and boards[0]['journeyId'] == jid and graph(page)['journeys'][jid]['stageIds'] == stages)
    check('Opening a draft preserves custom lanes and canonical action', graph(page)['journeys'][jid]['mapLayout'] == before_reload and graph(page)['stages'][stages[0]]['customerAction'] == 'Cliente solicita ajuda')
    page.screenshot(path=str(OUT / 'journey-blueprint.png'))
    page.get_by_role('button', name='Voltar para Blueprints', exact=True).click()
    page.get_by_role('button', name='Design do serviço', exact=True).click()
    page.locator('.bo-h1704-recent-card').filter(has_text='Atendimento configurável').click()
    editor.get_by_role('button', name='Ampliar mapa', exact=True).click()
    check('Expanded map fits the viewport', editor.bounding_box()['y'] == 0 and editor.bounding_box()['height'] == page.viewport_size['height'])
    page.screenshot(path=str(OUT / 'journey-desktop.png'))

def responsive(page):
    project(page)
    editor = page.locator('.bo-h1705-journey')
    sid = stage(page, 'Solicitação')
    lid = add_lane(page, 'Texto')
    card(page, lid, sid, 'Construção em tela menor')
    check('Small screen can create and edit a stage and card', lanes(page)[0]['cardItems'][sid][0]['content'] == 'Construção em tela menor')
    box, footer = editor.bounding_box(), page.locator('.bo-h1705-bottom-bar').bounding_box()
    check('Editor and zoom footer fit the screen', box['width'] <= page.viewport_size['width'] and footer['y'] + footer['height'] <= page.viewport_size['height'] + 1)
    actions(page, lid, 'Propriedades')
    expect(page.locator('.bo-j2-lane-inspector')).to_be_visible()
    check('Context panel fits a small viewport', page.locator('.bo-j2-lane-inspector').bounding_box()['width'] <= page.viewport_size['width'])
    check('Fixed map headings do not cover the context panel', page.locator('.bo-j2-lane-inspector header strong').evaluate("e => {const r=e.getBoundingClientRect();return Boolean(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.bo-j2-lane-inspector'));}"))
    page.screenshot(path=str(OUT / f'journey-{page.viewport_size["width"]}.png'))

def templates(page):
    project(page)
    page.get_by_role('button', name='Todas as Jornadas', exact=True).click()
    page.get_by_role('button', name='Criar Journey', exact=True).first.click()
    page.locator('.bo-h1704-template-grid > button').nth(1).click()
    check('A chosen template supplies editable stages', len(current(page)['stageIds']) > 0)
    check('Default Journey names distinguish successive maps', current(page)['name'] == 'Nova Jornada (2)')
    page.get_by_role('textbox', name='Nome da etapa 1', exact=True).fill('Etapa adaptada ao serviço')
    check('Template stage names are editable', graph(page)['stages'][current(page)['stageIds'][0]]['title'] == 'Etapa adaptada ao serviço')
    first_stage = current(page)['stageIds'][0]
    lid = add_lane(page, 'Texto'); card(page, lid, first_stage, 'Cliente busca uma solução')
    sub = add_lane(page, 'Subetapas'); card(page, sub, first_stage, 'Comparar opções de atendimento')
    page.locator('.bo-h1705-scroll').evaluate('e => { e.scrollLeft = 0; e.scrollTop = 0; }')
    page.screenshot(path=str(OUT / 'journey-simple-expanded-sidebar.png'))
    page.get_by_role('button', name='Recolher sidebar', exact=True).click()
    expect(page.locator('aside[data-bo-precision-sidebar-native="1"]')).to_have_css('width', '64px')
    page.screenshot(path=str(OUT / 'journey-simple-collapsed-sidebar.png'))
    page.get_by_role('button', name='Todas as Jornadas', exact=True).click()
    previews = page.locator('.bo-h724-journey-card > img').evaluate_all('(images) => images.map(image => image.src)')
    check('Journey library previews reflect different saved maps', len(previews) == 2 and previews[0] != previews[1] and all(src.startswith('data:image/svg+xml') for src in previews))
    page.screenshot(path=str(OUT / 'journey-library.png'))

def accessibility(page, flow):
    axe = os.environ.get('AXE_PATH')
    if not axe or not page.locator('.bo-h1705-journey').count(): return
    page.add_script_tag(path=axe)
    report = page.evaluate("""async () => { const r = await axe.run({include:[['.bo-h1705-journey']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}); return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})); }""")
    (OUT / f'{flow}-accessibility.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    check(flow + ' has no automated WCAG A/AA violations in the Journey editor', not report)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

server = None
URL = os.environ.get('BLUE_OCEAN_URL')
if not URL:
    if not (ROOT / 'dist' / 'build-manifest.json').exists():
        raise SystemExit('Build first: npm run build')
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT / 'dist')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    URL = f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as p:
        executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser')
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'], **({'executable_path': executable} if executable else {}))
        for name, flow, width, height in [('desktop', desktop, 1440, 1000), ('tablet', responsive, 820, 1180), ('mobile', responsive, 390, 844), ('templates', templates, 1920, 1200)]:
            if name not in os.environ.get('JOURNEY_QA_FLOWS', 'desktop,tablet,mobile,templates').split(','): continue
            context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=name in ['tablet', 'mobile'], is_mobile=name == 'mobile')
            page = context.new_page(); page.set_default_timeout(10000)
            errors = []; page.on('pageerror', lambda error: errors.append(str(error)))
            try:
                flow(page)
                accessibility(page, name)
                check(name + ' has no JavaScript errors', not errors)
            except Exception:
                failures.append({'flow': name, 'traceback': traceback.format_exc(), 'pageErrors': errors})
                print(failures[-1]['traceback'], flush=True)
                page.screenshot(path=str(OUT / f'{name}-failure.png'))
            context.close()
        browser.close()
finally:
    if server: server.shutdown(); server.server_close()
(OUT / 'result.json').write_text(json.dumps({'checks': checks, 'failures': failures}, ensure_ascii=False, indent=2) + '\n')
print(f'Journey editor: {sum(c["passed"] for c in checks)}/{len(checks)} checks; {len(failures)} failed workflows')
raise SystemExit(1 if failures or any(not item['passed'] for item in checks) else 0)

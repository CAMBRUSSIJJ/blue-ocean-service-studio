#!/usr/bin/env python3
"""Real UI regression for the Whiteboard → Blueprint workflow.

Requires Python Playwright and Chromium. With BLUE_OCEAN_URL, test that server;
otherwise serve this checkout's dist in a temporary local HTTP server.
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
OUT = ROOT / 'artifacts' / 'editor-ux'
OUT.mkdir(parents=True, exist_ok=True)
for stale_failure in OUT.glob('*-failure.png'):
    stale_failure.unlink()
checks = []
failures = []

def check(name, condition):
    checks.append({'name': name, 'passed': bool(condition)})
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)
    if not condition:
        raise AssertionError(name)

def graph(page):
    return page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').get()")

def project(page):
    page.goto(URL, wait_until='domcontentloaded')
    page.get_by_role('button', name='Abrir workspace local sem conta').click()
    page.get_by_role('button', name='Novo projeto', exact=True).click()
    page.get_by_label('Nome do projeto', exact=True).fill('Editor UX QA')
    page.get_by_label('Serviço principal', exact=True).fill('Atendimento ao cliente')
    page.get_by_role('button', name='Criar projeto', exact=True).click()
    page.get_by_role('button', name='Abrir serviço', exact=True).click()

def open_whiteboard(page):
    project(page)
    page.get_by_role('button', name='Whiteboard', exact=True).click()
    page.get_by_label('Nome do quadro', exact=True).fill('Ideias do atendimento')
    page.get_by_role('button', name='Criar e começar', exact=True).click()
    expect(page.locator('.bo1174-board')).to_be_visible()

def note(page, text):
    page.locator('.rt144-tool[aria-label="Post-it"]').click()
    editor = page.locator('.bo1193-inline-rename')
    expect(editor).to_be_visible()
    editor.fill(text)
    editor.press('Enter')
    expect(page.locator('.bo1193-inline-rename')).to_have_count(0)

def whiteboard_flow(page):
    open_whiteboard(page)
    check('Canvas occupies the available workspace', page.locator('.rt144-view').bounding_box()['height'] > 650)
    check('Editor starts at the top of the viewport', page.locator('.bo1174-board').bounding_box()['y'] == 0)
    check('Application behind the editor is inert', page.locator('#root').evaluate('e => e.inert'))
    check('No persona prerequisite in the first-use prompt', 'Persona e Problema' not in page.locator('.bo1174-board').inner_text())
    source_id = next(iter(graph(page)['views']['whiteboards']))
    note(page, 'Cliente solicita suporte')
    note(page, 'Equipe verifica o pedido')
    source = graph(page)['views']['whiteboards'][source_id]
    ids = list(source['items'])
    check('Two notes created through visible controls', len(ids) == 2)
    check('Inline text saved to the actual document', [x['text'] for x in source['items'].values()] == ['Cliente solicita suporte', 'Equipe verifica o pedido'])
    check('Simple note creation keeps the inspector closed', page.locator('.rt144-inspector').count() == 0)
    check('Created objects are visible', all(page.locator(f'.rt144-item[data-id="{id}"]').is_visible() for id in ids))
    # Undo typing, then creation; redo both operations.
    page.get_by_role('button', name='Desfazer', exact=True).click()
    page.get_by_role('button', name='Desfazer', exact=True).click()
    check('Undo removes the last created note', len(graph(page)['views']['whiteboards'][source_id]['items']) == 1)
    page.get_by_role('button', name='Refazer', exact=True).click()
    page.get_by_role('button', name='Refazer', exact=True).click()
    check('Redo restores the note and text', graph(page)['views']['whiteboards'][source_id]['items'][ids[1]]['text'] == 'Equipe verifica o pedido')
    # A real drag, followed by resizing a handle, must change document geometry.
    card = page.locator(f'.rt144-item[data-id="{ids[1]}"]')
    box = card.bounding_box()
    before_move = graph(page)['views']['whiteboards'][source_id]['items'][ids[1]]
    page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    page.mouse.down()
    page.mouse.move(box['x'] + box['width'] / 2 + 96, box['y'] + box['height'] / 2 + 72, steps=8)
    page.mouse.up()
    moved = graph(page)['views']['whiteboards'][source_id]['items'][ids[1]]
    check('Dragging a note changes its position', (moved['x'], moved['y']) != (before_move['x'], before_move['y']))
    handle = page.locator(f'.rt144-item[data-id="{ids[1]}"] .resize-handle')
    rect = handle.bounding_box()
    page.mouse.move(rect['x'] + rect['width'] / 2, rect['y'] + rect['height'] / 2)
    page.mouse.down()
    page.mouse.move(rect['x'] + 65, rect['y'] + 45, steps=6)
    page.mouse.up()
    resized = graph(page)['views']['whiteboards'][source_id]['items'][ids[1]]
    check('Resize handles change note dimensions', (resized['width'], resized['height']) != (moved['width'], moved['height']))
    source = graph(page)['views']['whiteboards'][source_id]
    first = page.locator(f'.rt144-item[data-id="{ids[0]}"]')
    second = page.locator(f'.rt144-item[data-id="{ids[1]}"]')
    first.click()
    page.locator('.rt190-context-toolbar').get_by_role('button', name='Conectar', exact=True).focus()
    page.keyboard.press('Enter')
    second.click()
    check('Connecting through the UI persists an edge', len(graph(page)['views']['whiteboards'][source_id]['edges']) == 1)
    second.press('Enter')
    inspector = page.locator('.rt144-inspector')
    expect(inspector).to_be_visible()
    colors = inspector.locator('.rt144-colors button').evaluate_all('nodes => nodes.map(node => getComputedStyle(node).backgroundColor)')
    check('Simple inspector displays distinct color swatches', len(set(colors)) > 3)
    footer = page.locator('.bo1174-statusbar').bounding_box()
    check('Inspector keeps navigation controls inside the usable canvas', footer['x'] >= 0 and footer['x'] + footer['width'] <= inspector.bounding_box()['x'])
    inspector.locator('.rt144-x').click()
    first.click()
    second.click(modifiers=['Shift'])
    page.get_by_role('button', name='Organizar em Blueprint', exact=True).first.click()
    dialog = page.get_by_role('dialog', name='Organizar em Blueprint', exact=True)
    expect(dialog).to_be_visible()
    dialog.get_by_role('button', name='Cancelar', exact=True).click()
    check('Cancel leaves source objects free', all(x['kind'] == 'free' for x in graph(page)['views']['whiteboards'][source_id]['items'].values()))
    check('Cancel creates no Blueprint', len(graph(page)['views']['whiteboards']) == 1)
    page.get_by_role('button', name='Organizar em Blueprint', exact=True).first.click()
    dialog = page.get_by_role('dialog', name='Organizar em Blueprint', exact=True)
    dialog.get_by_label('Nome do Blueprint', exact=True).fill('Operação do atendimento')
    dialog.locator('textarea[name=stages]').fill('Solicitação\nAnálise')
    dialog.get_by_label('Camada de Cliente solicita suporte', exact=True).select_option('customer')
    dialog.get_by_label('Etapa de Cliente solicita suporte', exact=True).select_option('0')
    dialog.get_by_label('Camada de Equipe verifica o pedido', exact=True).select_option('backstage')
    dialog.get_by_label('Etapa de Equipe verifica o pedido', exact=True).select_option('1')
    dialog.get_by_role('button', name='Criar Blueprint', exact=True).click()
    expect(dialog).to_have_count(0)
    current = graph(page)
    target = next(x for x in current['views']['whiteboards'].values() if x['viewKind'] == 'blueprint')
    target_id = target['id']
    original = current['views']['whiteboards'][source_id]
    check('Blueprint retains its Whiteboard origin', target['sourceBoardId'] == source_id)
    check('Source layout is preserved', all((source['items'][id]['x'], source['items'][id]['y']) == (original['items'][id]['x'], original['items'][id]['y']) for id in ids))
    check('Linked views reference the same canonical entities', all(any(x.get('objectId') == original['items'][id].get('objectId') for x in target['items'].values()) for id in ids))
    check('Blueprint keeps the selected connection', len(target['edges']) == 1)
    check('Blueprint has the reviewed stages', len(current['journeys'][target['journeyId']]['stageIds']) == 2)
    page.screenshot(path=str(OUT / 'blueprint-from-selection.png'), full_page=False)
    page.get_by_role('button', name='Desfazer', exact=True).click()
    check('Organization is undone in one action', target_id not in graph(page)['views']['whiteboards'])
    check('Undo restores original free notes', all(x['kind'] == 'free' for x in graph(page)['views']['whiteboards'][source_id]['items'].values()))
    page.get_by_role('button', name='Refazer', exact=True).click()
    check('Redo restores the same Blueprint', target_id in graph(page)['views']['whiteboards'])
    page.get_by_role('button', name='Opções', exact=True).click()
    page.get_by_role('button', name=re.compile('Quadro de origem')).click()
    expect(page.locator('.bo1174-board')).to_be_visible()
    first = page.locator(f'.rt144-item[data-id="{ids[0]}"]')
    first.dblclick()
    page.locator('.bo1193-inline-rename').fill('Cliente envia mensagem')
    page.locator('.bo1193-inline-rename').press('Enter')
    updated = graph(page)
    entity = updated['views']['whiteboards'][source_id]['items'][ids[0]]
    check('Editing a linked source updates shared content', updated['entities'][entity['objectKind']][entity['objectId']]['title'] == 'Cliente envia mensagem')
    stage_id = updated['entities'][entity['objectKind']][entity['objectId']]['stageId']
    check('Customer action stays consistent with its stage', updated['stages'][stage_id]['customerAction'] == 'Cliente envia mensagem')
    page.screenshot(path=str(OUT / 'whiteboard-linked.png'), full_page=False)
    page.get_by_role('button', name='Voltar para Whiteboards', exact=True).click()
    expect(page.locator('.bo1174-board')).to_have_count(0)
    check('Application becomes interactive after leaving the editor', not page.locator('#root').evaluate('e => e.inert'))
    page.reload(wait_until='domcontentloaded')
    page.get_by_role('button', name='Continuar projeto', exact=True).click()
    page.get_by_role('button', name='Abrir serviço', exact=True).click()
    restored = graph(page)
    check('Both documents survive browser reload', source_id in restored['views']['whiteboards'] and target_id in restored['views']['whiteboards'])
    check('Linked content survives browser reload', restored['entities'][entity['objectKind']][entity['objectId']]['title'] == 'Cliente envia mensagem')
    # Queries of permissions must not initialize state or trigger writes.
    check('Permission queries are read-only', page.evaluate("""() => {const bridge=window.BlueOceanRuntime.api('dataBridge'),c=window.BlueOceanRuntime.api('collaboration');const before=bridge.get().persistenceRevision;for(let i=0;i<20;i++){c.can('edit');c.currentRole()}return bridge.get().persistenceRevision===before;}"""))
    # The library shortcut must select Blueprints even if the workspace was on Whiteboard.
    page.get_by_role('button', name='Whiteboard', exact=True).click()
    if page.get_by_role('button', name='Cancelar', exact=True).is_visible():
        page.get_by_role('button', name='Cancelar', exact=True).click()
    page.get_by_role('button', name='Ir para Blueprints', exact=True).click()
    expect(page.get_by_role('button', name='Criar Blueprint', exact=True).first).to_be_visible()
    check('Library shortcut opens the Blueprint tab', page.get_by_role('button', name='Criar Blueprint', exact=True).first.is_visible())

def blueprint_flow(page):
    project(page)
    page.get_by_role('button', name='Blueprints', exact=True).click()
    page.get_by_role('button', name='Criar Blueprint', exact=True).first.click()
    expect(page.locator('.bo1174-board')).to_be_visible()
    check('Blueprint uses the entire viewport and hides application chrome', page.locator('.bo1174-board').bounding_box()['y'] == 0 and page.locator('.bo1174-board').bounding_box()['width'] == page.viewport_size['width'] and page.locator('#root').evaluate('e => e.inert && getComputedStyle(e).visibility === "hidden"'))
    check('Blueprint groups hand, selection and history in one floating dock', page.locator('.bo1174-statusbar .bo1174-toolrail .rt144-tool').count() == 2 and page.locator('.bo1174-statusbar').get_by_role('button', name='Desfazer', exact=True).count() == 1 and page.locator('.bo1174-board-header').get_by_role('button', name='Desfazer', exact=True).count() == 0)
    check('Blueprint starts with only two essential canvas tools', page.locator('.bo1174-toolrail .rt144-tool').count() == 2)
    check('Blueprint header groups secondary actions in one menu', page.locator('.bo1174-board-header button').count() <= 7 and page.get_by_role('button', name='Opções', exact=True).is_visible())
    page.get_by_role('button', name='Opções', exact=True).click()
    options = page.get_by_role('dialog', name='Ferramentas do editor', exact=True)
    check('Advanced Blueprint tools start collapsed', not options.locator('.bo-simple-advanced').evaluate('e => e.open'))
    options.get_by_role('button', name=re.compile('^.*Como montar o Blueprint')).click()
    guide = page.get_by_role('dialog', name='Como montar o Blueprint', exact=True)
    check('A short guide explains stages, visible service and backstage', guide.locator('li').count() == 3)
    guide.get_by_role('button', name='Entendi, começar', exact=True).click()
    page.get_by_role('button', name='Opções', exact=True).click()
    page.locator('.bo-simple-advanced > summary').click()
    page.get_by_role('button', name=re.compile('Modo profissional')).click()
    check('Advanced tools remain available on request', page.locator('.bo1174-toolrail .rt144-tool').count() == 9)
    page.get_by_role('button', name='Opções', exact=True).click()
    page.locator('.bo-simple-advanced > summary').click()
    page.get_by_role('button', name=re.compile('Modo guiado')).click()
    check('User can return to the essential tools', page.locator('.bo1174-toolrail .rt144-tool').count() == 2)

    check('Fresh Blueprint has a visible canvas', page.locator('.rt144-view').bounding_box()['height'] > 650)
    check('Empty Blueprint offers a next step', page.get_by_role('button', name='Adicionar primeira etapa', exact=True).is_visible())
    page.get_by_role('button', name='Adicionar etapa', exact=True).click()
    dialog = page.get_by_role('dialog', name='Nova etapa', exact=True)
    dialog.get_by_placeholder('Ex.: Pagamento', exact=True).fill('Solicitar atendimento')
    dialog.get_by_placeholder('Ex.: escolhe uma forma de pagamento', exact=True).fill('Envia uma mensagem')
    dialog.get_by_role('button', name='Criar etapa', exact=True).click()
    page.locator('.bo1203-service-cell[data-layer=frontstage]').click(position={'x': 80, 'y': 90})
    entry = page.get_by_role('textbox', name='Frontstage · Solicitar atendimento', exact=True)
    entry.fill('Atendente confirma recebimento')
    entry.press('Enter')
    current = graph(page)
    check('Cell editing creates an activity in its stage', any(x.get('title') == 'Atendente confirma recebimento' for x in current['entities'].get('frontstage', {}).values()))
    page.locator('.bo1203-service-cell[data-layer=backstage] .bo1203-cell-add').click()
    entry = page.get_by_role('textbox', name='Backstage · Solicitar atendimento', exact=True)
    entry.fill('Verificar cadastro')
    entry.press('Escape')
    check('Escape cancels a cell edit', not any(x.get('title') == 'Verificar cadastro' for x in graph(page)['entities'].get('backstage', {}).values()))
    check('No diagnostic percentage in the shared header', 'Readiness' not in page.locator('.bo1174-board-header').inner_text())
    page.keyboard.press('Escape')
    page.screenshot(path=str(OUT / 'blueprint-simple.png'), full_page=False)
    if os.environ.get('AXE_PATH'):
        page.add_script_tag(path=os.environ['AXE_PATH'])
        violations = page.evaluate("async () => (await axe.run({include:[['.bo1174-board']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v => ({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))")
        (OUT / 'blueprint-accessibility.json').write_text(json.dumps(violations, ensure_ascii=False, indent=2))
        check('Simplified Blueprint has no automated WCAG A/AA violations', not violations)

    page.get_by_role('button', name='Opções', exact=True).click()
    page.get_by_role('button', name=re.compile('Visualizações Trocar')).click()
    views = page.get_by_role('dialog', name='Vistas do Blueprint', exact=True)
    expect(views).to_be_visible()
    check('Blueprint picker uses two clearly named views', views.locator('.rt154-view-card').count() == 2 and 'Matriz detalhada' in views.inner_text() and 'Service Frame' not in views.inner_text())
    page.keyboard.press('Escape')
    expect(views).to_have_count(0)
    page.locator('.bo1174-board').focus()
    viewport = page.locator('.rt144-view').bounding_box()
    page.keyboard.down('Space')
    page.mouse.move(viewport['x'] + 1000, viewport['y'] + 600)
    page.mouse.down()
    page.mouse.move(viewport['x'] + 400, viewport['y'] + 200, steps=8)
    page.mouse.up()
    page.keyboard.up('Space')
    check('Blueprint keeps stage and lane labels while panning', page.locator('.bo-editor-sticky-stage').count() > 0 and page.locator('.bo-editor-sticky-lane').count() > 0)
    page.screenshot(path=str(OUT / 'blueprint-inline.png'), full_page=False)

def tablet_flow(page):
    open_whiteboard(page)
    check('Tablet canvas remains usable', page.locator('.rt144-view').bounding_box()['height'] > 700)
    note(page, 'Anotação no tablet')
    check('Tablet can create visible content', page.locator('.rt144-item.card').first.is_visible())
    page.screenshot(path=str(OUT / 'tablet-whiteboard.png'), full_page=False)

def mobile_flow(page):
    open_whiteboard(page)
    check('Mobile declares its reading mode', 'Modo leitura' in page.locator('.bo1174-board-header').inner_text())
    check('Mobile canvas has available height', page.locator('.rt144-view').bounding_box()['height'] > 500)
    check('Mobile hides editing tools', page.locator('.rt144-tool[aria-label="Post-it"]').count() == 0)
    check('Mobile viewport fits the screen', page.locator('.bo1174-board').bounding_box()['width'] <= 391)
    check('Mobile keeps comments available', page.get_by_role('button', name='Comentar', exact=True).is_visible())
    page.screenshot(path=str(OUT / 'mobile-whiteboard.png'), full_page=False)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

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
        options = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage']}
        if executable:
            options['executable_path'] = executable
        browser = p.chromium.launch(**options)
        for name, flow, width, height in [('whiteboard', whiteboard_flow, 1440, 1000), ('blueprint', blueprint_flow, 1440, 1000), ('tablet', tablet_flow, 820, 1180), ('mobile', mobile_flow, 390, 844)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=name == 'mobile', has_touch=name in ['mobile', 'tablet'])
            page = context.new_page()
            page.set_default_timeout(10000)
            page_errors = []
            page.on('pageerror', lambda error: page_errors.append(error.stack or str(error)))
            try:
                flow(page)
                check(name + ' has no JavaScript errors', not page_errors)
            except Exception:
                failures.append({'flow': name, 'traceback': traceback.format_exc(), 'pageErrors': page_errors})
                print(failures[-1]['traceback'], flush=True)
                page.screenshot(path=str(OUT / f'{name}-failure.png'), full_page=False)
            context.close()
        browser.close()
finally:
    if server:
        server.shutdown()
        server.server_close()

(OUT / 'result.json').write_text(json.dumps({'checks': checks, 'failures': failures}, ensure_ascii=False, indent=2) + '\n')
print(f'Editor UX: {sum(c["passed"] for c in checks)}/{len(checks)} checks; {len(failures)} failed workflows')
raise SystemExit(1 if failures or any(not check['passed'] for check in checks) else 0)

#!/usr/bin/env python3
"""Exercise Studio's native maps, spatial transactions and real WebGL under the Linux CSP."""
import ast
import base64
import functools
import hashlib
import http.server
import json
import os
import re
import shutil
import threading
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
from map_browser_support import wait_saved, use_matrix

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'service-spaces'
OUT.mkdir(parents=True, exist_ok=True)
server = None
URL = os.environ.get('BO_SPACES_URL')
if not URL:
    tree = ast.parse((ROOT / 'scripts/serve-linux.py').read_text())
    nodes = [next(node for node in tree.body if isinstance(node, kind) and node.name == name)
             for kind, name in [(ast.FunctionDef, 'editor_inline_script_hashes'), (ast.ClassDef, 'HardenedHandler')]]
    namespace = {'http': http, 'base64': base64, 'hashlib': hashlib, 're': re, 'urlsplit': urlsplit, 'EDITOR_PATH': '/blueprint-reference-original.html'}
    exec(compile(ast.Module(body=nodes[:1], type_ignores=[]), 'serve-linux.py', 'exec'), namespace)
    namespace['EDITOR_SCRIPT_HASHES'] = namespace['editor_inline_script_hashes'](ROOT / 'dist/blueprint-reference-original.html')
    exec(compile(ast.Module(body=nodes[1:], type_ignores=[]), 'serve-linux.py', 'exec'), namespace)
    class Quiet(namespace['HardenedHandler']):
        def log_message(self, *_args): pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    URL = f'http://127.0.0.1:{server.server_port}'

checks = []
def check(name, condition):
    assert condition, name
    checks.append(name)
    print('PASS ' + name, flush=True)
def graph(page): return page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').get()")
def editor(page): return page.frame_locator('.bo-service-spaces__frame')
def workspace(page, jid): return graph(page)['service']['spatialDesign']['workspaces'][jid]
def create_project(page, title):
    page.get_by_role('button', name='Novo projeto', exact=True).click()
    page.get_by_label('Nome do projeto', exact=True).fill(title)
    page.get_by_label('Serviço principal', exact=True).fill('Atendimento QA')
    page.get_by_role('button', name='Criar projeto', exact=True).click()
def open_spaces(page, jid=None):
    page.get_by_role('button', name='Abrir Salas e 3D', exact=True).click()
    if jid: page.get_by_label('Mapa para organizar as salas', exact=True).select_option(jid)
    expect(page.locator('.bo-service-spaces__status')).to_contain_text('sincronizados')
    return editor(page)
def add_room(page, name, mobile=False):
    f = editor(page)
    if mobile:
        if f.locator('.hybrid-right-dock').is_visible(): f.locator('#hybrid-mobile-properties').click()
        f.locator('[data-site-create]').first.click()
    else: f.locator('#room-tab-add').click()
    f.locator('#room-create-dialog-name').fill(name)
    f.locator('#room-create-form button[type="submit"]').click()
    page.wait_for_function("name => Object.values(window.BlueOceanRuntime.api('dataBridge').get().service.spatialDesign?.workspaces||{}).some(w=>w.environments.some(r=>r.name===name))", arg=name)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1080}, accept_downloads=True)
        errors, csp = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: csp.append(message.text) if message.type == 'error' and 'Content Security Policy' in message.text else None)
        page.goto(URL, wait_until='networkidle')
        page.get_by_role('button', name='Abrir workspace local sem conta', exact=True).click()
        create_project(page, 'Espaços QA')
        page.get_by_role('button', name='Abrir Mapas do serviço', exact=True).click()
        page.get_by_role('button', name='Criar mapa', exact=True).click()
        page.get_by_role('button', name=re.compile(r'^Em branco')).click()
        f = page.frame_locator('.bo-blueprint-reference-frame')
        wait_saved(f); use_matrix(f)
        f.get_by_role('button', name='Adicionar etapa', exact=True).click()
        f.get_by_role('textbox', name='Nome da nova etapa', exact=True).fill('Chegada')
        f.get_by_role('button', name='Adicionar etapa ao mapa', exact=True).click()
        f.get_by_label('Faixas: escolher modelo de visualização', exact=True).click()
        f.get_by_role('button', name='Visão operacional', exact=False).click()
        for key, title in [('ac|0', 'Chegar ao atendimento'), ('fl|0', 'Acolher e orientar o cliente')]:
            f.locator(f'[data-cell="{key}"] .ad').click()
            f.get_by_role('button', name='Adicionar Cartão', exact=True).click()
            field = f.locator(f'[data-cell="{key}"] [data-ed="c"]').last
            field.fill(title); field.press('Tab'); wait_saved(f)
        original = graph(page)
        jid = next(iter(original['journeys']))
        stage = original['journeys'][jid]['stageIds'][0]
        activity = original['journeys'][jid]['matrixContent']['cells'][stage]['fl'][0]['id']
        f.get_by_role('button', name='Voltar para mapas do serviço', exact=True).click()
        f = open_spaces(page, jid)
        expect(f.locator('[data-room-display="overview"]')).to_have_attribute('aria-selected', 'true')
        check('Native navigation opens the general plan without injecting demo data', not graph(page)['service'].get('spatialDesign'))
        f.locator('[data-room-display="cards"]').click()
        expect(f.locator(f'[data-room-node="{activity}"]')).to_be_visible()
        check('The activity board displays the existing canonical activity', f.get_by_text('Acolher e orientar o cliente', exact=True).count() > 0)
        add_room(page, 'Recepção integrada')
        rid = workspace(page, jid)['environments'][0]['id']
        f.locator(f'[data-room-move="{activity}"]').click()
        f.locator('#room-move-to').select_option(rid)
        f.locator('#room-move-confirm').click()
        page.wait_for_function("args => window.BlueOceanRuntime.api('dataBridge').get().service.spatialDesign.workspaces[args.jid].assignments[args.activity]===args.rid", arg={'jid': jid, 'activity': activity, 'rid': rid})
        check('Assigning an activity records its original map ID', workspace(page, jid)['assignments'][activity] == rid)
        check('Spatial editing preserves the source map and all canonical metadata', graph(page)['journeys'] == original['journeys'] and graph(page)['stages'] == original['stages'])
        f.locator('[data-room-display="three"]').click()
        expect(f.locator('.room3d-canvas')).to_be_visible(timeout=20000)
        check('A real WebGL canvas renders the selected room', f.locator('.room3d-canvas').evaluate('canvas => canvas.width > 0 && canvas.height > 0'))
        f.locator('.studio-more-actions summary').click()
        f.locator('#floor-auto').click()
        page.wait_for_function("jid => window.BlueOceanRuntime.api('dataBridge').get().service.spatialDesign.workspaces[jid].floorplan.objects.length>0", arg=jid)
        check('Furnishing the room stores geometry linked to the same activity', any(obj['nodeId'] == activity for obj in workspace(page, jid)['floorplan']['objects']))
        f.locator('#floor-undo').click()
        page.wait_for_function("jid => window.BlueOceanRuntime.api('dataBridge').get().service.spatialDesign.workspaces[jid].floorplan.objects.length===0", arg=jid)
        page.get_by_role('button', name='Refazer', exact=True).click()
        page.wait_for_function("jid => window.BlueOceanRuntime.api('dataBridge').get().service.spatialDesign.workspaces[jid].floorplan.objects.length>0", arg=jid)
        check('Native undo and redo restore the spatial transaction', len(workspace(page, jid)['floorplan']['objects']) > 0)
        page.get_by_role('button', name='Ampliar editor', exact=True).click()
        expect(page.get_by_role('button', name='Sair da tela cheia', exact=True)).to_be_visible()
        page.screenshot(path=str(OUT / 'room-3d-desktop.png'), animations='disabled')
        page.get_by_role('button', name='Sair da tela cheia', exact=True).click()
        with page.expect_download() as download:
            page.get_by_role('button', name='Backup do projeto', exact=True).click()
        backup = json.loads(Path(download.value.path()).read_text())
        check('The native project backup includes the complete spatial state', backup['graph']['service']['spatialDesign'] == graph(page)['service']['spatialDesign'])
        add_room(page, 'Sala temporária')
        page.evaluate("backup => {window.__spacesImportPromise=window.BlueOceanRuntime.api('dataBridge').import(backup);}", backup)
        page.get_by_role('button', name='Substituir', exact=True).click()
        page.evaluate('() => window.__spacesImportPromise')
        check('The native import restores the exported rooms and removes later spatial edits', graph(page)['service']['spatialDesign'] == backup['graph']['service']['spatialDesign'])
        saved = workspace(page, jid)
        page.reload(wait_until='networkidle'); f = open_spaces(page, jid)
        check('Reload restores rooms, assignments and furniture from the same project', workspace(page, jid) == saved)
        page.get_by_role('button', name='Home', exact=True).first.click()
        create_project(page, 'Outro serviço QA')
        f = open_spaces(page)
        check('Switching to a new service does not leak rooms or activities', not graph(page)['service'].get('spatialDesign') and f.locator('[data-room-node]').count() == 0)
        page.locator('.bo1163-service-switcher').click()
        page.get_by_role('menuitem').filter(has_text='Espaços QA').click()
        f = open_spaces(page, jid)
        check('Returning to the original project restores its layout', workspace(page, jid) == saved)
        before_reopen = graph(page)['journeys'][jid]['matrixContent']
        f.locator('[data-room-display="cards"]').click()
        f.locator(f'.room-part[data-room-node="{activity}"]').click()
        expect(page.locator('.bo-blueprint-reference-frame')).to_be_visible()
        check('Editing a projected activity opens its native map', graph(page)['journeys'][jid]['matrixContent'] == before_reopen)
        page.frame_locator('.bo-blueprint-reference-frame').get_by_role('button', name='Voltar para mapas do serviço', exact=True).click()
        f = open_spaces(page, jid)
        # Exercise the host guard, including the case where a role changes after the iframe was loaded.
        # Update the provider without emitting a role-change event to simulate an in-flight permission revocation.
        page.evaluate("() => {window.__spacesOriginalCollaboration=window.BlueOceanRuntime.api('collaboration');window.__spacesCan=window.__spacesOriginalCollaboration.can;window.__spacesOriginalCollaboration.can=()=>false;}")
        f.locator('#room-tab-add').click(); f.locator('#room-create-dialog-name').fill('Não deve salvar')
        f.locator('#room-create-form button[type="submit"]').click()
        expect(page.locator('.bo-service-spaces__error')).to_contain_text('modo de leitura')
        check('Read-only permission rejects an optimistic iframe edit without changing data', workspace(page, jid) == saved)
        page.evaluate("() => {window.__spacesOriginalCollaboration.can=window.__spacesCan;window.dispatchEvent(new CustomEvent('rt-runtime-registered'));}")
        page.get_by_role('button', name='Abrir Mapas do serviço', exact=True).click(); f = open_spaces(page, jid)
        # Mobile uses the actual mobile navigation and room-creation controls.
        page.set_viewport_size({'width': 390, 'height': 844})
        page.get_by_role('button', name='Abrir Salas e 3D pelo atalho móvel', exact=True).click()
        f = editor(page)
        f.locator('[data-room-display="overview"]').click()
        check('The native screen and embedded editor fit a phone width', page.evaluate('document.documentElement.scrollWidth<=innerWidth') and f.locator('html').evaluate('document.documentElement.scrollWidth<=innerWidth'))
        add_room(page, 'Sala móvel', mobile=True)
        check('A room can be created and saved through mobile controls', any(room['name'] == 'Sala móvel' for room in workspace(page, jid)['environments']))
        check('The mobile property drawer has room for readable labels and controls', f.locator('.hybrid-right-dock').evaluate('element => {const box=element.getBoundingClientRect();return box.width>=280 && box.x>=0 && box.right<=innerWidth;}'))
        page.screenshot(path=str(OUT / 'properties-mobile.png'), full_page=True, animations='disabled')
        f.locator('#hybrid-mobile-properties').click()
        check('The mobile plan keeps a visible area for the rooms', f.locator('.site-scroll').evaluate('element=>element.clientHeight>=190'))
        page.screenshot(path=str(OUT / 'plan-mobile.png'), full_page=True, animations='disabled')
        check('The browser reports no uncaught application errors', not errors)
        check('The production Linux CSP allows all required editor scripts', not csp)
        (OUT / 'results.json').write_text(json.dumps({'checks': checks, 'errors': errors, 'csp': csp}, ensure_ascii=False, indent=2))
        browser.close()
finally:
    if server: server.shutdown()
print(f'Service spaces browser: {len(checks)}/{len(checks)} PASS', flush=True)

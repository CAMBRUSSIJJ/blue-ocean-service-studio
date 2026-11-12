#!/usr/bin/env python3
"""Exercise Salas e 3D inside the preserved H7.65 shell against the real build."""
import functools
import json
import os
import re
import shutil
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'salas-production'
OUT.mkdir(parents=True, exist_ok=True)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Navigation can cancel a response from the previous iframe.

server = None
URL = os.environ.get('BLUE_OCEAN_URL')
if not URL:
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    URL = f'http://127.0.0.1:{server.server_port}'

checks = []
def check(name, condition=True):
    assert condition, name
    checks.append(name)
    print('PASS ' + name, flush=True)

def graph(page):
    return page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').get()")

def open_spaces(page):
    sidebar = page.locator('[data-native-sidebar-replacement="true"]')
    heading = sidebar.get_by_role('button', name='Desenho do serviço', exact=True)
    if heading.get_attribute('aria-expanded') == 'false':
        heading.click()
    sidebar.get_by_role('button', name='Salas e 3D', exact=True).click()
    expect(page.locator('.bo-openplan-workspace__status')).to_contain_text('Planta do serviço pronta', timeout=45000)
    return page.frame_locator('.bo-openplan-workspace__frame')

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or None,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width':1600,'height':1000}, accept_downloads=True)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        try:
            page.goto(URL, wait_until='networkidle')
            page.get_by_role('button', name='Abrir workspace local sem conta', exact=True).click()
            expect(page.get_by_role('heading', name='Bem-vindo ao seu Workspace', exact=True)).to_be_visible()
            expect(page.get_by_role('heading', name='Modelos de Início Rápido', exact=True)).to_be_visible()
            sidebar = page.locator('[data-layout-corrigido="H7.65"][data-native-sidebar-replacement]')
            expect(sidebar).to_be_visible()
            check('Home and the H7.65 sidebar remain the entry experience')
            page.screenshot(path=str(OUT / 'home.png'), animations='disabled')
            page.get_by_role('button', name='Criar primeiro projeto', exact=True).click()
            page.get_by_role('button', name='Mapear a jornada', exact=False).click()
            page.get_by_label('Nome do projeto', exact=True).fill('Salas production QA')
            page.get_by_role('button', name='Criar projeto e começar', exact=True).click()
            journey = page.frame_locator('.bo-blueprint-reference-frame')
            journey.get_by_role('button', name='Adicionar etapa', exact=True).click()
            journey.locator('#cad-quick-form').get_by_label('Nome da etapa', exact=True).fill('Recepção')
            journey.locator('#cad-quick-form').get_by_role('button', name='Adicionar etapa', exact=True).click()
            page.wait_for_function("() => Object.values(window.BlueOceanRuntime.api('dataBridge').get().stages).some(s=>s.title==='Recepção')")
            # Map editors deliberately use the full canvas; reopen the project's Home.
            page.reload(wait_until='networkidle')
            expect(page.get_by_role('heading', name='Bem-vindo ao seu Workspace', exact=True)).to_be_visible()
            before = graph(page)
            f = open_spaces(page)
            expect(f.get_by_role('button', name='3D', exact=True)).to_be_visible()
            check('The real CAD loads inside the existing shell without replacing Home')
            f.get_by_role('button', name=re.compile(r'^rooms$', re.I)).click()
            f.get_by_role('button', name=re.compile(r'Rectangle$')).click()
            page.wait_for_function("() => Object.values(window.BlueOceanRuntime.api('dataBridge').get().service.cadPlans?.plans||{}).some(p=>p.project.floors.some(f=>f.walls.length===4))")
            expect(page.get_by_label('Selecionar sala da planta CAD', exact=True)).to_be_visible()
            page.get_by_label('Etapa da jornada para vincular ambiente', exact=True).select_option(label='Recepção')
            page.get_by_label('Atividade neste ambiente', exact=True).fill('Acolher cliente')
            page.get_by_role('button', name='Salvar vínculo', exact=True).click()
            page.wait_for_function("() => Object.values(window.BlueOceanRuntime.api('dataBridge').get().service.cadRoomLinks?.maps||{}).some(m=>Object.values(m).some(r=>r.activity==='Acolher cliente'))")
            saved = graph(page)
            check('A room is created and linked to a real journey stage', saved['journeys']==before['journeys'] and saved['stages']==before['stages'])
            f.get_by_role('button', name='3D', exact=True).click()
            expect(f.locator('canvas').first).to_be_visible()
            page.screenshot(path=str(OUT / 'cad-3d.png'), animations='disabled')
            check('Native 3D view opens')
            # A full reload exercises canonical persistence rather than only React state.
            page.reload(wait_until='networkidle')
            f = open_spaces(page)
            expect(page.get_by_label('Atividade neste ambiente', exact=True)).to_have_value('Acolher cliente')
            restored = graph(page)
            check('Full reload preserves CAD walls and journey association', restored['service']['cadPlans']==saved['service']['cadPlans'] and restored['service']['cadRoomLinks']==saved['service']['cadRoomLinks'])
            page.get_by_role('button', name='Desvincular', exact=True).click()
            expect(page.get_by_role('button', name='Desvincular', exact=True)).to_have_count(0)
            check('Unlinking preserves the complete CAD geometry', graph(page)['service']['cadPlans']==saved['service']['cadPlans'])
            page.get_by_role('button', name='Simulação do serviço', exact=True).click()
            expect(page.locator('.bo-service-spaces__status')).to_contain_text('sincronizados', timeout=30000)
            simulation = page.frame_locator('.bo-service-spaces__frame')
            simulation.locator('#room-tab-add').click()
            simulation.locator('#room-create-dialog-name').fill('Atendimento QA')
            simulation.locator('#room-create-form button[type="submit"]').click()
            page.wait_for_function("() => Object.values(window.BlueOceanRuntime.api('dataBridge').get().service.spatialDesign?.workspaces||{}).some(w=>w.environments.some(r=>r.name==='Atendimento QA'))")
            check('Operational simulation saves its rooms independently of CAD', graph(page)['service']['cadPlans']==saved['service']['cadPlans'])
            with page.expect_download() as dl:
                page.get_by_role('button', name='Backup do projeto', exact=True).click()
            backup = json.loads(Path(dl.value.path()).read_text())
            check('A real downloadable backup includes CAD and simulation data', 'cadPlans' in json.dumps(backup) and 'Atendimento QA' in json.dumps(backup))
            page.locator('[data-sidebar-item="home"]').click()
            expect(page.get_by_role('heading', name='Bem-vindo ao seu Workspace', exact=True)).to_be_visible()
            expect(page.get_by_role('heading', name='Modelos de Início Rápido', exact=True)).to_be_visible()
            check('Returning Home retains the production layout and project')
            sidebar.get_by_role('button', name='Recolher sidebar', exact=True).click()
            expect(sidebar).to_have_attribute('data-sidebar-collapsed','1')
            check('Collapsed H7.65 sidebar still hides labels', sidebar.locator('.bo-h764-item-label').first.evaluate("e=>getComputedStyle(e).display==='none'"))
            sidebar.get_by_role('button', name='Expandir sidebar', exact=True).click()
            for width,height in [(834,1000),(390,844)]:
                page.set_viewport_size({'width':width,'height':height})
                expect(page.get_by_role('heading', name='Bem-vindo ao seu Workspace', exact=True)).to_be_visible()
                check(f'Home has no horizontal overflow at {width}px', page.evaluate('document.documentElement.scrollWidth<=innerWidth+3'))
                page.screenshot(path=str(OUT / f'home-{width}.png'), animations='disabled')
            page.locator('.bo1175-mobile-menu').first.click()
            expect(sidebar.get_by_role('button', name='Salas e 3D', exact=True)).to_be_visible()
            open_spaces(page)
            check('The native mobile drawer can open Salas e 3D')
            check('No uncaught browser errors', not errors)
            (OUT / 'result.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
        except Exception:
            page.screenshot(path=str(OUT / 'failure.png'), animations='disabled')
            (OUT / 'failure.txt').write_text(page.locator('body').inner_text()+'\n'+str(errors))
            raise
        finally:
            browser.close()
finally:
    if server:
        server.shutdown()

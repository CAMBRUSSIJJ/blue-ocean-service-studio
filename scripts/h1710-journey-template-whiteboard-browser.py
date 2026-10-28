#!/usr/bin/env python3
"""Browser regression: Journey deletion, usable templates, and visible Whiteboard."""
import functools
import json
import os
import shutil
import threading
import traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'journey-template-whiteboard'
OUT.mkdir(parents=True, exist_ok=True)
results = []

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

def check(condition, label):
    if not condition:
        raise AssertionError(label)
    results.append(label)
    print('PASS ' + label, flush=True)

def graph(page):
    return page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').get()")

def enter(page):
    page.goto(URL, wait_until='networkidle')
    page.get_by_role('button', name='Abrir workspace local sem conta').click()
    expect(page.locator('[data-project-home]')).to_be_visible()

def create_from_project_template(page, template, project):
    enter(page)
    page.locator('.bo-h740h8-template-grid').first.get_by_role('button', name=__import__('re').compile(template)).click()
    page.get_by_label('Nome do projeto', exact=True).fill(project)
    page.get_by_label('Serviço principal', exact=True).fill(project + ' serviço')
    page.get_by_role('button', name='Criar projeto', exact=True).click()
    expect(page.get_by_role('heading', name='Visão geral do projeto', exact=True)).to_be_visible()
    page.get_by_role('button', name='Abrir Mapas do serviço', exact=True).click()
    expect(page.locator('[data-service-map-library]')).to_be_visible()

def deletion_and_whiteboard(page):
    create_from_project_template(page, 'Redesenho de serviço', 'QA Redesenho')
    initial = graph(page)
    check(len(initial['journeys']) == 2 and all(len(j['stageIds']) == 3 for j in initial['journeys'].values()),
          'Redesign template creates two editable Journeys with three stages')
    check(all(initial['stages'][sid]['customerAction'] == '' for j in initial['journeys'].values() for sid in j['stageIds']),
          'Template scaffolds do not fabricate customer actions')

    expect(page.locator('[data-blue-ocean-whiteboard-nav="standard"]')).to_be_visible()
    check(page.locator('main [data-project-context-nav]').count() == 0, 'No duplicate project tab navigation')
    expect(page.locator('[data-journey-library="1"]')).to_be_visible()
    check(page.locator('.bo-h722-journey-delete').count() == 2,
          'Journey card library exposes delete action for each Journey')
    page.locator('.bo-h722-journey-delete').first.click()
    dialog = page.locator('[data-delete-journey-dialog="1"]')
    expect(dialog).to_be_visible()
    dialog.get_by_role('button', name='Cancelar', exact=True).click()
    check(len(graph(page)['journeys']) == 2, 'Cancel deletion preserves the Journeys')
    page.locator('.bo-h722-journey-delete').first.click()
    page.locator('[data-delete-journey-dialog="1"]').get_by_role('button', name='Confirmar exclusão').click()
    page.wait_for_function("() => Object.keys(window.BlueOceanRuntime.api('dataBridge').get().journeys).length === 1")
    check(len(graph(page)['journeys']) == 1, 'Confirmed deletion removes the selected Journey')
    page.reload(wait_until='networkidle')
    check(len(graph(page)['journeys']) == 1, 'Deleted Journey stays deleted after reload')

    # Sidebar navigation is the accessible entry point outside the Design dashboard.
    page.locator('[data-blue-ocean-whiteboard-nav="standard"]').click()
    expect(page.locator('[data-whiteboard-library="1"]')).to_be_visible()
    check(page.get_by_role('button', name='Novo whiteboard').is_visible(),
          'Whiteboard library is accessible by primary sidebar')
    page.get_by_role('button', name='Novo whiteboard').click()
    page.get_by_label('Nome do quadro', exact=True).fill('QA Quadro livre')
    page.get_by_role('button', name='Começar livre', exact=True).click()
    expect(page.locator('.bo1174-board')).to_be_visible()
    check(any(b.get('viewKind') == 'free' for b in graph(page)['views']['whiteboards'].values()),
          'Whiteboard creation opens a real free canvas')
    page.screenshot(path=str(OUT / 'free-whiteboard.png'), animations='disabled')

def library_templates(page):
    enter(page)
    page.get_by_role('button', name='Novo projeto', exact=True).click()
    page.get_by_label('Nome do projeto', exact=True).fill('QA Templates')
    page.get_by_label('Serviço principal', exact=True).fill('QA Modelos')
    page.get_by_role('button', name='Criar projeto', exact=True).click()
    expect(page.get_by_role('heading', name='Visão geral do projeto', exact=True)).to_be_visible()
    page.get_by_role('button', name='Abrir Mapas do serviço', exact=True).click()
    expect(page.locator('[data-service-map-library]')).to_be_visible()
    # H3.3 sidebar groups can start collapsed; expand Organizar to reach Templates.
    if not page.get_by_role('button', name='Templates', exact=True).is_visible():
        page.locator('[data-sidebar-section="management"] .bo-h740h14-section-toggle').click()
    page.get_by_role('button', name='Templates', exact=True).click()
    expect(page.locator('[data-workspace-page="templates"]')).to_be_visible()
    row = page.locator('[data-workspace-page="templates"] tbody tr').filter(has_text='Journey map — Discovery')
    row.get_by_role('button', name='Usar template').click()
    page.wait_for_function("() => Object.keys(window.BlueOceanRuntime.api('dataBridge').get().journeys).length === 1")
    check(len(next(iter(graph(page)['journeys'].values()))['stageIds']) == 5,
          'Discovery Journey template creates five editable stages')
    page.reload(wait_until='networkidle')
    check(len(graph(page)['journeys']) == 1, 'Journey from template survives reload')

def blueprint_template(page):
    create_from_project_template(page, 'Service Blueprint', 'QA Blueprint')
    current = graph(page)
    check(len(current['journeys']) == 1, 'Blueprint project template creates a source Journey')
    check(any(x.get('viewKind') == 'blueprint' for x in current['views']['whiteboards'].values()),
          'Blueprint project template creates an editable Blueprint document')


def contextual_design_continuity(page):
    """Unified Service Map: Journey and Blueprint reuse one graph, not separate documents."""
    create_from_project_template(page, 'Redesenho de serviço', 'QA Fluxo Contínuo')
    before = graph(page)
    journey_id = before['service']['journeyIds'][0]
    stage_ids = list(before['journeys'][journey_id]['stageIds'])
    check(len(stage_ids) == 3 and not before['views']['whiteboards'],
          'Design flow starts with existing Journey stages and no extra Blueprint')
    # The other regression flows intentionally exercise the retained legacy editors.
    # Switch this one flow to the public, unified map experience before opening it.
    page.goto(URL.split('?')[0], wait_until='networkidle')
    page.get_by_role('button', name='Abrir Mapas do serviço', exact=True).click()
    expect(page.locator('[data-service-map-library]')).to_be_visible()
    page.locator('[data-service-map-library]').get_by_role('button', name='Abrir mapa').first.click()
    f = page.frame_locator('.bo-blueprint-reference-frame')
    expect(f.locator('#app')).to_be_visible()
    f.locator('[data-cad-view]').select_option('blueprint')
    check(graph(page)['journeys'][journey_id]['stageIds'] == stage_ids,
          'Switching to Blueprint preserves original stage identities')
    f.locator('[data-cad-view]').select_option('journey')
    check(graph(page)['journeys'][journey_id]['stageIds'] == stage_ids,
          'Switching back to Journey uses the same canonical stages')
    check(len(graph(page)['journeys']) == len(before['journeys']),
          'Perspective changes create no duplicate Journeys')
    page.reload(wait_until='networkidle')
    after = graph(page)
    check(after['journeys'][journey_id]['stageIds'] == stage_ids,
          'One service map persists after reload without duplicating stages')


URL = os.environ.get('BLUE_OCEAN_URL')
server = None
if not URL:
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    URL = f'http://127.0.0.1:{server.server_port}'

failures = []
# Exercise the retired editor only in localhost regression runs, never in Production.
URL += ('&' if '?' in URL else '?') + '__qa_legacy_blueprint=1&__qa_legacy_journey=1'

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),
                                    args=['--no-sandbox', '--disable-dev-shm-usage'])
        for name, flow in [('deletion-whiteboard', deletion_and_whiteboard),
                           ('library-templates', library_templates), ('blueprint-template', blueprint_template),
                           ('contextual-design-continuity', contextual_design_continuity)]:
            context = browser.new_context(viewport={'width': 1440, 'height': 960})
            page = context.new_page()
            page.set_default_timeout(12000)
            try:
                flow(page)
            except Exception:
                failures.append({'flow': name, 'error': traceback.format_exc()})
                print('FAIL ' + name + '\n' + failures[-1]['error'], flush=True)
                page.screenshot(path=str(OUT / (name + '-failure.png')), animations='disabled')
            finally:
                context.close()
        browser.close()
finally:
    if server:
        server.shutdown()
        server.server_close()
(OUT / 'result.json').write_text(json.dumps({'checks': results, 'failures': failures}, indent=2, ensure_ascii=False) + '\n')
print(f'Journey/Templates/Whiteboard: {len(results)} checks; {len(failures)} failed workflows')
raise SystemExit(1 if failures else 0)

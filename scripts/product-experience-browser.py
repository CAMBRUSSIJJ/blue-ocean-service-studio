#!/usr/bin/env python3
"""Regressão de navegação entre áreas, modo local, backup e acessibilidade."""
import functools
import json
import os
import re
import threading
import traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'product-experience'
OUT.mkdir(parents=True, exist_ok=True)
AXE = ROOT / 'node_modules' / 'axe-core' / 'axe.min.js'
checks, failures, accessibility = [], [], []


def check(name, condition, critical=True):
    checks.append({'name': name, 'passed': bool(condition)})
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)
    if not condition and critical:
        raise AssertionError(name)


def audit(page, name):
    if not AXE.exists():
        raise RuntimeError('axe-core ausente: execute npm ci.')
    if not page.evaluate("typeof window.axe !== 'undefined'"):
        page.add_script_tag(path=str(AXE))
    violations = page.evaluate("""async () => (await axe.run(document, {
      runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}
    })).violations.map(v => ({id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({target: n.target, summary: n.failureSummary}))}))""")
    accessibility.append({'screen': name, 'violations': violations})
    check(name + ': sem violações automáticas WCAG A/AA', not violations, critical=False)
    page.screenshot(path=str(OUT / (name + '.png')), animations='disabled')


def enter(page):
    page.goto(URL, wait_until='networkidle')
    expect(page.locator('.bo1120-boot')).to_be_hidden()
    expect(page.get_by_role('heading', name='Bem-vindo de volta', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Abrir workspace local sem conta', exact=True)).to_be_visible()
    check('Entrada explica o compartilhamento dos perfis locais', page.get_by_text('Um workspace compartilhado neste navegador', exact=True).is_visible())
    check('Google e Microsoft não oferecem autenticação indisponível', page.get_by_role('button', name='Google', exact=True).is_disabled() and page.get_by_role('button', name='Microsoft', exact=True).is_disabled())
    check('Login por perfil é opcional e começa recolhido', not page.locator('.bo-auth-profile').evaluate('e => e.open'))
    audit(page, 'entrada-' + str(page.viewport_size['width']))
    page.get_by_role('button', name='Abrir workspace local sem conta', exact=True).click()
    expect(page.locator('[data-project-home]')).to_be_visible()


def project(page):
    page.get_by_role('button', name='Novo projeto', exact=True).click()
    page.get_by_label('Nome do projeto', exact=True).fill('Projeto — experiência validada')
    page.get_by_label('Serviço principal', exact=True).fill('Atendimento ao cliente')
    page.get_by_role('button', name='Criar projeto', exact=True).click()
    expect(page.get_by_role('heading', name='Visão geral do projeto', exact=True)).to_be_visible()
    # On narrow viewports the primary navigation is an off-canvas drawer.
    # Open it as a user would; the button is otherwise outside the viewport.
    if page.viewport_size['width'] <= 760:
        page.get_by_role('button', name='Abrir navegação', exact=True).click()
    page.get_by_role('button', name='Abrir Mapas do serviço', exact=True).click()
    expect(page.locator('[data-service-map-library]')).to_be_visible()


def create_journey(page):
    page.get_by_role('button', name='Criar mapa', exact=True).click()
    audit(page, 'escolha-jornada-' + str(page.viewport_size['width']))
    page.get_by_role('button', name=re.compile(r'^Em branco')).click()
    page.get_by_role('button', name='Usar estrutura inicial', exact=True).click()
    expect(page.locator('.bo-h1705-journey')).to_be_visible()


def aligned(page, selector):
    page.wait_for_function("""selector => {
      const panel=document.querySelector(selector), header=document.querySelector('header[data-bo-precision-header-native]');
      if (!panel || !header) return false;
      const p=panel.getBoundingClientRect(), h=header.getBoundingClientRect();
      return Math.abs(p.x-h.x)<2 && Math.abs(p.y-h.bottom)<2 && Math.abs(p.right-h.right)<2;
    }""", arg=selector)
    check('Área externa acompanha os limites do cabeçalho', True)


def desktop(page):
    enter(page)
    project(page)
    pane = page.locator('[data-service-map-library]')
    check('Estado vazio tem uma ação principal sem mapas duplicados', pane.get_by_role('button', name='Começar mapa', exact=True).count() == 1 and pane.locator('[data-service-map-card]').count() == 0)
    audit(page, 'biblioteca-desktop')
    page.locator('[data-rt-collab-nav="1"]').first.click()
    expect(page.locator('#rt1101-collaboration')).to_be_visible()
    aligned(page, '#rt1101-collaboration')
    page.locator('[data-tab="sync"]').click()
    configured = page.evaluate("()=>window.BlueOceanRuntime.api('remoteWorkspace')?.configured===true")
    sync = page.get_by_role('button', name='Sincronizar agora', exact=True)
    if configured:
        expect(sync).to_be_enabled()
        check('Nuvem informa que o acesso remoto está configurado', page.get_by_text('Acesso remoto disponível', exact=True).is_visible())
    else:
        expect(sync).to_be_disabled()
        check('Nuvem informa a indisponibilidade antes da ação', page.get_by_text('Acesso remoto ainda indisponível', exact=True).is_visible())
    audit(page, 'colaboracao-desktop')
    page.locator('[data-bo1173-settings-nav="1"]').first.click()
    expect(page.locator('#bo1173-settings-home')).to_be_visible()
    expect(page.locator('#rt1101-collaboration')).to_be_hidden()
    aligned(page, '#bo1173-settings-home')
    audit(page, 'configuracoes-desktop')
    page.get_by_role('button', name='Recolher sidebar', exact=True).click()
    expect(page.locator('aside[data-bo-precision-sidebar-native]')).to_have_css('width', '64px')
    aligned(page, '#bo1173-settings-home')
    page.get_by_role('button', name='Expandir sidebar', exact=True).click()
    expect(page.locator('aside[data-bo-precision-sidebar-native]')).to_have_css('width', '216px')
    aligned(page, '#bo1173-settings-home')
    page.locator('[data-service-journey-nav="1"]').first.click()
    expect(page.locator('#bo1173-settings-home')).to_be_hidden()
    create_journey(page)
    check('Colaboração → Configurações → Jornada permite criar o mapa', page.locator('.bo-h1705-journey').is_visible())
    page.get_by_label('Nome da Jornada', exact=True).fill('Jornada com backup verificável')
    page.get_by_label('Nome da Jornada', exact=True).press('Enter')
    page.locator('.bo-h1706-cell textarea').first.fill('Solicita atendimento')
    with page.expect_download() as downloaded:
        page.get_by_role('button', name='Baixar backup do projeto', exact=True).click()
    payload = json.loads(Path(downloaded.value.path()).read_text())
    graph = payload['graph']
    check('Backup contém o grafo completo e as edições atuais', payload['format'] == 'realtalent.service-studio.backup' and any(j['name'] == 'Jornada com backup verificável' for j in graph['journeys'].values()) and any(s['customerAction'] == 'Solicita atendimento' for s in graph['stages'].values()))
    (OUT / 'backup.json').write_text(json.dumps(payload, ensure_ascii=False))
    audit(page, 'jornada-desktop')
    page.get_by_role('button', name=re.compile('^Visualizações')).click()
    audit(page, 'visualizacoes-desktop')
    page.keyboard.press('Escape')


def mobile(page):
    enter(page)
    project(page)
    audit(page, 'biblioteca-celular')
    create_journey(page)
    check('Editor e backup cabem no celular', page.evaluate('document.documentElement.scrollWidth <= innerWidth') and page.get_by_role('button', name='Baixar backup do projeto', exact=True).is_visible())
    audit(page, 'jornada-celular')
    page.get_by_role('button', name=re.compile('^Visualizações')).click()
    audit(page, 'visualizacoes-celular')


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = None
URL = os.environ.get('BLUE_OCEAN_URL')
if not URL:
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    URL = f'http://127.0.0.1:{server.server_port}'

URL += ('&' if '?' in URL else '?') + '__qa_legacy_blueprint=1&__qa_legacy_journey=1'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or __import__('shutil').which('chromium'), args=['--no-sandbox', '--disable-dev-shm-usage'])
        for name, flow, width, height in [('desktop', desktop, 1440, 1000), ('mobile', mobile, 390, 844)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
            page = context.new_page()
            page.set_default_timeout(15000)
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            try:
                flow(page)
                check(name + ': sem erros de JavaScript', not errors)
            except Exception:
                failures.append({'flow': name, 'traceback': traceback.format_exc(), 'errors': errors})
                print(failures[-1]['traceback'], flush=True)
                page.screenshot(path=str(OUT / (name + '-failure.png')))
            context.close()
        browser.close()
finally:
    if server:
        server.shutdown()
        server.server_close()

(OUT / 'result.json').write_text(json.dumps({'checks': checks, 'failures': failures, 'accessibility': accessibility}, ensure_ascii=False, indent=2) + '\n')
print(f'Experiência de produto: {sum(c["passed"] for c in checks)}/{len(checks)} checks; {len(failures)} fluxos interrompidos')
raise SystemExit(1 if failures or any(not c['passed'] for c in checks) else 0)

#!/usr/bin/env python3
"""Valida botões, rodapés e ações reais de Jornada/Blueprint em três larguras."""
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
from map_browser_support import wait_saved

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'map-actions'
OUT.mkdir(parents=True, exist_ok=True)
for stale_failure in OUT.glob('failure-*.png'):
    stale_failure.unlink()
checks, failures, audits = [], [], []


def check(name, passed):
    checks.append({'name': name, 'passed': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)
    if not passed:
        raise AssertionError(name)


def style(locator):
    return locator.evaluate('e => {const s=getComputedStyle(e);return {height:e.getBoundingClientRect().height, background:s.backgroundColor, radius:s.borderRadius, color:s.color, outline:s.outlineStyle}}')


def audit(page, name):
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate("""async () => (await axe.run(document, {runOnly:{type:'tag', values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))""")
    audits.append({'screen': name, 'violations': violations})
    page.screenshot(path=str(OUT / (name + '.png')), animations='disabled')
    check(name + ': sem violações automáticas WCAG A/AA', not violations)


def flow(page, width):
    page.goto(URL, wait_until='networkidle')
    page.get_by_role('button', name='Abrir workspace local sem conta', exact=True).click()
    page.locator('.bo-h740h8-template-grid').first.get_by_role('button', name=re.compile('Redesenho de serviço')).click()
    page.get_by_label('Nome do projeto', exact=True).fill('Harmonia dos mapas')
    page.get_by_label('Serviço principal', exact=True).fill('Atendimento')
    page.get_by_role('button', name='Criar projeto', exact=True).click()
    expect(page.get_by_role('heading', name='Visão geral do projeto', exact=True)).to_be_visible()
    page.get_by_role('button', name='Abrir Mapas do serviço', exact=True).click()
    pane = page.locator('[data-service-map-library]')
    expect(pane).to_be_visible()
    cards = pane.locator('.bo-h724-journey-card')
    expect(cards).to_have_count(2)
    cards.first.get_by_role('button', name='Abrir mapa', exact=True).click()
    f = page.frame_locator('.bo-blueprint-reference-frame'); wait_saved(f)
    title = f.get_by_label('Nome do mapa', exact=True)
    title.fill('Mapa de atendimento com um nome suficientemente longo para validar a organização do card'); title.press('Tab'); wait_saved(f)
    header = f.locator('.cad-toolbar')
    primary = header.get_by_role('button', name='Adicionar etapa', exact=True)
    primary.focus()
    check(f'{width}: foco de teclado visível', style(primary)['outline'] != 'none')
    primary.click()
    draft = f.locator('#cad-quick-form')
    check(f'{width}: etapa sem nome não pode ser enviada', draft.locator('[name=title]').evaluate('e=>!e.checkValidity()'))
    draft.locator('[name=title]').fill('Acompanhamento')
    draft.get_by_role('button', name='Adicionar etapa', exact=True).click(); wait_saved(f)
    check(f'{width}: criar etapa mantém a ação funcional', page.evaluate("()=>Object.values(window.BlueOceanRuntime.api('dataBridge').get().stages).some(s=>s.title==='Acompanhamento')"))
    f.get_by_label('Visualização do mapa', exact=True).select_option('journey'); wait_saved(f)
    check(f'{width}: Jornada é uma visualização do mesmo editor', f.locator('#cad-svg,.cad-mobile-map').count() == 1)
    audit(page, f'jornada-{width}')
    f.get_by_role('button', name='Voltar para mapas do serviço', exact=True).click()
    expect(pane).to_be_visible()
    page.get_by_role('button', name='Criar mapa', exact=True).click()
    page.get_by_role('button', name=re.compile('^Em branco')).click()
    wait_saved(f)
    f.get_by_role('button', name='Adicionar etapa', exact=True).click()
    f.locator('#cad-quick-form [name=title]').fill('Primeira etapa')
    f.locator('#cad-quick-form [name=title]').press('Enter'); wait_saved(f)
    f.get_by_role('button', name='Voltar para mapas do serviço', exact=True).click()
    expect(cards).to_have_count(3)
    check(f'{width}: ações dos cards ficam dentro de seus rodapés', pane.locator('.bo-map-card-actions').evaluate_all("footers=>footers.every(f=>{const r=f.getBoundingClientRect();return [...f.querySelectorAll('button')].every(b=>{const x=b.getBoundingClientRect();return x.left>=r.left && x.right<=r.right+1 && x.top>=r.top && x.bottom<=r.bottom+1})})"))
    check(f'{width}: biblioteca não cria rolagem horizontal', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    delete = cards.last.get_by_role('button', name=re.compile('Excluir mapa'))
    delete.click(); expect(page.locator('[data-delete-journey-dialog="1"]')).to_be_visible()
    page.get_by_role('button', name='Cancelar', exact=True).click(); expect(cards).to_have_count(3)
    check(f'{width}: exclusão mantém confirmação e cancelamento', True)
    audit(page, f'biblioteca-mapas-{width}')
    pane.get_by_role('button', name='Tabela', exact=True).click()
    expect(pane.get_by_role('button', name='Tabela', exact=True)).to_have_attribute('aria-pressed', 'true')
    expect(pane.locator('tbody tr')).to_have_count(3)
    pane.get_by_role('button', name='Cards', exact=True).click()
    expect(pane.get_by_role('button', name='Cards', exact=True)).to_have_attribute('aria-pressed', 'true')
    check(f'{width}: seletor alterna Cards e Tabela', True)
    page.get_by_role('textbox', name='Buscar mapas', exact=True).fill('suficientemente longo')
    expect(cards).to_have_count(1)
    check(f'{width}: busca continua funcional', True)
    page.get_by_role('textbox', name='Buscar mapas', exact=True).fill('')
    cards.first.get_by_role('button', name='Abrir mapa', exact=True).click(); wait_saved(f)
    f.get_by_label('Visualização do mapa', exact=True).select_option('blueprint'); wait_saved(f)
    check(f'{width}: Blueprint compartilha as cores da Jornada', f.locator('body').evaluate("e=>getComputedStyle(e).backgroundColor==='rgb(255, 255, 255)'"))
    more = f.locator('.cad-options summary'); more.focus()
    check(f'{width}: ações secundárias têm foco visível', style(more)['outline'] != 'none')
    more.click(); expect(f.get_by_role('button', name='Exportar SVG', exact=True)).to_be_visible()
    check(f'{width}: menu reúne exportação e backup', f.get_by_role('button', name='Dados e backup', exact=True).is_visible())
    page.screenshot(path=str(OUT / f'blueprint-{width}.png'), animations='disabled')
    f.get_by_role('button', name='Voltar para mapas do serviço', exact=True).click()
    expect(pane).to_be_visible()
    check(f'{width}: uma entrada representa as duas visualizações', cards.count() == 3 and page.locator('[data-blueprint-library]').count() == 0)
    audit(page, f'biblioteca-blueprints-{width}')
    check(f'{width}: botões dos mapas têm nome acessível', pane.get_by_role('button', name=re.compile('Excluir mapa')).count() == 3)


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = None
URL = os.environ.get('BLUE_OCEAN_URL')
if not URL:
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    URL = f'http://127.0.0.1:{server.server_port}'

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), args=['--no-sandbox', '--disable-dev-shm-usage'])
        for width in (1440, 834, 390):
            context = browser.new_context(viewport={'width': width, 'height': 1000 if width > 600 else 844}, reduced_motion='reduce', has_touch=width < 1000)
            page = context.new_page()
            page.set_default_timeout(15000)
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            try:
                flow(page, width)
                check(f'{width}: sem erros de JavaScript', not errors)
            except Exception:
                failures.append({'width': width, 'traceback': traceback.format_exc(), 'errors': errors})
                print(failures[-1]['traceback'], flush=True)
                page.screenshot(path=str(OUT / f'failure-{width}.png'))
            context.close()
        browser.close()
finally:
    if server:
        server.shutdown()
        server.server_close()
(OUT / 'result.json').write_text(json.dumps({'checks': checks, 'failures': failures, 'accessibility': audits}, ensure_ascii=False, indent=2) + '\n')
print(f'Botões dos mapas: {sum(c["passed"] for c in checks)}/{len(checks)} verificações; {len(failures)} fluxos interrompidos')
raise SystemExit(1 if failures or any(not c['passed'] for c in checks) else 0)

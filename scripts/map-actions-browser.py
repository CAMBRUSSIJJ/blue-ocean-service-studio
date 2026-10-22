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
    pane = page.locator('[data-journey-library="1"]')
    expect(pane).to_be_visible()
    cards = pane.locator('.bo-h724-journey-card')
    expect(cards).to_have_count(2)
    # Long names must not push actions outside the footer.
    cards.first.get_by_role('button', name='Abrir Jornada', exact=True).click()
    welcome = page.get_by_role('button', name='Criar primeira etapa', exact=True)
    if welcome.is_visible():
        welcome.click()
    page.get_by_label('Nome da Jornada', exact=True).fill('Jornada de atendimento com um nome suficientemente longo para validar a organização do card')
    page.get_by_label('Nome da Jornada', exact=True).press('Enter')
    header = page.locator('.bo-h1705-topbar')
    primary = header.get_by_role('button', name='Nova etapa', exact=True)
    page.mouse.move(0, page.viewport_size['height'] - 1)
    primary_style = style(primary)
    check(f'{width}: cabeçalho usa uma altura única de botão', all(abs(style(b)['height'] - 36) < 1 for b in header.get_by_role('button').all()))
    primary.focus()
    check(f'{width}: foco de teclado visível', style(primary)['outline'] != 'none')
    primary.click()
    draft = page.locator('.bo-h1705-stage-draft')
    expect(draft.get_by_role('button', name='Criar etapa', exact=True)).to_be_disabled()
    draft.get_by_placeholder('Nome da etapa', exact=True).fill('Acompanhamento')
    draft.get_by_role('button', name='Criar etapa', exact=True).click()
    expect(page.get_by_role('textbox', name='Nome da etapa 4', exact=True)).to_be_visible()
    check(f'{width}: criar etapa mantém a ação funcional', True)
    views = header.get_by_role('button', name=re.compile('^Visualizações'))
    views.click()
    expect(views).to_have_attribute('aria-expanded', 'true')
    page.mouse.move(0, page.viewport_size['height'] - 1)
    check(f'{width}: menu aberto mantém indicação visual', style(views)['background'] != 'rgba(0, 0, 0, 0)')
    page.keyboard.press('Escape')
    expect(views).to_have_attribute('aria-expanded', 'false')
    page.locator('.bo-h1705-scroll').evaluate('e => {e.scrollLeft=0;e.scrollTop=0}')
    audit(page, f'jornada-{width}')
    page.get_by_role('button', name='Todas as Jornadas', exact=True).click()
    expect(pane).to_be_visible()
    page.get_by_role('button', name='Criar Jornada', exact=True).click()
    page.get_by_role('button', name=re.compile('^Em branco')).click()
    page.get_by_role('button', name='Criar primeira etapa', exact=True).click()
    page.get_by_role('button', name='Todas as Jornadas', exact=True).click()
    expect(cards).to_have_count(3)
    check(f'{width}: ações dos cards ficam dentro de seus rodapés', pane.locator('.bo-map-card-actions').evaluate_all("""footers=>footers.every(f=>{const r=f.getBoundingClientRect();return [...f.querySelectorAll('button')].every(b=>{const x=b.getBoundingClientRect();return x.left>=r.left && x.right<=r.right+1 && x.top>=r.top && x.bottom<=r.bottom+1})})"""))
    check(f'{width}: biblioteca não cria rolagem horizontal', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    create = pane.get_by_role('button', name='Criar Jornada', exact=True)
    check(f'{width}: biblioteca e editor compartilham a cor e o raio da ação principal', style(create)['background'] == primary_style['background'] and style(create)['radius'] == primary_style['radius'])
    delete = cards.last.locator('.bo-h722-journey-delete')
    delete.click()
    expect(page.locator('[data-delete-journey-dialog="1"]')).to_be_visible()
    page.get_by_role('button', name='Cancelar', exact=True).click()
    expect(cards).to_have_count(3)
    check(f'{width}: exclusão mantém confirmação e cancelamento', True)
    pane.evaluate('e => {for(let p=e;p;p=p.parentElement)p.scrollTop=0;window.scrollTo(0,0)}')
    audit(page, f'biblioteca-jornadas-{width}')
    pane.get_by_role('button', name='Tabela', exact=True).click()
    expect(pane.get_by_role('button', name='Tabela', exact=True)).to_have_attribute('aria-pressed', 'true')
    expect(pane.locator('tbody tr')).to_have_count(3)
    pane.get_by_role('button', name='Cards', exact=True).click()
    expect(pane.get_by_role('button', name='Cards', exact=True)).to_have_attribute('aria-pressed', 'true')
    check(f'{width}: seletor alterna Cards e Tabela', True)
    page.get_by_role('textbox', name='Buscar Jornada', exact=True).fill('suficientemente longo')
    expect(cards).to_have_count(1)
    check(f'{width}: busca continua funcional', True)
    page.get_by_role('textbox', name='Buscar Jornada', exact=True).fill('')
    cards.first.locator('[data-journey-to-blueprint]').click()
    board = page.locator('.bo1174-board')
    expect(board).to_be_visible()
    if width >= 600:
        add = page.get_by_role('button', name='Adicionar etapa', exact=True).first
        page.mouse.move(0, page.viewport_size['height'] - 1)
        expect(add).to_have_css('background-color', primary_style['background'])
        check(f'{width}: Blueprint usa a mesma ação principal da Jornada', style(add)['background'] == primary_style['background'] and style(add)['radius'] == primary_style['radius'] and style(add)['height'] == primary_style['height'])
    page.get_by_role('button', name='Opções', exact=True).focus()
    page.keyboard.press('Tab')
    page.keyboard.press('Shift+Tab')
    check(f'{width}: opções do Blueprint têm foco visível', style(page.get_by_role('button', name='Opções', exact=True))['outline'] != 'none')
    page.screenshot(path=str(OUT / f'blueprint-{width}.png'), animations='disabled')
    page.get_by_role('button', name='Opções', exact=True).click()
    expect(page.get_by_role('dialog', name='Ferramentas do editor', exact=True)).to_be_visible()
    page.keyboard.press('Escape')
    if page.get_by_role('dialog', name='Ferramentas do editor', exact=True).is_visible():
        page.get_by_role('button', name='Fechar', exact=True).last.click()
    page.get_by_role('button', name='Voltar para Blueprints', exact=True).click()
    blueprints = page.locator('[data-blueprint-library="1"]')
    expect(blueprints).to_be_visible()
    check(f'{width}: ação de criar no cabeçalho do serviço usa o mesmo padrão', style(page.get_by_role('button', name='Criar Blueprint', exact=True).first)['background'] == primary_style['background'])
    expect(blueprints.get_by_role('button', name='Abrir Blueprint', exact=True)).to_be_visible()
    audit(page, f'biblioteca-blueprints-{width}')
    check(f'{width}: botões dos Blueprints têm nome acessível', blueprints.get_by_role('button', name=re.compile('Ações do Blueprint')).count() == 1)
    check(f'{width}: biblioteca de Blueprints não cria rolagem horizontal', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = None
URL = os.environ.get('BLUE_OCEAN_URL')
if not URL:
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    URL = f'http://127.0.0.1:{server.server_port}'
URL += ('&' if '?' in URL else '?') + '__qa_legacy_journey=1'
# Exercise the retired editor only in localhost regression runs, never in Production.
URL += ('&' if '?' in URL else '?') + '__qa_legacy_blueprint=1'

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

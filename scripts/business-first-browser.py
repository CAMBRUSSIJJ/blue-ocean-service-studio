#!/usr/bin/env python3
"""Acceptance of responsive map editing and independent Journey/Blueprint perspectives."""
import functools, json, os, shutil, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/business-first'
OUT.mkdir(parents=True, exist_ok=True)
checks, errors, skipped = [], [], []

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass
    def copyfile(self, source, output):
        try: super().copyfile(source, output)
        except (BrokenPipeError, ConnectionResetError): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}'

def check(name, value):
    assert value, name
    checks.append(name)
    print('PASS ' + name, flush=True)

def graph(page): return page.evaluate("()=>window.BlueOceanRuntime.api('dataBridge').get()")
def saved(f): expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
def stage(f, name):
    f.get_by_role('button', name='Adicionar etapa', exact=True).click()
    f.get_by_role('textbox', name='Nome da nova etapa', exact=True).fill(name)
    f.get_by_role('button', name='Adicionar etapa ao mapa', exact=True).click(); saved(f)
def add(f, key, text):
    f.locator(f'[data-cell="{key}"]>.content-add').click()
    f.get_by_role('button', name='Adicionar Cartão', exact=True).click()
    field=f.locator(f'[data-cell="{key}"] [data-ed="c"]').last
    field.fill(text); field.press('Tab'); saved(f)
def perspective(f, name):
    f.get_by_role('button', name=name, exact=True).click(); saved(f)
    expect(f.locator('.map-perspective-label')).to_have_text(name)
    # This suite verifies the matrix; the canvas has its own acceptance suite.
    if name == 'Blueprint' and f.get_by_role('button', name='Matriz', exact=True).count():
        f.get_by_role('button', name='Matriz', exact=True).click(); saved(f)
def customize(f, row, visible):
    f.get_by_role('button', name='Personalizar visualização', exact=True).click()
    f.locator(f'[data-view-row="{row}"]').set_checked(visible); saved(f)
    f.get_by_role('button', name='Concluir', exact=True).click()
def filters(f, query):
    if f.locator('[data-act="cards-toggle-filters"]').get_attribute('aria-expanded') != 'true':
        f.locator('[data-act="cards-toggle-filters"]').click()
    f.get_by_role('searchbox', name='Buscar cartões', exact=True).fill(query)
    f.get_by_role('button', name='Aplicar filtros', exact=True).click(); saved(f)
def audit(page, label):
    axe=ROOT/'node_modules/axe-core/axe.min.js'
    if not axe.exists():
        skipped.append('axe '+label+': dependência axe-core ausente')
        print('SKIP '+skipped[-1],flush=True);return
    frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
    frame.add_script_tag(content=axe.read_text())
    violations=frame.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
    (OUT/f'{label}-axe.json').write_text(json.dumps(violations,indent=2))
    check('Accessibility '+label,not violations)
def screenshot(page, label): page.screenshot(path=str(OUT/f'{label}.png'),animations='disabled')

try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_locator_handler(page.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click())
        page.goto(URL,wait_until='networkidle');page.get_by_role('button',name='Abrir workspace local sem conta').click()
        page.get_by_role('button',name='Novo projeto',exact=True).click();page.get_by_label('Nome do projeto',exact=True).fill('Negócio QA');page.get_by_label('Serviço principal',exact=True).fill('Atendimento');page.get_by_role('button',name='Criar projeto',exact=True).click()
        page.locator('.bo-h724-journey-pane').get_by_role('button',name='Criar Jornada',exact=True).click()
        page.get_by_role('button',name='Reduzir atrasos e retrabalho',exact=False).click()
        expect(page.locator('.bo-business-goals')).to_contain_text('Objetivo: Reduzir atrasos e retrabalho')
        expect(page.locator('.bo-h1704-template-grid>.is-selected strong')).to_have_text('Delivery')
        page.get_by_role('button',name='Em branco',exact=False).first.click()
        f=page.frame_locator('.bo-blueprint-reference-frame');saved(f)
        check('Business goal survives creation without inventing customer observations',next(iter(graph(page)['journeys'].values()))['objective']=='Reduzir atrasos e retrabalho')
        f.get_by_role('button',name='Mostrar todos os comandos',exact=True).click()
        for name in ['Pedir orçamento','Confirmar serviço','Receber entrega']:stage(f,name)
        def persona(index,name,use_context):
            f.locator(f'[data-cell="ac|{index}"]>.content-add').click();f.get_by_role('button',name='Adicionar Persona',exact=True).click();d=f.locator('#element-selector')
            d.get_by_role('button',name='+ Criar nova Persona',exact=True).click();form=d.locator('#element-create-form');form.get_by_label('Nome do registro',exact=True).fill(name)
            if use_context:d.get_by_label('Usar também como Persona da jornada',exact=True).check()
            form.get_by_role('button',name='Criar e vincular à etapa',exact=True).click();expect(d).not_to_be_visible();saved(f)
        persona(0,'Cliente com pressa',False)
        check('Persona creation works immediately after fresh stages with no reload or graph seeding',f.locator('[data-cell="ac|0"] .type-persona').count()==1)
        check('Placing Persona keeps journey context optional',not next(iter(graph(page)['journeys'].values())).get('personaId'))
        persona(1,'Cliente recorrente',True)
        g=graph(page);jid=next(iter(g['journeys']));pid=next(p['id'] for p in g['entities']['persona'].values() if p['title']=='Cliente recorrente')
        check('Explicit Persona choice sets context in the same save',g['journeys'][jid]['personaId']==pid)
        f.get_by_role('button',name='Desfazer',exact=True).click();saved(f)
        check('Undo restores both Persona placement and prior context',not next(iter(graph(page)['journeys'].values())).get('personaId'))
        f.get_by_role('button',name='Refazer',exact=True).click();saved(f)
        check('Redo restores the complete Persona transaction',next(iter(graph(page)['journeys'].values())).get('personaId')==pid)
        f.locator('.sh').nth(0).get_by_role('button',name='Mover etapa para a direita',exact=True).click();saved(f)
        persona(0,'Outra hipótese de cliente',False)
        check('Fresh selector resolves the correct stage after reordering',f.locator('[data-cell="ac|0"] .type-persona').count()==2)
        stage(f,'Pós atendimento');persona(3,'Cliente do retorno',False)
        check('Adding another stage does not regress canonical identity sync',f.locator('[data-cell="ac|3"] .type-persona').count()==1)
        perspective(f,'Blueprint');add(f,'fl|0','Recepcionar pedido');add(f,'bk|1','Conferir disponibilidade')
        f.get_by_role('button',name='Revisar e melhorar',exact=True).click();d=f.locator('#business-review');d.get_by_label('Tipo de revisão',exact=True).select_option('owner')
        expect(d.locator('.business-review-list article')).to_have_count(2)
        d.get_by_role('button',name='Revisar atividade',exact=True).first.click();a=f.locator('#blueprint-activity-dialog');a.get_by_label('Responsável',exact=True).fill('Atendente');a.get_by_label('Espera (min)',exact=True).fill('15');a.get_by_label('Execução (min)',exact=True).fill('10');a.get_by_label('Prazo combinado (min)',exact=True).fill('20');a.get_by_role('button',name='Salvar atividade',exact=True).click();saved(f)
        f.get_by_role('button',name='Revisar e melhorar',exact=True).click();d.get_by_label('Tipo de revisão',exact=True).select_option('owner');expect(d.locator('.business-review-list article')).to_have_count(1)
        d.get_by_label('Tipo de revisão',exact=True).select_option('wait');expect(d).to_contain_text('Espera registrada: 15 min');expect(d).to_contain_text('ultrapassam o prazo combinado');d.get_by_role('button',name='Concluir revisão',exact=True).click()
        check('Review updates from canonical owners and preserves explicitly recorded waits',True)
        f.locator('[data-cell="ac|0"]>.content-add').click();f.get_by_role('button',name='Adicionar Dor',exact=True).click();element=f.locator('#element-selector');element.get_by_role('button',name='+ Criar nova dor',exact=True).click();element.get_by_label('Nome do registro',exact=True).fill('Atraso na confirmação');element.get_by_role('button',name='Criar e vincular à etapa',exact=True).click();expect(element).not_to_be_visible();saved(f)
        f.get_by_role('button',name='Revisar e melhorar',exact=True).click();d.get_by_label('Tipo de revisão',exact=True).select_option('improvement');d.get_by_role('button',name='Analisar problema',exact=True).click();expect(f.locator('#pain-context-dialog')).to_contain_text('Atraso na confirmação');f.locator('#pain-context-dialog').get_by_role('button',name='Cancelar',exact=True).click();check('Referenced pain cards enter the same evidence and improvement review path',True)
        f.get_by_role('button',name='Revisar e melhorar',exact=True).click();d.get_by_role('button',name='Registrar problema',exact=True).click();f.get_by_role('button',name='+ Dor',exact=True).first.click();field=f.locator('.it.d [data-ed=ix]').last;field.fill('Cliente não sabe o prazo');field.press('Tab');saved(f)
        f.get_by_role('button',name='Revisar e melhorar',exact=True).click();d.get_by_label('Tipo de revisão',exact=True).select_option('improvement');d.get_by_role('button',name='Planejar melhoria',exact=True).click();form=f.locator('#growth-plan-form');form.get_by_label('Ação proposta',exact=True).fill('Informar prazo antes de confirmar');form.get_by_label('Responsável',exact=True).fill('Atendente');form.locator('summary').click();form.get_by_label('Nome do indicador',exact=True).fill('Tempo até informar prazo');form.get_by_label('Unidade',exact=True).fill('minutos');form.get_by_label('Meta',exact=True).fill('5');form.get_by_role('button',name='Salvar plano',exact=True).click();saved(f)
        f.get_by_role('button',name='Revisar e melhorar',exact=True).click();d.get_by_label('Tipo de revisão',exact=True).select_option('improvement');expect(d).to_contain_text('registrar uma medição real');d.get_by_role('button',name='Acompanhar resultado',exact=True).click();track=f.locator('#growth-track-dialog');track.get_by_label('Novo valor medido',exact=True).fill('4');track.get_by_label('Observação da medição',exact=True).fill('Ensaio fictício de teste');track.get_by_role('button',name='Registrar medição',exact=True).click();saved(f)
        f.get_by_role('button',name='Revisar e melhorar',exact=True).click();d.get_by_label('Tipo de revisão',exact=True).select_option('improvement');expect(d).to_contain_text('revisar as medições com a equipe');expect(d).to_contain_text('4 minutos');d.get_by_role('button',name='Concluir revisão',exact=True).click()
        check('Problem to action, owner, indicator, measurement and next decision uses one canonical plan',len(graph(page)['service']['improvementPortfolio']['initiatives'])==1)
        page.set_viewport_size({'width':390,'height':844});f.get_by_role('button',name='Uma etapa por vez',exact=True).click();expect(f.locator('.business-focus')).to_be_visible();expect(f.locator('.matrix')).to_have_count(0)
        f.get_by_role('combobox',name='Etapa em foco',exact=True).select_option('3');add(f,'ac|3','Cliente avalia o atendimento');f.get_by_role('button',name='Etapa anterior',exact=True).click();expect(f.get_by_role('combobox',name='Etapa em foco',exact=True)).to_have_value('2');f.get_by_role('button',name='Próxima etapa',exact=True).click();expect(f.locator('[data-cell="ac|3"]')).to_contain_text('Cliente avalia o atendimento')
        frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame();check('Mobile edits one stage with persistent navigation and no horizontal document overflow',frame.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        screenshot(page,'mobile-stage-focus');audit(page,'mobile-stage-focus')
        f.get_by_role('button',name='Dados e backup',exact=True).click();d=f.locator('#business-storage');expect(d).to_contain_text('neste navegador e neste dispositivo')
        d.get_by_role('button',name='Abrir workspace remoto',exact=True).click();expect(page.locator('.bo-remote-dialog')).to_be_visible();page.get_by_role('button',name='Fechar workspace remoto',exact=True).click();f.get_by_role('button',name='Dados e backup',exact=True).click();check('The map opens the remote account dialog without leaving editing',True)
        with page.expect_download() as download:d.get_by_role('button',name='Baixar backup do projeto',exact=True).click()
        backup=Path(download.value.path()).read_text();payload=json.loads(backup);check('Portable backup contains current mobile edits, waits and Persona context',all(text in backup for text in ['Cliente avalia o atendimento','waitMinutes','Cliente recorrente']))
        d.get_by_role('button',name='Restaurar ou transferir backup',exact=True).click();expect(page.locator('.rt158-io-modal')).to_be_visible();expect(page.locator('.rt158-io-body input[type=file]')).to_be_visible()
        check('Backup transfer opens the existing validated import and preview flow',True)
        check('No uncaught JavaScript errors',not errors)
        context.close();browser.close()
finally:
    (OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors,'skipped':skipped},ensure_ascii=False,indent=2))
    server.shutdown();server.server_close()
print(f'Business experience browser: {len(checks)}/{len(checks)} PASS',flush=True)

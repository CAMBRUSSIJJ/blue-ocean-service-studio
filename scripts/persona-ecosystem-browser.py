#!/usr/bin/env python3
"""Reference Persona ecosystem against the real UI, canonical graph and persistence."""
import functools, json, os, shutil, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'artifacts/persona-ecosystem'
OUT.mkdir(parents=True, exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass
    def copyfile(self, source, output):
        try: super().copyfile(source, output)
        except (BrokenPipeError, ConnectionResetError): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
checks=[]
def check(label, value=True):
    assert value,label
    checks.append(label); print('PASS '+label,flush=True)
def graph(page): return page.evaluate("()=>window.BlueOceanRuntime.api('dataBridge').get()")
def audit(page,label):
    page.add_script_tag(content=(ROOT/'node_modules/axe-core/axe.min.js').read_text())
    violations=page.evaluate("async()=>{const r=await axe.run('[data-persona-ecosystem]',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
    (OUT/f'{label}-axe.json').write_text(json.dumps(violations,indent=2))
    check('Accessible ecosystem on '+label,not violations)
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1536,'height':1100})
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
        page.get_by_role('button',name='Abrir workspace local sem conta').click()
        page.get_by_role('button',name='Novo projeto',exact=True).click()
        page.locator('[data-project-creation-page] .bo-h744-option-grid button').nth(1).click()
        page.get_by_label('Nome do projeto',exact=False).fill('Ecossistema QA')
        page.get_by_role('button',name='Criar projeto e começar',exact=True).click()
        focus=page.locator('[data-persona-focus="1"]')
        focus.get_by_label('Nome da Persona').fill('Helena — cliente digital')
        for _ in range(3): focus.get_by_role('button',name='Próximo',exact=True).click()
        focus.get_by_role('button',name='Salvar e concluir',exact=True).click()
        expect(page.locator('[data-persona-read-profile="1"]')).to_be_visible()
        page.get_by_role('button',name='Ecossistema',exact=True).click()
        eco=page.locator('[data-persona-ecosystem="1"]')
        expect(eco).to_be_visible();expect(eco.locator('h1')).to_have_text('Helena — cliente digital')
        check('Reference opens with canonical Persona identity and empty counts',eco.get_by_role('button',name='Dores (0)',exact=True).count()==1 and eco.get_by_role('button',name='Pesquisas (0)',exact=True).count()==1)
        check('Three primary tabs match the reference',eco.locator('.bo-eco-tabs button').all_text_contents()==['Visão geral','Perfil de criação','Ecossistema'])
        eco.get_by_role('button',name='Dores (0)',exact=True).click()
        pain=eco.get_by_label('Nova dor da Persona');expect(pain).to_be_focused()
        pain.fill('Não sabe o prazo');pain.press('Enter')
        expect(eco.get_by_role('button',name='Dores (1)',exact=True)).to_be_visible()
        pid=next(iter(graph(page)['entities']['persona']))
        record=next(r for r in graph(page)['entities']['pain'].values() if r['title']=='Não sabe o prazo')
        check('Enter creates a canonical pain with both Persona links',pid in record['relatedIds'] and pid in record['personaIds'])
        need=eco.get_by_label('Nova necessidade da Persona')
        for text in ['Prazo claro','Status do pedido']:
            need.fill(text);need.press('Enter');expect(need).to_have_value('')
        expect(eco.get_by_role('button',name='Necessidades (2)',exact=True)).to_be_visible()
        source=eco.get_by_label('Link da fonte de pesquisa')
        source.fill('https://example.org/entrevistas')
        eco.get_by_role('button',name='Adicionar fonte',exact=True).click()
        expect(eco.get_by_role('button',name='Pesquisas (1)',exact=True)).to_be_visible()
        expect(eco.get_by_role('link',name='Abrir fonte',exact=True)).to_have_attribute('href','https://example.org/entrevistas')
        check('Source uses a canonical evidence record with actual provenance',next(iter(graph(page)['entities']['evidence'].values()))['sourceName']=='https://example.org/entrevistas')
        source.fill('https://example.org/entrevistas');eco.get_by_role('button',name='Adicionar fonte',exact=True).click()
        expect(source).to_have_value('')
        check('Adding the same source reuses its record',len(graph(page)['entities']['evidence'])==1)
        page.evaluate("""pid=>window.BlueOceanRuntime.api('dataBridge').transact(g=>{
          g.entities.persona['qa-other']={id:'qa-other',type:'persona',serviceId:g.service.id,title:'Outra Persona',relatedIds:['qa-shared']};
          g.entities.need['qa-shared']={id:'qa-shared',type:'need',serviceId:g.service.id,title:'Necessidade compartilhada',relatedIds:['qa-other'],personaIds:['qa-other']};
          g.journeys['qa-map']={id:'qa-map',serviceId:g.service.id,name:'Jornada de entrega',stageIds:[],personaId:pid};
          g.service.journeyIds.push('qa-map');return g;
        },'Preparar registros compartilhados de QA')""",pid)
        needs=eco.locator('[data-persona-ecosystem-kind="need"]')
        needs.locator('summary').click();needs.get_by_label('Escolher necessidade').select_option('qa-shared')
        needs.get_by_role('button',name='Vincular',exact=True).click()
        expect(eco.get_by_role('button',name='Necessidades (3)',exact=True)).to_be_visible()
        needs.get_by_role('button',name='Desvincular necessidade Necessidade compartilhada',exact=True).click()
        expect(eco.get_by_role('button',name='Necessidades (2)',exact=True)).to_be_visible()
        shared=graph(page)['entities']['need']['qa-shared']
        check('Unlink removes only this Persona connection, preserving the shared record',shared['personaIds']==['qa-other'] and shared['relatedIds']==['qa-other'])
        expect(eco.get_by_role('button',name='Mapas (1)',exact=True)).to_be_visible()
        page.locator('#bo-main-content').evaluate('el=>el.scrollTop=0');page.evaluate('window.scrollTo(0,0)')
        page.screenshot(path=str(OUT/'desktop.png'),animations='disabled',full_page=True)
        audit(page,'desktop')
        eco.get_by_role('button',name='Mapas (1)',exact=True).click()
        eco.get_by_role('button',name='Jornada de entrega',exact=True).click()
        expect(page.frame_locator('.bo-blueprint-reference-frame').locator('#app')).to_be_visible()
        check('Maps node opens the existing canonical map')
        page.frame_locator('.bo-blueprint-reference-frame').get_by_role('button',name='Voltar para mapas do serviço',exact=True).click()
        page.get_by_role('button',name='Personas',exact=True).click()
        page.locator(f'[data-persona-card="{pid}"]').get_by_role('button',name='Abrir Persona',exact=True).click()
        page.get_by_role('button',name='Ecossistema',exact=True).click()
        expect(eco.get_by_role('button',name='Dores (1)',exact=True)).to_be_visible()
        page.reload(wait_until='networkidle')
        page.get_by_role('button',name='Personas',exact=True).click()
        page.locator(f'[data-persona-card="{pid}"]').get_by_role('button',name='Abrir Persona',exact=True).click()
        page.get_by_role('button',name='Ecossistema',exact=True).click()
        expect(eco.get_by_role('button',name='Necessidades (2)',exact=True)).to_be_visible()
        expect(eco.get_by_role('button',name='Pesquisas (1)',exact=True)).to_be_visible()
        check('Canonical connections and counts survive reload')
        eco.get_by_role('button',name='Desvincular fonte example.org',exact=True).click()
        expect(eco.get_by_role('button',name='Pesquisas (0)',exact=True)).to_be_visible()
        check('Removing a source preserves it in the shared evidence library',len(graph(page)['entities']['evidence'])==1)
        eco.get_by_role('button',name='Perfil de criação',exact=True).click()
        expect(page.locator('[data-persona-progressive-editor="1"]')).to_be_visible()
        check('Profile creation retains the original editor')
        page.get_by_label('Resumo da Persona',exact=True).fill('Perfil editado antes de voltar ao ecossistema.')
        page.get_by_role('button',name='Ecossistema',exact=True).click()
        eco.get_by_role('button',name='Salvar alterações',exact=True).click()
        expect(eco.get_by_role('button',name='Tudo salvo',exact=True)).to_be_visible()
        check('Header saves pending profile changes through the existing controller',graph(page)['entities']['persona'][pid]['description']=='Perfil editado antes de voltar ao ecossistema.')
        for label,width in [('tablet',834),('phone',390)]:
            page.set_viewport_size({'width':width,'height':1000})
            expect(eco).to_be_visible()
            check('No horizontal overflow on '+label,eco.evaluate('(el)=>el.scrollWidth<=el.clientWidth+1'))
            audit(page,label)
            page.screenshot(path=str(OUT/f'{label}.png'),animations='disabled',full_page=True)
        page.set_viewport_size({'width':1536,'height':1100})
        page.evaluate("()=>{const c=window.BlueOceanRuntime.api('collaboration');c.setCurrentUser(c.addMember({name:'Leitor QA',role:'viewer'}))}")
        page.reload(wait_until='networkidle');page.get_by_role('button',name='Personas',exact=True).click()
        page.locator(f'[data-persona-card="{pid}"]').get_by_role('button',name='Abrir Persona',exact=True).click();page.get_by_role('button',name='Ecossistema',exact=True).click()
        expect(eco.get_by_label('Nova dor da Persona')).to_be_disabled()
        expect(eco.get_by_label('Link da fonte de pesquisa')).to_be_disabled()
        check('Read-only roles cannot create or unlink ecosystem records',all(not b.is_enabled() for b in eco.locator('.bo-eco-unlink').all()))
        check('No JavaScript errors',not errors)
        browser.close()
    print(f'Persona ecosystem browser: {len(checks)} PASS')
finally:
    server.shutdown();server.server_close()

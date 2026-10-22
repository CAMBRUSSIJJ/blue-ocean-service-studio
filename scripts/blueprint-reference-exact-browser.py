#!/usr/bin/env python3
"""Acceptance: the user's original HTML is the Blueprint UI, and edits use the Service Graph."""
import functools, os, shutil, threading, json
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'blueprint-reference-exact'; OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
        page=b.new_page(viewport={'width':1536,'height':960})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:'+str(server.server_port),wait_until='networkidle')
        page.get_by_role('button',name='Abrir workspace local sem conta').click()
        page.get_by_role('button',name='Novo projeto',exact=True).click()
        page.get_by_label('Nome do projeto',exact=True).fill('Referência original do Blueprint')
        page.get_by_label('Serviço principal',exact=True).fill('Atendimento')
        page.get_by_role('button',name='Criar projeto',exact=True).click()
        page.locator('[data-service-blueprint-nav="1"]').click()
        page.get_by_role('button',name='Criar Blueprint',exact=True).first.click()
        exact=page.frame_locator('.bo-blueprint-reference-frame')
        expect(exact.locator('#app')).to_be_visible()
        if exact.locator('.st').count():
            expect(exact.get_by_text('Vamos montar um blueprint')).to_be_visible()
            exact.locator('input[data-f="st:title"]').fill('Serviço real de atendimento')
            exact.locator('input[data-f="st:persona"]').fill('Cliente da plataforma')
            exact.locator('#go').click()
        expect(exact.locator('.bd')).to_be_visible()
        expect(exact.locator('.pnl')).to_be_visible()
        assert exact.locator('.hd').count()==1
        assert exact.locator('.lb').count()>=5
        assert exact.locator('.cvb').count()==1
        assert exact.locator('.dv').count()>=3
        assert exact.locator('.ad').count()>=5
        # Direct editing updates canonical Journey entities, not isolated iframe localStorage.
        stages=page.evaluate("""() => {const g=window.BlueOceanRuntime.api('dataBridge').get();
          const b=Object.values(g.views.whiteboards).find(x=>x.viewKind==='blueprint');
          const j=g.journeys[b.journeyId]||Object.values(g.journeys)[0];
          return j.stageIds.map(id=>({id,title:g.stages[id].title}));}""")
        assert len(stages)>=2,stages
        slider=exact.locator('input[data-act="emo"]').first
        slider.evaluate("""el=>{el.value='-2';el.dispatchEvent(new Event('input',{bubbles:true}))}""")
        expect.poll if False else None
        page.wait_for_function("""id=>window.BlueOceanRuntime.api('dataBridge').get().stages[id].emotionScore===-2""",arg=stages[0]['id'],timeout=10000)
        exact.locator('button[data-act="alane"]').click()
        expect(exact.locator('[data-ed="ln"]')).to_have_count(1)
        note=exact.locator('.ad[data-act="add"]').first
        note.click()
        edit=exact.locator('.nw [data-ed="c"]').first
        edit.fill('Evidência real do serviço')
        edit.press('Tab')
        page.wait_for_function("""() => {const g=window.BlueOceanRuntime.api('dataBridge').get();
            return Object.values(g.entities.evidence||{}).some(x=>x.title==='Evidência real do serviço')}""",timeout=10000)
        exact.locator('button[data-act="addi"][data-t="d"]').first.click()
        issue=exact.locator('.it.d [data-ed="ix"]').first
        issue.fill('Atraso no atendimento')
        issue.press('Tab')
        page.wait_for_function("""() => Object.values(window.BlueOceanRuntime.api('dataBridge').get().problems||{})
            .some(x=>x.description==='Atraso no atendimento')""",timeout=10000)
        state=page.evaluate("""() => {
          const g=window.BlueOceanRuntime.api('dataBridge').get(),
          board=Object.values(g.views.whiteboards).find(x=>x.viewKind==='blueprint');
          return {custom:board.blueprintHosted?.lanes?.length||0,evidence:Object.values(g.entities.evidence||{}).length,issues:Object.values(g.problems||{}).length}
        }""")
        assert state['custom']==1,state
        page.screenshot(path=str(OUT/'blueprint-real-ui.png'),animations='disabled')
        assert exact.get_by_role('button',name='Modo profissional').count()==0, 'Retired UI still exposed'
        exact.get_by_role('button',name='Ferramentas').click()
        tools_dialog=page.get_by_role('dialog',name='Ferramentas do Blueprint')
        expect(tools_dialog).to_be_visible()
        tools_dialog.get_by_role('button',name='Revisar entrega').click()
        expect(page.get_by_role('dialog',name='Revisão da entrega')).to_be_visible()
        page.get_by_role('dialog',name='Revisão da entrega').get_by_role('button',name='Voltar ao mapa').click()
        expect(page.frame_locator('.bo-blueprint-reference-frame').locator('.bd')).to_be_visible()
        expect(page.frame_locator('.bo-blueprint-reference-frame').locator('[data-ed="ln"]')).to_have_count(1)
        assert not errors,errors
        print('Blueprint exact HTML + Service Graph persistence: OK')
        # The Journey uses the same original HTML directly, with no extra Blueprint step
        # and without seeded coffee examples or suggested cards.
        unified=b.new_page(viewport={'width':1440,'height':1000})
        unified.goto('http://127.0.0.1:'+str(server.server_port)+'/?__qa_unified_journey=1',wait_until='networkidle')
        if unified.get_by_role('button',name='Abrir workspace local sem conta').count():
            unified.get_by_role('button',name='Abrir workspace local sem conta').click()
        unified.locator('[data-service-journey-nav="1"]').click()
        unified.get_by_role('button',name='Criar Jornada',exact=True).first.click()
        unified.get_by_role('button',name='Criar e abrir mapa').click()
        journey=unified.frame_locator('.bo-blueprint-reference-frame')
        expect(journey.get_by_role('heading',name='Sua primeira etapa')).to_be_visible()
        assert journey.get_by_text('Preencher com o exemplo do café').count()==0
        assert journey.get_by_text('Ver exemplo pronto').count()==0
        journey.get_by_role('textbox',name='Nome da primeira etapa').fill('Conhecer o serviço')
        journey.get_by_role('button',name='Criar etapa').click()
        expect(journey.locator('.bd')).to_be_visible()
        assert journey.locator('.sg').count()==0, 'Reference must not inject suggestion examples'
        assert journey.locator('.st').count()==0, 'Starter must be replaced by the map'
        unified.wait_for_function("""() => {
          const g=window.BlueOceanRuntime.api('dataBridge').get();
          return Object.values(g.stages).some(st=>st.title==='Conhecer o serviço');
        }""",timeout=10000)
        journey.get_by_role('button',name='Voltar para Blueprints').click()
        expect(unified.locator('[data-journey-library="1"]')).to_be_visible()
        print('Unified Journey: original HTML, empty start and canonical stage persistence OK')
        unified.close()
        b.close()
finally:
    server.shutdown();server.server_close()

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
        expect(exact.locator('.bd')).to_be_visible(timeout=15000)
        # A new hosted map starts empty; no compulsory coffee demo or stage suggestions.
        while exact.locator('.sh').count() < 2:
            exact.locator('button[data-act="step"]').first.click()
            exact.get_by_role('textbox',name='Nome da nova etapa').fill('Etapa '+str(exact.locator('.sh').count()+1))
            exact.get_by_role('button',name='Adicionar etapa ao mapa',exact=True).click()
        expect(exact.locator('.bd')).to_be_visible()
        exact.get_by_role('button',name='Insights',exact=True).click()
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
        exact.locator('[data-act="emotion-edit"]').first.click()
        slider=exact.locator('input[data-act="emo"]').first
        slider.evaluate("""el=>{el.value='-2';el.dispatchEvent(new Event('input',{bubbles:true}))}""")
        exact.get_by_role('button',name='Concluir',exact=True).click()
        page.wait_for_function("""id=>window.BlueOceanRuntime.api('dataBridge').get().stages[id].emotionScore===-2""",arg=stages[0]['id'],timeout=10000)
        exact.get_by_role('button',name='+ Adicionar faixa',exact=True).click()
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
        exact.locator('.tools-menu summary').click()
        exact.get_by_role('button',name='Recursos avançados').click()
        tools_dialog=page.get_by_role('dialog',name='Ferramentas do Blueprint')
        expect(tools_dialog).to_be_visible()
        tools_dialog.get_by_role('button',name='Revisar entrega').click()
        expect(page.get_by_role('dialog',name='Revisão da entrega')).to_be_visible()
        page.get_by_role('dialog',name='Revisão da entrega').get_by_role('button',name='Voltar ao mapa').click()
        expect(page.frame_locator('.bo-blueprint-reference-frame').locator('.bd')).to_be_visible()
        expect(page.frame_locator('.bo-blueprint-reference-frame').locator('[data-ed="ln"]')).to_have_count(1)
        assert not errors,errors
        print('Blueprint exact HTML + Service Graph persistence: OK')
        b.close()
finally:
    server.shutdown();server.server_close()

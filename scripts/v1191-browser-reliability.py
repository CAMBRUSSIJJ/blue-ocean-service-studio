#!/usr/bin/env python3
"""V1.19.1 source-only real-browser reliability gate for Whiteboard Core.
Does not require Vite/dist. It serves prepared public runtime assets directly.
Requires Python Playwright and a Chromium executable.
"""
from __future__ import annotations
import json, os, shutil, sys, threading, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except Exception as exc:
    print(f'SKIP Playwright Python indisponível: {exc}', file=sys.stderr)
    raise SystemExit(2)

ROOT=Path(__file__).resolve().parents[1]
PORT=4181
HARNESS='''<!doctype html><html><head><meta charset="utf-8"><title>V1.19.1 Browser Reliability</title>
<link rel="stylesheet" href="/public/v1102-whiteboard.css"></head><body><div id="root"></div>
<script>
localStorage.clear(); sessionStorage.clear();
const now=new Date().toISOString();
const graph={schemaVersion:3,entities:{},research:{sources:{},collections:{},createdAt:now,updatedAt:now},integrity:{schemaVersion:3,migratedAt:now},views:{whiteboards:{}},service:{id:'service-browser',name:'Browser Reliability',description:'Whiteboard real-browser gate',journeyIds:[],createdAt:now,updatedAt:now},journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''}};
localStorage.setItem('realtalent-service-studio-v3-service-graph',JSON.stringify(graph));
</script>
<script type="module">import '/public/v1102-whiteboard.js'; window.__v1191Ready=true;</script>
</body></html>'''

class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
    def do_GET(self):
        if self.path.startswith('/__v1191-harness'):
            raw=HARNESS.encode('utf-8'); self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Content-Length',str(len(raw))); self.end_headers(); self.wfile.write(raw); return
        return super().do_GET()

def serve():
    os.chdir(ROOT)
    server=ThreadingHTTPServer(('127.0.0.1',PORT),Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start(); return server

def main():
    chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
    if not chromium:
        print('SKIP Chromium não encontrado',file=sys.stderr); return 2
    server=serve(); rows=[]; errors=[]
    def check(name,cond,detail=''):
        rows.append((name,bool(cond),detail)); print(('PASS' if cond else 'FAIL'),name,('— '+detail if detail else '')); errors.extend([] if cond else [name])
    try:
      with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1440,'height':900})
        page_errors=[]; page.on('pageerror',lambda e: page_errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{PORT}/__v1191-harness',wait_until='networkidle',timeout=30000)
        page.wait_for_function("() => window.__v1191Ready && window.BlueOceanRuntime?.api?.('whiteboardCore')",timeout=10000)
        created=page.evaluate("() => window.BlueOceanRuntime.api('whiteboardCore').createBlank('Reliability board')")
        if hasattr(created,'__await__'): pass
        page.wait_for_selector('.rt144-overlay',timeout=10000)
        page.wait_for_timeout(250)
        check('blank board inicia com zero objetos',page.locator('.rt144-item').count()==0)
        # Create six notes through real keyboard events from the canvas.
        view=page.locator('.rt144-view'); view.click(position={'x':500,'y':400})
        for _ in range(6):
            page.keyboard.press('s'); page.wait_for_timeout(35)
            view.click(position={'x':500,'y':400})
        items=page.locator('.rt144-item.card')
        check('seis post-its são criados',items.count()==6,f'count={items.count()}')
        positions=page.locator('.rt144-item.card').evaluate_all("els => els.map(e => [e.style.left,e.style.top].join(','))")
        check('placement evita sobreposição inicial',len(set(positions))==6,f'posições={positions}')
        # A11y baseline.
        a11y=page.locator('.rt144-item.card').evaluate_all("els => els.every(e => e.tabIndex===0 && e.getAttribute('role')==='button' && !!e.getAttribute('aria-label'))")
        check('objetos são focalizáveis e rotulados',a11y)
        live=page.locator('[aria-live="polite"][role="status"]').count()
        check('toast possui aria-live/role status',live>=1,f'count={live}')
        # Shortcut must not fire on focused toolbar button.
        before=items.count(); tool=page.locator('.rt144-tool').first; tool.focus(); page.keyboard.press('s'); page.wait_for_timeout(100); after=page.locator('.rt144-item.card').count()
        check('atalho S não dispara com botão focado',after==before,f'{before}->{after}')
        # Inspector typing: select a note then type into first textarea and verify same node/focus/value.
        first=page.locator('.rt144-item.card').first; first.click(); page.wait_for_timeout(100)
        ta=page.locator('.rt144-inspector textarea').first
        check('Inspector expõe textarea',ta.count()==1)
        if ta.count():
            ta.focus(); page.evaluate("() => { window.__v1191Textarea=document.activeElement; }")
            ta.fill('Cliente não sabe quando chega')
            page.wait_for_timeout(120)
            state=page.evaluate("() => ({same:window.__v1191Textarea===document.activeElement,connected:!!window.__v1191Textarea?.isConnected,value:window.__v1191Textarea?.value||''})")
            check('digitação preserva textarea/foco',state['same'] and state['connected'],json.dumps(state,ensure_ascii=False))
            check('digitação persiste texto completo no campo',state['value']=='Cliente não sabe quando chega',state['value'])
        # Real mouse drag on first item.
        first=page.locator('.rt144-item.card').first; box=first.bounding_box(); old=first.evaluate("e=>[e.style.left,e.style.top]")
        if box:
            page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2); page.mouse.down(); page.mouse.move(box['x']+box['width']/2+120,box['y']+box['height']/2+72,steps=5); page.mouse.up(); page.wait_for_timeout(150)
        new=page.locator('.rt144-item.card').first.evaluate("e=>[e.style.left,e.style.top]")
        check('drag real move o post-it',new!=old,f'{old}->{new}')
        # Real connection handle drag to a second card.
        cards=page.locator('.rt144-item.card'); cards.nth(0).click(); page.wait_for_timeout(100)
        handle=page.locator('.rt144-item.card').nth(0).locator('.conn-handle.right')
        target=cards.nth(1); hb=handle.bounding_box(); tb=target.bounding_box()
        before_edges=page.locator('.rt144-edges path.edge').count()
        if hb and tb:
            page.mouse.move(hb['x']+hb['width']/2,hb['y']+hb['height']/2); page.mouse.down(); page.mouse.move(tb['x']+tb['width']/2,tb['y']+tb['height']/2,steps=6); page.mouse.up(); page.wait_for_timeout(180)
        after_edges=page.locator('.rt144-edges path.edge').count()
        check('drag de handle cria conexão real',after_edges>before_edges,f'{before_edges}->{after_edges}')
        # Dynamic world: move an item far through DOM/model is not public; verify current world minimum plus coverage after real drag near edge not practical.
        page.screenshot(path=str(ROOT/'artifacts'/'v1191-browser-reliability.png'),full_page=True)
        check('sem pageerror no gate',not page_errors,' | '.join(page_errors))
        page.close(); browser.close()
    except Exception as exc:
      print('BROWSER GATE ERROR',repr(exc),file=sys.stderr); errors.append('harness crash')
    finally:
      server.shutdown(); server.server_close()
    print(f'\nBrowser Reliability: {len(rows)-sum(1 for _,v,_ in rows if not v)}/{len(rows)}')
    return 1 if errors else 0

if __name__=='__main__': raise SystemExit(main())

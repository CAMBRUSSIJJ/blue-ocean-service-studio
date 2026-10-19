from pathlib import Path
import shutil,sys
ROOT=Path(__file__).resolve().parents[1]
try:
    from playwright.sync_api import sync_playwright
except Exception as e:
    print('UNAVAILABLE Playwright:',e); sys.exit(2)
css=(ROOT/'src/runtime/interaction-accessibility-polish-h740h14.css').read_text(encoding='utf-8')+(ROOT/'src/runtime/persistent-global-sidebar-h740h13.css').read_text(encoding='utf-8')
html='''<div class="app"><aside class="bo1205h3-sidebar"><div class="bo-h701-nav-section"><button class="bo-h701-nav-section__label bo-h740h14-section-toggle" aria-expanded="true"><span>Contexto</span><span>−</span></button><div class="bo-h740h14-section-items"><button class="bo1205h3-nav-child" aria-current="page">Personas</button><button class="bo1205h3-nav-child">Problemas</button></div></div></aside><section class="main"><header class="bo-h740h14-compact-app-header"><span>Lavanderia / Design do serviço / Journey</span><span class="bo1163-save-status bo-h740h14-save-status saved">✓ Salvo neste dispositivo</span></header><nav class="bo-h740h13-project-context-nav"><button>Visão geral</button><button class="is-active" aria-current="page">Design do serviço</button><button>Pesquisa</button></nav><section class="bo-h740h7-capability-panel"><header><div><h3>Projetar</h3><p>Modele experiência, canais e operação.</p></div></header><ul><li><div class="bo-h740h7-capability-main"><span>◈</span><div><strong>Blueprint</strong><p><i>Não iniciado</i> Operação por trás da experiência.</p></div></div><em>Nada criado</em><button>Criar</button></li></ul></section></section></div>'''
base='''*{box-sizing:border-box}body{margin:0;font:14px system-ui;color:#172033}.app{display:grid;grid-template-columns:232px minmax(0,1fr);min-height:100vh}.bo1205h3-sidebar{padding:12px;border-right:1px solid #ddd}.main{min-width:0;background:#f8fafc}.main>header{display:flex;justify-content:space-between;align-items:center;padding:8px 18px;background:#fff}.bo-h740h7-capability-panel{margin:20px}.bo-h740h7-capability-panel ul{list-style:none;padding:0;margin:0}@media(max-width:700px){.app{grid-template-columns:82px minmax(0,1fr)}}'''
checks=[]
def ck(label,v): checks.append(bool(v)); print(('OK ' if v else 'FAIL ')+label)
chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
if not chromium: print('UNAVAILABLE Chromium não encontrado'); sys.exit(2)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900}); page.set_content(f'<style>{base}{css}</style>{html}')
    ck('Design do serviço visível',page.get_by_text('Design do serviço',exact=True).is_visible())
    ck('Status salvo explica dispositivo',page.get_by_text('✓ Salvo neste dispositivo',exact=True).is_visible())
    ck('Capability row legível','Operação por trás da experiência.' in page.locator('.bo-h740h7-capability-main p').inner_text())
    target=page.get_by_text('Personas',exact=True).bounding_box(); ck('Target sidebar >=40px',target and target['height']>=40)
    context=page.get_by_text('Design do serviço',exact=True).bounding_box(); ck('Target contextual >=40px',context and context['height']>=40)
    ck('Desktop sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':820,'height':900}); ck('Tablet sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':520,'height':900}); ck('Mobile sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    browser.close()
print(f"\nH7.40-H14 Browser Interaction & Accessibility: {sum(checks)}/{len(checks)} · {'PASS' if all(checks) else 'FAIL'}")
sys.exit(0 if all(checks) else 1)

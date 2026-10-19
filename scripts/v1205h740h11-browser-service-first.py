from pathlib import Path
import sys,shutil
ROOT=Path(__file__).resolve().parents[1]
try:
    from playwright.sync_api import sync_playwright
except Exception as e:
    print('UNAVAILABLE Playwright:',e); sys.exit(2)
css=(ROOT/'src/runtime/service-first-navigation-h740h11.css').read_text(encoding='utf-8')
html='''<div class="app"><aside class="sidebar"><button>Home</button><div class="global"><button class="active">Serviço</button><button>Templates</button></div></aside><main><section class="service"><h1>Projetos do serviço</h1><p>Escolha um projeto</p><div class="bo-h740h11-service-summary"><span>S</span><div><strong>1 projeto ativo</strong><small>Lavanderia</small></div><button>Abrir Serviço</button></div><div class="projects"><article>Lavanderia com entrega e coleta<button>Abrir projeto</button></article></div></section></main></div>'''
base='''*{box-sizing:border-box}.app{display:grid;grid-template-columns:232px minmax(0,1fr);min-height:100vh;background:#f6f8fa}.sidebar{background:#fff;border-right:1px solid #e3e8ef;padding:12px}.sidebar button{width:100%;display:block;border:0;background:#fff;padding:9px;text-align:left}.sidebar .active{background:#eaf3ff}main{min-width:0;padding:24px}.projects{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}.projects article{background:#fff;border:1px solid #dbe5ec;border-radius:12px;padding:16px}@media(max-width:760px){.app{grid-template-columns:1fr}.sidebar{display:none}.projects{grid-template-columns:1fr}}'''
checks=[]
def ck(label,value): checks.append(bool(value)); print(('OK ' if value else 'FAIL ')+label)
chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
if not chromium: print('UNAVAILABLE Chromium não encontrado'); sys.exit(2)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900}); page.set_content(f'<style>{base}{css}</style>{html}')
    ck('sidebar principal exibe Serviço', page.get_by_text('Serviço', exact=True).is_visible())
    ck('Serviço mostra Projetos do serviço', page.get_by_text('Projetos do serviço').is_visible())
    ck('projeto continua sendo objeto selecionável', page.get_by_text('Lavanderia com entrega e coleta').is_visible())
    ck('desktop sem overflow', page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':900,'height':900}); ck('tablet sem overflow', page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':600,'height':900}); ck('mobile sem overflow', page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    browser.close()
print(f"\nH7.40-H11 Browser Service-first: {sum(checks)}/{len(checks)} · {'PASS' if all(checks) else 'FAIL'}")
sys.exit(0 if all(checks) else 1)

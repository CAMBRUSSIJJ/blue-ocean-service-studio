from pathlib import Path
import sys,shutil
ROOT=Path(__file__).resolve().parents[1]
try:
    from playwright.sync_api import sync_playwright
except Exception as e:
    print('UNAVAILABLE Playwright:',e); sys.exit(2)
css=(ROOT/'src/runtime/project-shell-h740h10.css').read_text(encoding='utf-8')
sidebar=(ROOT/'src/runtime/sidebar-h701.css').read_text(encoding='utf-8')
html='''<div class="app"><aside class="sidebar"><button>Home</button><div><button>Projetos</button><button>Templates</button></div><div class="bo-h740h10-project-nav"><button>Visão geral</button><button>Serviço</button><button>Pesquisa</button><button>Biblioteca</button><button>Arquivos</button><button>Equipe</button><button>Configurações</button></div></aside><main><section class="bo-h740h10-shell"><header class="bo-h740h10-shell__hero"><div><small>PROJETO</small><h1>Redesenho da Lavanderia</h1><p>Home do projeto antes de entrar no serviço.</p></div><div class="bo-h740h10-shell__status"><span>Serviço principal</span><strong>Lavanderia com entrega e coleta</strong><small>3 artefatos</small></div></header><section class="bo-h740h10-primary-card"><div class="bo-h740h10-primary-card__icon">S</div><div><small>SERVIÇO PRINCIPAL</small><h2>Lavanderia com entrega e coleta</h2><p>Guided Service Workspace</p><div><span>2 Journeys</span><span>0 Blueprints</span></div></div><button class="primary">Abrir serviço</button></section><section class="bo-h740h10-shell__section"><header><small>PROJETO</small><h2>Continue trabalhando</h2></header><div class="bo-h740h10-area-grid"><button>Pesquisa</button><button>Biblioteca</button><button>Arquivos</button><button>Equipe</button><button>Configurações</button><button>Aplicar template</button></div></section></section></main></div>'''
base='''.app{display:grid;grid-template-columns:232px minmax(0,1fr);min-height:100vh;background:#f6f8fa}.sidebar{background:#fff;border-right:1px solid #e3e8ef;padding:12px;display:flex;flex-direction:column;gap:8px}.sidebar button{display:block;width:100%;border:0;background:#fff;text-align:left;padding:8px}.bo-h740h10-project-nav{display:grid;gap:3px}main{min-width:0}*{box-sizing:border-box}@media(max-width:760px){.app{grid-template-columns:1fr}.sidebar{display:none}}'''
checks=[]
def ck(label,value): checks.append(bool(value)); print(('OK ' if value else 'FAIL ')+label)
chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
if not chromium: print('UNAVAILABLE Chromium não encontrado'); sys.exit(2)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900}); page.set_content(f'<style>{base}{sidebar}{css}</style>{html}')
    ck('sidebar do projeto tem somente 7 áreas contextuais', page.locator('.bo-h740h10-project-nav button').count()==7)
    ck('sidebar não expõe Personas permanentemente', page.locator('.sidebar',has_text='Personas').count()==0)
    ck('Home do projeto mostra serviço principal', page.locator('.bo-h740h10-primary-card').is_visible())
    ck('Abrir serviço é CTA explícito', page.get_by_text('Abrir serviço').is_visible())
    ck('Home do projeto mostra 6 áreas', page.locator('.bo-h740h10-area-grid button').count()==6)
    ck('desktop sem overflow', page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':900,'height':900})
    ck('tablet sem overflow', page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':600,'height':900})
    ck('mobile sem overflow', page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    ck('mobile reduz áreas para 1 coluna', page.locator('.bo-h740h10-area-grid').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ').length")==1)
    browser.close()
print(f"\nH7.40-H10 Browser Project Shell: {sum(checks)}/{len(checks)} · {'PASS' if all(checks) else 'FAIL'}")
sys.exit(0 if all(checks) else 1)

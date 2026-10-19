from pathlib import Path
import shutil,sys
ROOT=Path(__file__).resolve().parents[1]
try:
    from playwright.sync_api import sync_playwright
except Exception as e:
    print('UNAVAILABLE Playwright:',e); sys.exit(2)
css=(ROOT/'src/runtime/persistent-global-sidebar-h740h13.css').read_text(encoding='utf-8')
html='''<div class="app"><aside class="side"><b>Blue Ocean</b><button>Home</button><h4>DESENHO DO SERVIÇO</h4><button>Serviço</button><button>Hierarquias</button><h4>CONTEXTO</h4><button>Personas</button><button>Problemas</button><button>Evidências</button><h4>GESTÃO</h4><button>Oportunidades</button><button>Catálogo de métricas</button></aside><section class="main"><nav class="bo-h740h13-project-context-nav"><button class="is-active">Visão geral</button><button>Serviço</button><button>Pesquisa</button><button>Biblioteca</button><button>Arquivos</button><button>Equipe</button><button>Configurações</button></nav><main><h1>Lavanderia com entrega e coleta</h1><p>Projeto aberto sem trocar a sidebar global.</p></main></section></div>'''
base='''*{box-sizing:border-box}body{margin:0;font:14px system-ui}.app{display:grid;grid-template-columns:232px minmax(0,1fr);min-height:100vh}.side{padding:14px;background:#fff;border-right:1px solid #e4e9ef}.side button{display:block;width:100%;border:0;background:transparent;text-align:left;padding:7px}.side h4{font-size:10px;color:#789;margin:15px 7px 5px}.main{min-width:0;background:#f7f9fb}.main main{padding:24px}@media(max-width:700px){.app{grid-template-columns:80px minmax(0,1fr)}.side{padding:8px}.side b,.side h4{display:none}.side button{font-size:0}.side button:before{content:'•';font-size:18px}}'''
checks=[]
def ck(label,v): checks.append(bool(v)); print(('OK ' if v else 'FAIL ')+label)
chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
if not chromium: print('UNAVAILABLE Chromium não encontrado'); sys.exit(2)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900}); page.set_content(f'<style>{base}{css}</style>{html}')
    ck('sidebar mantém Personas no projeto',page.get_by_text('Personas',exact=True).is_visible())
    ck('sidebar mantém Problemas no projeto',page.get_by_text('Problemas',exact=True).is_visible())
    ck('sidebar mantém Métricas no projeto',page.get_by_text('Catálogo de métricas',exact=True).is_visible())
    ck('contexto do projeto usa barra horizontal',page.get_by_text('Visão geral',exact=True).is_visible())
    ck('barra contextual inclui Biblioteca',page.get_by_text('Biblioteca',exact=True).is_visible())
    ck('desktop sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':820,'height':900}); ck('tablet sem overflow global',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':520,'height':900}); ck('mobile sem overflow global',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    browser.close()
print(f"\nH7.40-H13 Browser Persistent Sidebar: {sum(checks)}/{len(checks)} · {'PASS' if all(checks) else 'FAIL'}")
sys.exit(0 if all(checks) else 1)

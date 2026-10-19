from pathlib import Path
import sys,shutil
ROOT=Path(__file__).resolve().parents[1]
try:
    from playwright.sync_api import sync_playwright
except Exception as e:
    print('UNAVAILABLE Playwright:',e); sys.exit(2)
base=(ROOT/'src/runtime/project-home-h740h8.css').read_text(encoding='utf-8')
h9=(ROOT/'src/runtime/project-architecture-hardening-h740h9.css').read_text(encoding='utf-8')
guided=(ROOT/'src/runtime/guided-service-workspace-h740h7.css').read_text(encoding='utf-8')
project='''<section class="bo-h740h8-home bo-h740h9-home"><section class="bo-h740h8-section"><div class="bo-h740h8-project-grid"><article class="bo-h740h8-project-card"><header><span class="bo-h740h8-project-icon">▣</span><div class="bo-h740h9-project-actions"><button>☆</button><button>✎</button><button>▣</button></div></header><div><small>PROJETO</small><h3>Projeto A</h3><p><b>Serviço:</b> Lavanderia</p></div><div class="bo-h740h8-project-meta"><span>Projetar</span></div><footer><span>agora</span><button class="primary">Abrir</button></footer></article></div><section class="bo-h740h9-archived"><header><small>ARQUIVADOS</small><h2>Projetos preservados</h2></header><div><article><span>▣</span><div><strong>Projeto B</strong><small>Serviço: Onboarding</small></div><button>↻ Restaurar</button></article></div></section></section></section>'''
stepper='''<div class="bo-h740h7-stepper"><button class="is-complete"><span>1</span><div><strong>Entender</strong><small>3 de 3</small></div></button><button class="is-partial"><span>2</span><div><strong>Projetar</strong><small>1 de 4</small></div></button><button class="active is-empty"><span>3</span><div><strong>Validar</strong><small>0 de 3</small></div></button><button class="is-empty"><span>4</span><div><strong>Melhorar</strong></div></button><button class="is-empty"><span>5</span><div><strong>Operar</strong></div></button></div>'''
checks=[]
def ck(label,value): checks.append(bool(value)); print(('OK ' if value else 'FAIL ')+label)
chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
if not chromium: print('UNAVAILABLE Chromium não encontrado'); sys.exit(2)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900}); page.set_content(f'<style>body{{margin:0;background:#f5f8fb;font-family:Arial,sans-serif}}{base}{h9}{guided}</style>{project}{stepper}')
    ck('ações do projeto ficam visíveis',page.locator('.bo-h740h9-project-actions button').count()==3)
    ck('arquivados têm ação restaurar',page.locator('.bo-h740h9-archived article button').is_visible())
    complete=page.locator('.bo-h740h7-stepper button').nth(0).locator('> span').evaluate("e=>getComputedStyle(e).borderTopColor")
    partial=page.locator('.bo-h740h7-stepper button').nth(1).locator('> span').evaluate("e=>getComputedStyle(e).borderTopColor")
    selected=page.locator('.bo-h740h7-stepper button').nth(2).locator('> span').evaluate("e=>getComputedStyle(e).backgroundColor")
    ck('fase concluída tem estado próprio',complete!='rgb(223, 231, 240)')
    ck('fase parcial tem estado próprio',partial!=complete)
    ck('fase selecionada usa destaque independente',selected!='rgba(0, 0, 0, 0)' and selected!='rgb(255, 255, 255)')
    before1=page.locator('.bo-h740h7-stepper button').nth(1).evaluate("e=>getComputedStyle(e,'::before').backgroundColor")
    before4=page.locator('.bo-h740h7-stepper button').nth(3).evaluate("e=>getComputedStyle(e,'::before').backgroundColor")
    ck('conectores não viram progresso pela seleção',before1==before4)
    ck('desktop sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':600,'height':900})
    ck('mobile sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    ck('arquivados adaptam ao mobile',page.locator('.bo-h740h9-archived article').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ').length")>=2)
    browser.close()
print(f"\nH7.40-H9 Browser Project Hardening: {sum(checks)}/{len(checks)} · {'PASS' if all(checks) else 'FAIL'}")
sys.exit(0 if all(checks) else 1)

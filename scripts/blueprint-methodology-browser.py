#!/usr/bin/env python3
"""Acceptance checks for Blueprint structure, activity details and service delivery review."""
import functools
import json
import os
import re
import shutil
import threading
import traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'blueprint-methodology';OUT.mkdir(parents=True,exist_ok=True)
checks=[];failures=[]
def check(label,condition):
    checks.append({'name':label,'passed':bool(condition)})
    print(('PASS ' if condition else 'FAIL ')+label,flush=True)
    if not condition: raise AssertionError(label)
def graph(page): return page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').get()")
def board(page): return next(b for b in graph(page)['views']['whiteboards'].values() if b.get('viewKind')=='blueprint')
def record(page,kind): return next(iter(graph(page)['entities'][kind].values()))
def create(page):
    page.goto(URL,wait_until='networkidle')
    page.get_by_role('button',name='Abrir workspace local sem conta').click()
    page.get_by_role('button',name='Novo projeto',exact=True).click()
    page.get_by_label('Nome do projeto',exact=True).fill('Blueprint e promessa QA')
    page.get_by_label('Serviço principal',exact=True).fill('Atendimento')
    page.get_by_role('button',name='Criar projeto',exact=True).click()
    page.locator('[data-service-blueprint-nav="1"]').click()
    page.get_by_role('button',name='Criar Blueprint',exact=True).first.click()
    expect(page.locator('.bo1174-board')).to_be_visible()
def options(page,name):
    page.get_by_role('button',name='Opções',exact=True).click()
    page.get_by_role('dialog',name='Ferramentas do editor',exact=True).get_by_role('button',name=re.compile('^.*'+re.escape(name))).click()
def review(page):
    options(page,'Revisar entrega')
    target=page.get_by_role('dialog',name='Revisão da entrega',exact=True)
    expect(target).to_be_visible()
    return target
def add(page,layer,text):
    cell=page.locator(f'.bo1203-service-cell[data-layer="{layer}"]')
    cell.click(position={'x':55,'y':45})
    entry=cell.locator('.bo-editor-cell-entry textarea')
    expect(entry).to_be_visible()
    entry.fill(text)
    if layer=='evidence': cell.get_by_label('Formato da evidência',exact=True).select_option('digital')
    entry.press('Enter')
def edit(page,kind):
    item=next(i for i in board(page)['items'].values() if i.get('objectKind')==kind)
    page.locator(f'.rt144-item[data-id="{item["id"]}"]').click()
    page.locator('.rt190-context-toolbar').get_by_role('button',name='Editar',exact=True).click()
    target=page.get_by_role('dialog',name='Evidência do serviço' if kind=='evidence' else 'Detalhes da atividade',exact=True)
    expect(target).to_be_visible()
    return target
def fill_activity(target,new=False):
    if new:
        target.get_by_label('Novo papel',exact=True).fill('Atendente')
        target.get_by_label('Novo canal',exact=True).fill('Chat')
    else: target.get_by_role('checkbox',name='Atendente',exact=True).check()
    for label,value in [('Tempo de execução (min)','5'),('Tempo de espera (min)','0'),('Prazo combinado (min)','10'),('Capacidade (atendimentos/h)','12'),('Demanda prevista (atendimentos/h)','8')]: target.get_by_label(label,exact=True).fill(value)
    target.get_by_label('O que pode dar errado?',exact=True).fill('Sistema indisponível')
    target.get_by_label('Como recuperar a entrega?',exact=True).fill('Usar atendimento alternativo e informar o cliente')
    target.get_by_role('checkbox',name='Esta atividade contribui para a promessa',exact=True).check()
    target.get_by_label('Como contribui para a promessa?',exact=True).fill('Mantém o retorno ao cliente dentro do prazo')
    target.get_by_label('O que é comunicado ao cliente?',exact=True).fill('Recebemos sua solicitação; o retorno ocorre em até dez minutos.')
def audit(page,target,name):
    if not os.environ.get('AXE_PATH'): return
    page.add_script_tag(path=os.environ['AXE_PATH'])
    selector=target.evaluate("e => {e.dataset.methodologyAudit='current'; return '[data-methodology-audit=current]'}")
    data=page.evaluate("async selector => (await axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))",selector)
    (OUT/(name+'-accessibility.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2))
    check(name+' has no automated WCAG A/AA violations',not data)
def desktop(page):
    create(page)
    page.get_by_role('button',name='Adicionar etapa',exact=True).click()
    stage=page.get_by_role('dialog',name='Nova etapa',exact=True)
    stage.get_by_placeholder('Ex.: Pagamento',exact=True).fill('Solicitar atendimento')
    stage.get_by_placeholder('Ex.: escolhe uma forma de pagamento',exact=True).fill('Solicita ajuda')
    stage.get_by_role('button',name='Criar etapa',exact=True).click()
    for _ in range(3): page.locator('.bo1174-statusbar button[title="Reduzir zoom"]').click()
    check('Operational Blueprint has six structural layers',page.locator('.bo1203-service-lane').count()==6)
    check('All three conceptual boundaries appear in the operational view',page.locator('.bo1203-service-line').count()==3 and page.locator('.bo1203-service-line.internal').count()==1)
    check('The canvas keeps one compact header',page.locator('.bo1174-board-header button').count()<=5)
    add(page,'evidence','Comprovante digital de solicitação')
    artifact=record(page,'evidence')
    check('Evidence created in its row has an explicit service purpose and medium',artifact['evidencePurpose']=='service' and artifact['evidenceMedium']=='digital')
    for layer,text in [('frontstage','Confirmar recebimento'),('backstage','Validar cadastro'),('process','Encaminhar solicitação'),('enablement','Central de atendimento')]: add(page,layer,text)
    initial_items=set(board(page)['items'])
    target=edit(page,'frontstage')
    target.get_by_label('Novo papel',exact=True).fill('Papel cancelado')
    target.get_by_label('Tempo de execução (min)',exact=True).fill('99')
    target.get_by_role('button',name='Cancelar',exact=True).click()
    check('Cancelling details creates no roles and changes no estimates',not graph(page)['entities'].get('role') and not record(page,'frontstage').get('operationalDetails'))
    target=edit(page,'frontstage');fill_activity(target,True)
    target.get_by_label('Tempo de execução (min)',exact=True).fill('-1')
    target.get_by_role('button',name='Salvar atividade',exact=True).click()
    check('Invalid numeric values are blocked before saving',target.is_visible() and not record(page,'frontstage').get('operationalDetails'))
    target.get_by_label('Tempo de execução (min)',exact=True).fill('5')
    target.get_by_label('Prazo combinado (min)',exact=True).fill('4')
    target.get_by_label('Demanda prevista (atendimentos/h)',exact=True).fill('20')
    audit(page,target,'activity-details')
    page.screenshot(path=str(OUT/'activity-details.png'),animations='disabled')
    target.get_by_role('button',name='Salvar atividade',exact=True).click()
    saved=record(page,'frontstage');role_id=next(iter(graph(page)['entities']['role']))
    check('Activity saves canonical role, channel and explicit zero waiting time',saved['roleIds']==[role_id] and len(saved['channelIds'])==1 and saved['operationalDetails']['waitMinutes']==0)
    check('Adding operational metadata does not create extra canvas cards',set(board(page)['items'])==initial_items)
    target=review(page)
    check('Review identifies an infeasible deadline',target.locator('[data-issue-code="sla-infeasible"]').count()==1)
    check('Review identifies insufficient capacity',target.locator('[data-issue-code="capacity-insufficient"]').count()==1)
    check('An undefined promise is visible as a gap',target.locator('[data-issue-code="promise-missing"]').count()==1)
    target.get_by_role('button',name='Voltar ao mapa',exact=True).click()
    before_service=graph(page)['service'].get('proposition')
    options(page,'Estratégia do serviço');target=page.get_by_role('dialog',name='Estratégia do serviço',exact=True)
    target.get_by_label('Origem da promessa',exact=True).select_option('custom')
    target.get_by_label('Promessa deste Blueprint',exact=True).fill('Retornar ao cliente em até dez minutos')
    target.get_by_text('Marketing de serviços · 7 Ps',exact=True).click()
    for label in ['Serviço e proposta de valor','Preço e condições','Canais e acesso','Comunicação da promessa','Pessoas','Processos','Evidências físicas e digitais']: target.get_by_label(label,exact=True).fill('Descrição de '+label)
    target.get_by_text('Qualidade percebida',exact=True).click()
    target.get_by_label('Critério de confiabilidade',exact=True).fill('Confirmar o recebimento dentro do prazo comunicado')
    audit(page,target,'service-strategy')
    page.screenshot(path=str(OUT/'service-strategy.png'),animations='disabled')
    target.get_by_role('button',name='Salvar estratégia',exact=True).click()
    strategy=board(page)['serviceStrategy']
    check('Seven marketing dimensions and quality criteria are saved on the Blueprint',all(strategy.get(k) for k in ['product','price','place','promotion','people','process','physicalEvidence']) and strategy['qualityCriteria']['reliability']['criterion'])
    check('A Blueprint promise does not overwrite the service proposition',graph(page)['service'].get('proposition')==before_service)
    options(page,'Estratégia do serviço');target=page.get_by_role('dialog',name='Estratégia do serviço',exact=True)
    target.get_by_label('Promessa deste Blueprint',exact=True).fill('Alteração cancelada')
    target.get_by_role('button',name='Cancelar',exact=True).click()
    check('Cancelling strategy preserves the saved promise',board(page)['serviceStrategy']==strategy)
    page.get_by_role('button',name='Desfazer',exact=True).click()
    check('Strategy changes can be undone in one transaction',not board(page).get('serviceStrategy') and record(page,'frontstage')['roleIds']==[role_id])
    page.get_by_role('button',name='Refazer',exact=True).click()
    check('Redo restores marketing, promise and quality criteria together',board(page)['serviceStrategy']==strategy)
    target=edit(page,'frontstage')
    target.get_by_label('Prazo combinado (min)',exact=True).fill('10')
    target.get_by_label('Demanda prevista (atendimentos/h)',exact=True).fill('8')
    target.get_by_role('button',name='Salvar atividade',exact=True).click()
    for kind in ['backstage','process']:
        target=edit(page,kind);fill_activity(target)
        target.get_by_role('button',name='Salvar atividade',exact=True).click()
    target=edit(page,'evidence');target.get_by_label('Uso da evidência',exact=True).select_option('research');target.get_by_role('button',name='Salvar evidência',exact=True).click()
    target=review(page)
    check('Research remains preserved and cannot fill the service evidence requirement',target.locator('[data-issue-code="layer-evidence"]').count()==1 and record(page,'evidence')['evidencePurpose']=='research')
    target.get_by_role('button',name='Voltar ao mapa',exact=True).click()
    target=edit(page,'evidence');target.get_by_label('Uso da evidência',exact=True).select_option('service');target.get_by_label('Formato',exact=True).select_option('physical');target.get_by_role('button',name='Salvar evidência',exact=True).click()
    target=edit(page,'frontstage');target.get_by_role('checkbox',name='Validar cadastro · Solicitar atendimento',exact=True).check();target.get_by_role('button',name='Salvar atividade',exact=True).click()
    target=edit(page,'backstage');target.get_by_role('checkbox',name='Confirmar recebimento · Solicitar atendimento',exact=True).check();target.get_by_role('button',name='Salvar atividade',exact=True).click()
    target=review(page)
    check('Circular dependencies are reported through the user interface',target.locator('[data-issue-code="dependency-cycle"]').count()>0)
    target.get_by_role('button',name='Voltar ao mapa',exact=True).click()
    page.get_by_role('button',name='Desfazer',exact=True).click()
    target=review(page)
    check('A complete, consistent drawing is ready for human review',target.get_by_text('Pronto para revisão humana',exact=True).is_visible() and target.locator('[data-issue-code]').count()==0)
    target.get_by_text('Marketing e qualidade · complementos',exact=True).click()
    check('Marketing coverage is separate from operational validation','7/7 dimensões' in target.inner_text())
    audit(page,target,'delivery-review')
    page.screenshot(path=str(OUT/'delivery-review.png'),animations='disabled')
    target.get_by_role('button',name='Voltar ao mapa',exact=True).click()
    saved_board=board(page);saved_activities={kind:record(page,kind)['operationalDetails'] for kind in ['frontstage','backstage','process']}
    page.reload(wait_until='networkidle')
    check('Reload preserves strategy, evidence classification and all activity details',board(page)['serviceStrategy']==saved_board['serviceStrategy'] and record(page,'evidence')['evidencePurpose']=='service' and all(record(page,k)['operationalDetails']==v for k,v in saved_activities.items()))

def responsive(page):
    create(page)
    options(page,'Estratégia do serviço');target=page.get_by_role('dialog',name='Estratégia do serviço',exact=True)
    target.get_by_label('Origem da promessa',exact=True).select_option('custom')
    target.get_by_label('Promessa deste Blueprint',exact=True).fill('Atender com clareza')
    target.get_by_text('Marketing de serviços · 7 Ps',exact=True).click()
    target.get_by_label('Preço e condições',exact=True).fill('Valor informado antes da contratação')
    target.get_by_role('button',name='Salvar estratégia',exact=True).scroll_into_view_if_needed()
    rect=target.bounding_box()
    check('Strategy form fits the responsive viewport',rect['x']>=0 and rect['x']+rect['width']<=page.viewport_size['width']+1)
    check('Strategy save action remains reachable',target.get_by_role('button',name='Salvar estratégia',exact=True).is_visible())
    audit(page,target,f'strategy-{page.viewport_size["width"]}')
    page.screenshot(path=str(OUT/f'service-strategy-{page.viewport_size["width"]}.png'),animations='disabled')
    target.get_by_role('button',name='Salvar estratégia',exact=True).click()
    check('Strategy can be completed on a responsive viewport',board(page)['serviceStrategy']['servicePromise']=='Atender com clareza')

def mobile_review(page):
    create(page)
    page.set_viewport_size({'width':390,'height':844})
    expect(page.locator('.bo1175-mobile-read-badge')).to_be_visible()
    page.get_by_role('button',name='Opções',exact=True).click()
    menu=page.get_by_role('dialog',name='Ferramentas do editor',exact=True)
    check('Mobile does not offer the strategy editing action',menu.get_by_role('button',name=re.compile('Estratégia do serviço')).count()==0)
    menu.get_by_role('button',name=re.compile('Revisar entrega')).click()
    target=page.get_by_role('dialog',name='Revisão da entrega',exact=True)
    expect(target).to_be_visible()
    rect=target.bounding_box()
    check('Mobile review fits the viewport',rect['x']>=0 and rect['x']+rect['width']<=391)
    check('Mobile review exposes gaps without editing actions',target.get_by_text('Há inconsistências para resolver',exact=True).is_visible() and target.get_by_role('button',name='Definir promessa',exact=True).count()==0)
    audit(page,target,'mobile-review')
    target.get_by_role('button',name='Voltar ao mapa',exact=True).scroll_into_view_if_needed()
    page.screenshot(path=str(OUT/'mobile-review.png'),animations='disabled')
    target.get_by_role('button',name='Voltar ao mapa',exact=True).click()
    check('Mobile can return from the review to the map',page.get_by_role('dialog',name='Revisão da entrega',exact=True).count()==0)

def legacy_map(page):
    create(page)
    page.get_by_role('button',name='Adicionar etapa',exact=True).click()
    stage=page.get_by_role('dialog',name='Nova etapa',exact=True)
    stage.get_by_placeholder('Ex.: Pagamento',exact=True).fill('Entrega')
    stage.get_by_placeholder('Ex.: escolhe uma forma de pagamento',exact=True).fill('Recebe o pedido')
    stage.get_by_role('button',name='Criar etapa',exact=True).click()
    for _ in range(3): page.locator('.bo1174-statusbar button[title="Reduzir zoom"]').click()
    add(page,'evidence','Comprovante antigo')
    add(page,'backstage','Conferir pedido')
    # Load a legacy fixture through the regular persistence bridge. Actions above
    # and all classification/repair actions below use visible UI controls.
    page.evaluate("""() => window.BlueOceanRuntime.api('dataBridge').transact(g => {
      const b=Object.values(g.views.whiteboards).find(b=>b.viewKind==='blueprint');
      const evidence=Object.values(b.items).find(i=>i.objectKind==='evidence');
      const back=Object.values(b.items).find(i=>i.objectKind==='backstage');
      b.serviceFrameVersion=1;b.legacyAnnotation={text:'Nota preservada'};
      evidence.serviceLayer='customer';delete g.entities.evidence[evidence.objectId].evidencePurpose;
      g.entities.evidence[evidence.objectId].legacyContent={source:'Arquivo antigo'};
      b.edges.legacy={id:'legacy',fromId:evidence.id,toId:back.id,label:'Sustenta a entrega',style:'solid',arrow:'end'};
      return g;
    },'Carregar fixture legada')""")
    saved=board(page);artifact=record(page,'evidence')
    check('Legacy map is realigned once while retaining annotations and edges',saved['serviceFrameVersion']==2 and saved['legacyAnnotation']['text']=='Nota preservada' and saved['edges']['legacy']['label']=='Sustenta a entrega')
    check('Legacy evidence keeps its original identity, contents and unclassified purpose',artifact['title']=='Comprovante antigo' and artifact['legacyContent']['source']=='Arquivo antigo' and not artifact.get('evidencePurpose'))
    target=review(page)
    check('Legacy artifacts explicitly request classification',target.locator('[data-issue-code="evidence-purpose"]').count()==1)
    target.get_by_role('button',name='Voltar ao mapa',exact=True).click()
    target=edit(page,'evidence');target.get_by_label('Uso da evidência',exact=True).select_option('service');target.get_by_role('button',name='Salvar evidência',exact=True).click()
    check('Classifying legacy evidence preserves unknown metadata and identity',record(page,'evidence')['id']==artifact['id'] and record(page,'evidence')['legacyContent']==artifact['legacyContent'])
    page.get_by_role('button',name='Desfazer',exact=True).click()
    check('A legacy classification is undone without another migration history entry',not record(page,'evidence').get('evidencePurpose') and board(page)['serviceFrameVersion']==2)
    page.screenshot(path=str(OUT/'legacy-blueprint.png'),animations='disabled')

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=None
URL=os.environ.get('BLUE_OCEAN_URL')
if not URL:
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT/'dist')))
    threading.Thread(target=server.serve_forever,daemon=True).start();URL=f'http://127.0.0.1:{server.server_port}'
# Exercise the retired editor only in localhost regression runs, never in Production.
URL += ('&' if '?' in URL else '?') + '__qa_legacy_blueprint=1'

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
        for name,flow,width,height in [('desktop',desktop,1440,1200),('tablet',responsive,820,1180),('mobile',mobile_review,1440,1200),('legacy',legacy_map,1440,1200)]:
            if name not in os.environ.get('BLUEPRINT_QA_FLOWS','desktop,tablet,mobile,legacy').split(','): continue
            context=browser.new_context(viewport={'width':width,'height':height},has_touch=name=='tablet')
            page=context.new_page();page.set_default_timeout(12000);errors=[];page.on('pageerror',lambda error: errors.append(str(error)))
            try:
                flow(page);check(name+' has no JavaScript errors',not errors)
            except Exception:
                failures.append({'flow':name,'traceback':traceback.format_exc(),'pageErrors':errors});print(failures[-1]['traceback'],flush=True);page.screenshot(path=str(OUT/f'{name}-failure.png'))
            context.close()
        browser.close()
finally:
    if server: server.shutdown();server.server_close()
(OUT/'result.json').write_text(json.dumps({'checks':checks,'failures':failures},ensure_ascii=False,indent=2)+'\n')
print(f'Blueprint methodology: {sum(c["passed"] for c in checks)}/{len(checks)} checks; {len(failures)} failed workflows')
raise SystemExit(1 if failures or any(not c['passed'] for c in checks) else 0)

import { runtime } from './runtime-registry.js';

const VERSION = '__APP_VERSION__';
const TYPES = {
  interview: 'Entrevista', observation: 'Observação', survey: 'Pesquisa', support: 'Atendimento',
  analytics: 'Analytics', document: 'Documento', workshop: 'Workshop', other: 'Outro'
};
const CONFIDENCE = { hypothesis: 'Hipótese', partial: 'Evidência parcial', evidenced: 'Evidenciado' };
const state = { tab: 'sources', search: '', sourceType: 'all' };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const now = () => new Date().toISOString();
const fmt = (v) => { if (!v) return '—'; try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)); } catch { return '—'; } };
function bridge(){ return runtime.api('dataBridge'); }
function getGraph(){ return bridge()?.get?.() || null; }
function ensureResearch(g){
  g.research ||= { sources: {}, collections: {}, createdAt: now(), updatedAt: now() };
  g.research.sources ||= {};
  g.research.collections ||= {};
  g.entities ||= {};
  g.entities.evidence ||= {};
  g.entities.insight ||= {};
  return g;
}
function journeyId(g){ return bridge()?.currentJourneyId?.() || g?.service?.journeyIds?.[0] || ''; }
function stageList(g){ const j=g?.journeys?.[journeyId(g)]; return (j?.stageIds||[]).map(id=>g.stages?.[id]).filter(Boolean); }
function evidence(g){ ensureResearch(g); return Object.values(g.entities.evidence||{}); }
function insights(g){ ensureResearch(g); return Object.values(g.entities.insight||{}); }
function sources(g){ ensureResearch(g); return Object.values(g.research.sources||{}); }
function sourceLabel(g,id){ return g?.research?.sources?.[id]?.title || 'Fonte removida'; }
function mutate(fn,label){ const b=bridge(); if(!b?.transact) return false; b.transact((g)=>{ ensureResearch(g); fn(g); g.research.updatedAt=now(); return g; }, label); refresh(); return true; }
function summary(g){
  const ss=sources(g), ev=evidence(g), ins=insights(g);
  const strong=ev.filter(x=>x.confidence==='evidenced').length;
  const linked=ins.filter(x=>x.promotedTo?.id).length;
  const unlinked=ev.filter(x=>!(x.insightIds||[]).length).length;
  return { sources:ss.length, evidence:ev.length, strong, insights:ins.length, promoted:linked, unlinked };
}
function hideOtherHomes(){ runtime.api('journeyHomeShell')?.hide?.(); runtime.api('globalShell')?.hideBlueprintHome?.(); runtime.api('operatingReview')?.hide?.(); }
function markNav(active){ document.querySelectorAll('[data-rt192-research-nav]').forEach(b=>b.classList.toggle('is-active',active)); }
function ensureNav(){
  const aside=document.querySelector('aside.rt182-host-sidebar, aside'); if(!aside || aside.dataset.boPrecisionSidebarNative==='1' || aside.querySelector('[data-rt192-research-nav]')) return;
  const stack=aside.querySelector('nav .flex.flex-col') || aside.querySelector('nav'); if(!stack) return;
  const blueprint=aside.querySelector('[data-rt182-blueprint-nav]');
  const btn=document.createElement('button'); btn.type='button'; btn.dataset.rt192ResearchNav='1'; btn.title='Pesquisa'; btn.className='rt192-research-nav';
  btn.innerHTML='<span class="rt192-nav-icon" aria-hidden="true">⌕</span><span class="rt192-nav-label">Pesquisa</span>';
  btn.onclick=(e)=>{e.preventDefault();e.stopPropagation();show();};
  if(blueprint?.nextSibling) stack.insertBefore(btn,blueprint.nextSibling);
  else stack.appendChild(btn);
}
function shell(){
  let root=document.getElementById('rt192-research-home');
  if(!root){ root=document.createElement('div'); root.id='rt192-research-home'; root.className='rt192-research-home'; root.hidden=true; document.body.appendChild(root); }
  return root;
}
function show(){ hideOtherHomes(); ensureNav(); const root=shell(); root.hidden=false; markNav(true); render(); }
function hide(){ const root=document.getElementById('rt192-research-home'); if(root) root.hidden=true; markNav(false); }
function refresh(){ const root=document.getElementById('rt192-research-home'); if(root && !root.hidden) render(); runtime.emit?.('rt-research-changed', summary(getGraph()||{})); }
function filteredSources(g){ let arr=sources(g); const q=state.search.trim().toLowerCase(); if(q) arr=arr.filter(x=>`${x.title} ${x.summary||''} ${(x.tags||[]).join(' ')} ${x.owner||''}`.toLowerCase().includes(q)); if(state.sourceType!=='all')arr=arr.filter(x=>x.type===state.sourceType); return arr.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))); }
function evidenceRows(g){ let arr=evidence(g); const q=state.search.trim().toLowerCase(); if(q) arr=arr.filter(x=>`${x.title||''} ${x.description||''} ${sourceLabel(g,(x.sourceIds||[])[0])}`.toLowerCase().includes(q)); return arr.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))); }
function insightRows(g){ let arr=insights(g); const q=state.search.trim().toLowerCase(); if(q) arr=arr.filter(x=>`${x.title||''} ${x.description||''}`.toLowerCase().includes(q)); return arr.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))); }
function confidenceBadge(v){ const key=v||'hypothesis'; return `<span class="rt192-confidence ${key}">${key==='evidenced'?'●':key==='partial'?'◐':'○'} ${esc(CONFIDENCE[key]||key)}</span>`; }
function sourceCard(x,g){ const count=evidence(g).filter(e=>(e.sourceIds||[]).includes(x.id)).length; return `<article class="rt192-card source"><header><span class="rt192-type">${esc(TYPES[x.type]||'Fonte')}</span><button data-source-menu="${esc(x.id)}">•••</button></header><h3>${esc(x.title)}</h3><p>${esc(x.summary||'Sem resumo')}</p><footer><span>${count} evidência${count===1?'':'s'}</span><span>${esc(x.owner||'Sem responsável')}</span><span>${fmt(x.date||x.updatedAt)}</span></footer></article>`; }
function evidenceCard(x,g){ const st=g.stages?.[x.stageId]; const src=(x.sourceIds||[]).map(id=>sourceLabel(g,id)); return `<article class="rt192-card evidence"><header>${confidenceBadge(x.confidence)}<button data-evidence-menu="${esc(x.id)}">•••</button></header><h3>${esc(x.title||'Evidência')}</h3><p>${esc(x.description||'')}</p><div class="rt192-meta-row"><span>${esc(st?.title||'Sem etapa')}</span><span>${src.length?esc(src.join(', ')):'Sem fonte'}</span>${x.sample?`<span>Amostra ${esc(x.sample)}</span>`:''}</div><footer><button data-promote-evidence="${esc(x.id)}">Criar insight →</button><span>${(x.insightIds||[]).length} insight(s)</span></footer></article>`; }
function insightCard(x,g){ const st=g.stages?.[x.stageId]; const evs=(x.evidenceIds||[]).length; const promoted=x.promotedTo?.id ? `${x.promotedTo.kind==='problem'?'Problema':'Oportunidade'} criado` : 'Ainda não promovido'; return `<article class="rt192-card insight"><header><span class="rt192-type">INSIGHT</span><button data-insight-menu="${esc(x.id)}">•••</button></header><h3>${esc(x.title||'Insight')}</h3><p>${esc(x.description||'')}</p><div class="rt192-meta-row"><span>${esc(st?.title||'Sem etapa')}</span><span>${evs} evidência${evs===1?'':'s'}</span></div><footer>${x.promotedTo?.id?`<span class="rt192-promoted">✓ ${promoted}</span>`:`<span class="rt192-inline-actions"><button data-promote-insight="problem:${esc(x.id)}">Problema</button><button data-promote-insight="opportunity:${esc(x.id)}">Oportunidade</button></span>`}</footer></article>`; }
function renderTrace(g){ const ss=sources(g), ev=evidence(g), ins=insights(g); if(!ev.length&&!ins.length)return '<div class="rt192-empty"><b>A rastreabilidade aparece conforme a pesquisa evolui.</b><span>Fonte → Evidência → Insight → Problema/Oportunidade.</span></div>'; const rows=[]; for(const e of ev){ const related=ins.filter(i=>(i.evidenceIds||[]).includes(e.id)); if(!related.length) rows.push(`<div class="rt192-trace-row"><span>${esc((e.sourceIds||[]).map(id=>sourceLabel(g,id)).join(', ')||'Sem fonte')}</span><i>→</i><b>${esc(e.title||'Evidência')}</b><i>→</i><em class="muted">Insight pendente</em></div>`); for(const i of related) rows.push(`<div class="rt192-trace-row"><span>${esc((e.sourceIds||[]).map(id=>sourceLabel(g,id)).join(', ')||'Sem fonte')}</span><i>→</i><b>${esc(e.title||'Evidência')}</b><i>→</i><b>${esc(i.title)}</b><i>→</i><em>${i.promotedTo?.id?esc(i.promotedTo.kind==='problem'?'Problema':'Oportunidade'):'Decisão pendente'}</em></div>`); }
  return `<div class="rt192-trace">${rows.join('')}</div>`;
}
function render(){
  const root=shell(), g=getGraph(); if(!g){root.innerHTML='<div class="rt192-loading">Carregando pesquisa…</div>';setTimeout(render,80);return;} ensureResearch(g); const s=summary(g);
  root.innerHTML=`<div class="rt192-shell bo1173-workspace-shell"><header class="rt192-header bo1173-page-head"><div><span class="rt192-eyebrow bo1173-eyebrow">ENTENDER · RESEARCH REPOSITORY</span><h1>Pesquisa & Evidências</h1><p>Transforme observações em evidências rastreáveis, insights e decisões de melhoria.</p></div><div class="rt192-header-actions"><button class="rt192-btn ghost" data-new-evidence>+ Evidência</button><button class="rt192-btn primary" data-new-source>+ Fonte de pesquisa</button></div></header>
  <section class="rt192-summary bo1173-kpis"><article><b>${s.sources}</b><span>fontes</span></article><article><b>${s.evidence}</b><span>evidências</span></article><article><b>${s.strong}</b><span>evidências fortes</span></article><article><b>${s.insights}</b><span>insights</span></article><article><b>${s.promoted}</b><span>decisões promovidas</span></article></section>
  <div class="rt192-toolbar bo1173-toolbar"><div class="rt192-search"><span>⌕</span><input data-search placeholder="Buscar pesquisa, evidências e insights…" value="${esc(state.search)}"></div>${state.tab==='sources'?`<select data-source-filter><option value="all">Todos os tipos</option>${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${state.sourceType===k?'selected':''}>${esc(v)}</option>`).join('')}</select>`:''}<div class="rt192-tabs bo1173-tabs"><button data-tab="sources" class="${state.tab==='sources'?'active':''}">Fontes</button><button data-tab="evidence" class="${state.tab==='evidence'?'active':''}">Evidências</button><button data-tab="insights" class="${state.tab==='insights'?'active':''}">Insights</button><button data-tab="trace" class="${state.tab==='trace'?'active':''}">Rastreabilidade</button></div></div>
  <main class="rt192-content bo1173-workspace-main">${state.tab==='sources'?`<div class="rt192-section-head"><div><h2>Fontes de pesquisa</h2><p>Entrevistas, observações, pesquisas, tickets, analytics, documentos e workshops.</p></div><button data-new-source>+ Nova fonte</button></div><div class="rt192-grid">${filteredSources(g).map(x=>sourceCard(x,g)).join('')||'<div class="rt192-empty"><b>Nenhuma fonte registrada.</b><span>Comece por uma entrevista, observação ou dado existente.</span></div>'}</div>`:state.tab==='evidence'?`<div class="rt192-section-head"><div><h2>Evidências</h2><p>Registre apenas o que foi observado ou medido. A interpretação vem depois, como insight.</p></div><button data-new-evidence>+ Nova evidência</button></div><div class="rt192-grid">${evidenceRows(g).map(x=>evidenceCard(x,g)).join('')||'<div class="rt192-empty"><b>Nenhuma evidência registrada.</b><span>Vincule uma evidência a uma fonte e, quando possível, a uma etapa da Jornada.</span></div>'}</div>`:state.tab==='insights'?`<div class="rt192-section-head"><div><h2>Insights</h2><p>Interpretações sustentadas por uma ou mais evidências.</p></div><button data-new-insight>+ Novo insight</button></div><div class="rt192-grid">${insightRows(g).map(x=>insightCard(x,g)).join('')||'<div class="rt192-empty"><b>Nenhum insight ainda.</b><span>Promova uma evidência quando ela revelar um padrão ou significado relevante.</span></div>'}</div>`:`<div class="rt192-section-head"><div><h2>Cadeia de rastreabilidade</h2><p>Veja de onde cada decisão veio — sem saltar da pesquisa direto para a solução.</p></div></div>${renderTrace(g)}`}</main></div>`;
  bind(root,g);
}
function bind(root,g){
  root.querySelector('[data-search]')?.addEventListener('input',e=>{state.search=e.target.value;render()});
  root.querySelector('[data-source-filter]')?.addEventListener('change',e=>{state.sourceType=e.target.value;render()});
  root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render()});
  root.querySelectorAll('[data-new-source]').forEach(b=>b.onclick=()=>sourceDialog());
  root.querySelectorAll('[data-new-evidence]').forEach(b=>b.onclick=()=>evidenceDialog());
  root.querySelector('[data-new-insight]')?.addEventListener('click',()=>insightDialog());
  root.querySelectorAll('[data-promote-evidence]').forEach(b=>b.onclick=()=>insightDialog({evidenceId:b.dataset.promoteEvidence}));
  root.querySelectorAll('[data-promote-insight]').forEach(b=>b.onclick=()=>{const [kind,id]=b.dataset.promoteInsight.split(':');promoteInsight(id,kind)});
  root.querySelectorAll('[data-source-menu]').forEach(b=>b.onclick=()=>sourceDialog(g.research.sources[b.dataset.sourceMenu]));
  root.querySelectorAll('[data-evidence-menu]').forEach(b=>b.onclick=()=>evidenceDialog(g.entities.evidence[b.dataset.evidenceMenu]));
  root.querySelectorAll('[data-insight-menu]').forEach(b=>b.onclick=()=>insightDialog({record:g.entities.insight[b.dataset.insightMenu]}));
}
function modal(title,subtitle,body,actions=''){
  const wrap=document.createElement('div'); wrap.className='rt192-modal'; wrap.innerHTML=`<div class="rt192-dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><div><span>RESEARCH</span><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button data-close aria-label="Fechar">×</button></header><form><div class="rt192-form">${body}</div><footer><button type="button" class="rt192-btn ghost" data-close>Cancelar</button>${actions||'<button class="rt192-btn primary" type="submit">Salvar</button>'}</footer></form></div>`; document.body.appendChild(wrap); const close=()=>wrap.remove(); wrap.querySelectorAll('[data-close]').forEach(b=>b.onclick=close); wrap.onclick=e=>{if(e.target===wrap)close()}; return {wrap,form:wrap.querySelector('form'),close};
}
function sourceDialog(rec=null){
  const body=`<label class="full"><span>Título da fonte</span><input name="title" required maxlength="180" value="${esc(rec?.title||'')}"></label><label><span>Tipo</span><select name="type">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${rec?.type===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label><span>Data</span><input name="date" type="date" value="${esc((rec?.date||'').slice(0,10))}"></label><label><span>Responsável</span><input name="owner" value="${esc(rec?.owner||'')}"></label><label><span>Participante / contexto</span><input name="participant" value="${esc(rec?.participant||'')}"></label><label class="full"><span>Resumo</span><textarea name="summary" rows="4" placeholder="O que foi pesquisado?">${esc(rec?.summary||'')}</textarea></label><label class="full"><span>Tags</span><input name="tags" value="${esc((rec?.tags||[]).join(', '))}" placeholder="ex.: onboarding, compra, entrega"></label>`;
  const m=modal(rec?'Editar fonte':'Nova fonte de pesquisa','Guarde contexto e origem antes de registrar conclusões.',body); m.form.onsubmit=e=>{e.preventDefault();const fd=new FormData(m.form); mutate(g=>{const id=rec?.id||uid('source'), old=g.research.sources[id]||{};g.research.sources[id]={...old,id,title:String(fd.get('title')||'').trim(),type:String(fd.get('type')||'other'),date:String(fd.get('date')||''),owner:String(fd.get('owner')||'').trim(),participant:String(fd.get('participant')||'').trim(),summary:String(fd.get('summary')||'').trim(),tags:String(fd.get('tags')||'').split(',').map(x=>x.trim()).filter(Boolean),createdAt:old.createdAt||now(),updatedAt:now()};},rec?'Editar fonte de pesquisa':'Criar fonte de pesquisa');m.close()}; setTimeout(()=>m.form.querySelector('[name=title]')?.focus(),0);
}
function evidenceDialog(rec=null){
  const g=getGraph(); ensureResearch(g); const stages=stageList(g), ss=sources(g); const selected=new Set(rec?.sourceIds||[]);
  const body=`<label class="full"><span>Evidência observável</span><input name="title" required value="${esc(rec?.title||'')}"></label><label class="full"><span>Descrição / trecho / dado</span><textarea name="description" rows="4" placeholder="Registre o que foi observado, dito ou medido — sem interpretar.">${esc(rec?.description||'')}</textarea></label><label><span>Etapa da Jornada</span><select name="stageId"><option value="">Sem etapa</option>${stages.map(s=>`<option value="${esc(s.id)}" ${rec?.stageId===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}</select></label><label><span>Confiança</span><select name="confidence">${Object.entries(CONFIDENCE).map(([k,v])=>`<option value="${k}" ${(rec?.confidence||'hypothesis')===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label><span>Amostra / volume</span><input name="sample" value="${esc(rec?.sample||'')}"></label><label class="full"><span>Fontes</span><div class="rt192-checks">${ss.map(s=>`<label><input type="checkbox" name="sourceId" value="${esc(s.id)}" ${selected.has(s.id)?'checked':''}><span>${esc(s.title)}</span></label>`).join('')||'<em>Crie uma fonte de pesquisa primeiro, ou salve a evidência sem fonte por enquanto.</em>'}</div></label>`;
  const m=modal(rec?'Editar evidência':'Nova evidência','Separe observação de interpretação. A evidência pode sustentar vários insights.',body); m.form.onsubmit=e=>{e.preventDefault();const fd=new FormData(m.form); mutate(gr=>{const id=rec?.id||uid('evidence'), old=gr.entities.evidence[id]||{};gr.entities.evidence[id]={...old,id,title:String(fd.get('title')||'').trim(),description:String(fd.get('description')||'').trim(),stageId:String(fd.get('stageId')||''),journeyId:journeyId(gr),confidence:String(fd.get('confidence')||'hypothesis'),sample:String(fd.get('sample')||'').trim(),sourceIds:fd.getAll('sourceId').map(String),insightIds:old.insightIds||[],createdAt:old.createdAt||now(),updatedAt:now()};},rec?'Editar evidência':'Criar evidência');m.close()}; setTimeout(()=>m.form.querySelector('[name=title]')?.focus(),0);
}
function insightDialog(opts={}){
  const rec=opts.record||null,g=getGraph(); ensureResearch(g); const ev=evidence(g), stages=stageList(g), selected=new Set(rec?.evidenceIds||[]); if(opts.evidenceId)selected.add(opts.evidenceId);
  const body=`<label class="full"><span>Insight</span><input name="title" required value="${esc(rec?.title||'')}"></label><label class="full"><span>Interpretação</span><textarea name="description" rows="4" placeholder="O que essas evidências significam para o serviço?">${esc(rec?.description||'')}</textarea></label><label><span>Etapa principal</span><select name="stageId"><option value="">Sem etapa</option>${stages.map(s=>`<option value="${esc(s.id)}" ${rec?.stageId===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}</select></label><label class="full"><span>Evidências que sustentam este insight</span><div class="rt192-checks">${ev.map(x=>`<label><input type="checkbox" name="evidenceId" value="${esc(x.id)}" ${selected.has(x.id)?'checked':''}><span>${esc(x.title||'Evidência')}</span></label>`).join('')||'<em>Cadastre uma evidência antes de criar o insight.</em>'}</div></label>`;
  const m=modal(rec?'Editar insight':'Novo insight','Um insight é uma interpretação; sempre que possível, sustente-o com evidências.',body); m.form.onsubmit=e=>{e.preventDefault();const fd=new FormData(m.form), ids=fd.getAll('evidenceId').map(String);mutate(gr=>{const id=rec?.id||uid('insight'), old=gr.entities.insight[id]||{};gr.entities.insight[id]={...old,id,title:String(fd.get('title')||'').trim(),description:String(fd.get('description')||'').trim(),stageId:String(fd.get('stageId')||''),journeyId:journeyId(gr),evidenceIds:ids,createdAt:old.createdAt||now(),updatedAt:now()};for(const eid of ids){const evi=gr.entities.evidence[eid];if(evi){evi.insightIds=[...new Set([...(evi.insightIds||[]),id])];evi.updatedAt=now();}}},rec?'Editar insight':'Criar insight');m.close()}; setTimeout(()=>m.form.querySelector('[name=title]')?.focus(),0);
}
function promoteInsight(id,kind){
  mutate(g=>{const ins=g.entities.insight?.[id];if(!ins)return;const stageId=ins.stageId||stageList(g)[0]?.id||'';if(!stageId)return;const st=g.stages[stageId], rid=uid(kind);if(kind==='problem'){g.problems[rid]={id:rid,stageId,description:ins.title,insightIds:[id],evidenceIds:[...(ins.evidenceIds||[])],createdAt:now(),updatedAt:now()};st.problemIds=[...new Set([...(st.problemIds||[]),rid])];}else{g.opportunities[rid]={id:rid,stageId,title:ins.title,description:ins.description||'',problemIds:[],taskIds:[],insightIds:[id],evidenceIds:[...(ins.evidenceIds||[])],createdAt:now(),updatedAt:now()};st.opportunityIds=[...new Set([...(st.opportunityIds||[]),rid])];}ins.promotedTo={kind,id:rid};ins.updatedAt=now();},kind==='problem'?'Promover insight para problema':'Promover insight para oportunidade');
}
function model(){ const g=getGraph(); if(!g)return null; return {summary:summary(g),sources:sources(g),evidence:evidence(g),insights:insights(g)}; }
function bootstrap(){ ensureNav(); shell(); runtime.register('researchWorkspace',{version:VERSION,show,hide,refresh,model,newSource:()=>sourceDialog(),newEvidence:()=>evidenceDialog(),newInsight:()=>insightDialog(),openSource:id=>{const r=getGraph()?.research?.sources?.[id];if(r){show();sourceDialog(r);return true}return false},openEntity:(kind,id)=>{const r=getGraph()?.entities?.[kind]?.[id];if(!r)return false;show();if(kind==='evidence')evidenceDialog(r);else if(kind==='insight')insightDialog({record:r});else return false;return true}},VERSION); }
window.addEventListener('rt-app-ready',()=>setTimeout(bootstrap,0)); window.addEventListener('rt-graph-changed',()=>refresh());
window.addEventListener('click',(e)=>{const b=e.target.closest?.('aside button');if(!b||b.matches('[data-rt192-research-nav]'))return; if(!document.getElementById('rt192-research-home')?.hidden) hide();},true);
if(document.readyState!=='loading') setTimeout(bootstrap,0); else document.addEventListener('DOMContentLoaded',()=>setTimeout(bootstrap,0));

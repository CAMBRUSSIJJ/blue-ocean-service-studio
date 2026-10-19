import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const core=read('src/runtime/whiteboard-core.js');
const view=read('src/views/WhiteboardsView.tsx');
const css=read('src/runtime/interaction-structure-ux.css');
const style=read('src/style.css');
const pkg=JSON.parse(read('package.json'));
const checks=[];
const ok=(name,cond)=>checks.push([name,!!cond]);
const atLeast=(v,a,b,c)=>{const [x=0,y=0,z=0]=String(v).split('.').map(Number);return x>a||(x===a&&(y>b||(y===b&&z>=c)))};

ok('package V1.19.3 ou superior',atLeast(pkg.version,1,19,3));
ok('gate interaction UX registrado',pkg.scripts?.['interaction-ux:smoke']?.includes('v1193-interaction-structure-ux-smoke.mjs'));
ok('qa inclui interaction UX gate',String(pkg.scripts?.qa||'').includes('interaction-ux:smoke'));
ok('CSS interaction UX importado',style.includes("@import './runtime/interaction-structure-ux.css';"));

// Zoom/navigation
ok('zoom mínimo chega a 10%',core.includes('ZOOM_MIN = 0.10')||core.includes('ZOOM_MIN=0.10'));
ok('zoom máximo chega a 400%',core.includes('ZOOM_MAX = 4')||core.includes('ZOOM_MAX=4'));
ok('wheel usa zoomAtClient preservando ponto do cursor',core.includes('zoomAtClient(clamp(zoom*factor,ZOOM_MIN,ZOOM_MAX),e.clientX,e.clientY,false)'));
ok('zoomAtClient recalcula pan a partir do ponto focal',core.includes('pan.x=mx-(mx-pan.x)*(zoom/old)')&&core.includes('pan.y=my-(my-pan.y)*(zoom/old)'));
ok('controle possui slider de zoom',core.includes("slider.type='range'")&&core.includes("bo1193-zoom-slider"));
ok('slider possui aria-label',core.includes("setAttribute('aria-label','Zoom do quadro')"));
ok('percentual volta para 100%',core.includes("z.title='Voltar para 100%"));
ok('ajustar todo conteúdo explícito',core.includes("btn('Ajustar tudo'"));
ok('ajustar seleção explícito',core.includes("btn('Ajustar seleção'"));
ok('fit selection alerta sem seleção',core.includes("toast('Selecione um ou mais objetos visíveis.')"));
ok('CSS estiliza slider de zoom',css.includes('.bo1193-zoom-slider'));

// Board management
ok('runtime expõe renameBoard',core.includes('renameBoard:renameBoardById'));
ok('runtime expõe duplicateBoard',core.includes('duplicateBoard:duplicateBoardById'));
ok('runtime expõe deleteBoard por id',core.includes('deleteBoard:deleteBoardById'));
ok('renomear quadro atualiza board name',core.includes('function renameBoardById')&&core.includes('b.name=clean'));
ok('renomear quadro atualiza metadata de blueprint quando presente',core.includes("meta.blueprintHome?.records?.[id]")&&core.includes('.name=clean'));
ok('excluir quadro pede confirmação',core.includes('async function deleteBoardById')&&core.includes("Excluir quadro?"));
ok('biblioteca possui menu de ações',view.includes('bo1193-card-menu-trigger'));
ok('biblioteca oferece Renomear',view.includes('>Renomear</button>'));
ok('biblioteca oferece Duplicar',view.includes('>Duplicar</button>'));
ok('biblioteca oferece Excluir',view.includes('>Excluir</button>'));
ok('biblioteca possui modal próprio de rename',view.includes('Renomear quadro')&&view.includes('Salvar nome'));
ok('card copy usa classe estável, não nth-child',view.includes('className="bo1193-board-copy"')&&css.includes('.bo1193-board-copy'));

// Inline rename / canonical synchronization
ok('inline rename existe',core.includes('function startInlineRename('));
ok('double click inicia inline rename',core.includes('startInlineRename(it,el)'));
ok('inline rename suporta Enter',core.includes("e.key==='Enter'"));
ok('inline rename suporta Escape',core.includes("e.key==='Escape'"));
ok('smart rename usa entidade canônica',core.includes('function commitItemRename')&&core.includes('setEntityTitle('));
ok('liveField existe para edição incremental',core.includes('function liveField('));
ok('liveField desliga autocomplete',core.includes("i.autocomplete='off'"));
ok('liveField salva no blur',core.includes("i.onblur=()=>")&&core.includes('save(false,{label})'));

// Deletion semantics
ok('remoção visual separada da exclusão canônica',core.includes('Remover do quadro')&&core.includes('Excluir do serviço'));
ok('impacto de exclusão é calculado',core.includes('function entityDeleteImpact('));
ok('exclusão canônica usa deletePlan',core.includes('deletePlan('));
ok('exclusão canônica aplica deletePlan',core.includes('applyDeletePlan('));
ok('confirmação mostra impacto antes de excluir',core.includes('representação(ões) em')&&core.includes('objeto(s) relacionado(s) serão removidos'));
ok('desvincular ganhou linguagem de objeto livre',core.includes('Transformar em objeto livre'));

// Entity Picker V2
ok('picker contextual V2 existe',core.includes('function entityPickerCopy(')&&core.includes('bo1193-entity-picker'));
ok('picker oferece criar novo',core.includes('CRIAR NOVO')&&core.includes('Criar e adicionar'));
ok('picker oferece reutilizar',core.includes('Reutilizar existente')&&core.includes('Ver existentes'));
ok('picker de etapa usa linguagem de negócio',core.includes('Qual é o próximo momento relevante da experiência?'));
ok('picker de touchpoint usa linguagem de negócio',core.includes('Onde o cliente interage com o serviço?'));
ok('stage possui sugestões práticas',core.includes("['Descobrir','Escolher','Agendar','Receber','Utilizar','Resolver','Encerrar']"));
ok('touchpoint possui sugestões práticas',core.includes("['WhatsApp','Site','Aplicativo','Telefone','Loja física','Atendente','E-mail','Outro']"));
ok('picker detecta duplicata normalizada',core.includes('function normalizeEntityName(')&&core.includes('duplicate'));
ok('picker recomenda reutilizar duplicata',core.includes('Usar existente')||core.includes('Reutilizar'));
ok('picker agrupa desta construção',core.includes("'Desta construção'"));
ok('picker agrupa neste quadro',core.includes("'Neste quadro'"));
ok('picker agrupa deste serviço',core.includes("'Deste serviço'"));
ok('picker agrupa arquivados',core.includes("'Arquivados'"));
ok('entidade já no quadro é localizada em vez de duplicada',core.includes("toast('Este objeto já está neste quadro.')")&&core.includes('focusItem(here.itemId'));
ok('contexto de etapa mostra Jornada',core.includes("if(kind==='stage')")&&core.includes('rec.journeyId'));
ok('contexto de touchpoint considera canal',core.includes("if(kind==='touchpoint'"));
ok('main picker não usa subtítulo técnico antigo',!core.includes('Reutilize uma entidade do Service Graph ou crie uma nova.'));
ok('CSS V2 tem tabs create/reuse',css.includes('.bo1193-picker-tabs'));
ok('CSS V2 tem orientação contextual',css.includes('.bo1193-picker-guidance'));
ok('CSS V2 tem grupos de reutilização',css.includes('.bo1193-picker-group'));
ok('CSS V2 tem alerta de duplicata',css.includes('.bo1193-duplicate-hint'));

// Image/context organization
ok('imagens ganham contexto intuitivo',core.includes('Onde esta imagem entra?'));
ok('imagens usam etapa relacionada',core.includes("imageContext?'Etapa relacionada':'Etapa'"));
ok('imagens usam área do serviço em vez de jargão de camada',core.includes("imageContext?'Área do serviço':'Camada'"));
ok('biblioteca usa Estrutura do serviço no fluxo principal',core.includes("sectionTitle(c,'Estrutura do serviço')"));

// Existing reliability must remain
ok('atalhos continuam protegidos em controles',core.includes('function isUiControlTarget('));
ok('inspector mantém edição incremental',core.includes('liveTextEditing=true'));
ok('canvas continua autoexpansível',core.includes('function boardWorldSize()'));
ok('conflict draft continua persistido',core.includes('function preserveConflictDraft('));

const failed=checks.filter(([,v])=>!v);
for(const [name,value] of checks) console.log(`${value?'OK  ':'FAIL'} ${name}`);
console.log(`\nWhiteboard Interaction & Structure UX: ${checks.length-failed.length}/${checks.length}`);
if(failed.length) process.exit(1);

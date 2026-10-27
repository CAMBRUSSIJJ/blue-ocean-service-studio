import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canvasAcceptsRow,canvasAcceptsNewRow,canvasPlacementHint,CANVAS_COMPONENTS} from '../src/services/blueprint-canvas.js';

const read=(p)=>readFileSync(p,'utf8');
const cad=read('src/runtime/journey-cad-ui.js'),css=read('src/runtime/journey-cad.css'),prepare=read('scripts/prepare-assets.mjs');
const html=read('src/runtime/journey-matrix.html');
const checks=[
 [CANVAS_COMPONENTS['customer-action'].row==='ac','Ação do cliente tem faixa canônica'],
 [canvasAcceptsNewRow('customer-action','ac'),'Ação do cliente pode ser criada em Ações'],
 [!canvasAcceptsNewRow('customer-action','fl'),'Nova ação do cliente não pertence à linha de frente'],
 [!canvasAcceptsNewRow('customer-action','bk'),'Nova ação do cliente não pertence a Bastidores'],
 [!canvasAcceptsNewRow('customer-action','sy'),'Nova ação do cliente não pertence a Sistemas'],
 [canvasAcceptsNewRow('activity','fl'),'Atividade pode ser criada na Linha de frente'],
 [canvasAcceptsNewRow('activity','bk'),'Atividade pode ser criada nos Bastidores'],
 [canvasAcceptsNewRow('activity','sy'),'Atividade pode ser criada em Sistemas'],
 [!canvasAcceptsNewRow('activity','ac'),'Atividade operacional não pode ser criada na faixa do cliente'],
 [canvasAcceptsRow('customer-action','fl'),'Leitura legada não é bloqueada'],
 [canvasPlacementHint('customer-action','fl').includes('Atividade'),'Erro instrui a usar o tipo compatível'],
 [cad.includes('cadModel.canvasAcceptsNewRow(kind,target.row.id)'),'Biblioteca valida inserções novas'],
 [cad.includes('filter(([kind])=>!context.row||cadModel.canvasAcceptsNewRow(kind,context.row))'),'Seletor por célula filtra componentes sem variável indefinida'],
 [cad.includes('cadAskConfirmation({title:')&&cad.includes('Confirmar a conversão?'),'Mover entre áreas exige confirmação explícita'],
 [cad.includes('cad-placement-warning'),'Registros legados sinalizados sem serem apagados'],
 [html.includes('const hadPendingCanvas=!!cadState.pending')&&html.includes("cadState.pending='';")&&html.includes('cadState.pendingDocument=null'),'A reidratação do host desbloqueia salvamentos confirmados do Blueprint'],
 [html.includes("app.querySelectorAll('.cad-component-main[data-act=\"cad-add\"]')")&&html.includes('button.disabled=!unlocked'),'Salvamento confirmado reconcilia os controles de criação com o estado efetivo'],
 [cad.includes('cad-lanes-hide-empty'),'É possível ocultar faixas sem cartões'],
 [cad.includes('application/x-blue-ocean-lane'),'Faixas podem ser reordenadas por arraste'],
 [cad.includes("moveLane(data.id,Number(data.direction),false)"),'Botões de ordem acessíveis preservados'],
 [cad.includes('cad-inspector-group'),'Inspetor apresenta grupos de propriedades'],
 [cad.includes('const isDouble=!cadMobile()&&')&&cad.includes('cadState.lastCardClick=null;cadState.selected=data.noteId'),'Em celular, toque sempre inspeciona e salvamento reinicia duplo clique'],
 [cad.includes('cadState.inspector=!!cadState.selected&&!cadMobile()'),'Criação rápida em telas móveis retorna ao mapa sem modal bloqueante'],
 [cad.includes('--cad-popup-y:')&&css.includes('overflow-y:auto')&&css.includes('.cad-quick form>footer'),'Edição rápida rolável mantém ação de salvar acessível'],
 [cad.includes('cadCurrentDraft()||(entry?cadDraftFor(entry):null)'),'Inspetor reconstrói rascunho se estado transitório desaparecer'],
 [cad.includes("pointer:null,lastCardClick:null"),'Cancelar reinicia a detecção de duplo clique para nova seleção'],
 [cad.includes('aria-label="Detalhes opcionais"'),'Acesso direto aos detalhes de cartão selecionado'],
 [cad.includes("button.matches('.cad-node[data-act=\"cad-select\"]')")&&cad.includes('cadSelect(button.dataset.id,{},true)'),'Teclado abre edição inline em cartões sem exigir mouse'],
 [cad.includes("cadState.pending?'Salvando…':saveLabel"),'Cabeçalho reflete estado pendente'],
 [css.includes('.cad-lane-item.is-drag-over'),'Arraste sinaliza destino de faixa'],
 [css.includes('.cad-inspector-advanced'),'Aparência é seccionada no inspetor'],
 [cad.includes('cadUpdateStickyStages()')&&cad.includes('class="cad-sticky-stages"'),'Etapas permanecem identificadas durante movimento vertical'],
 [prepare.includes('canvasAcceptsNewRow,canvasPlacementHint'),'Runtime compartilha regras de compatibilidade'],
 [!cad.includes('prompt(')&&!cad.includes('confirm('),'Runtime sem prompt/confirm nativos'],
 [cad.includes('role="alertdialog"')&&cad.includes('aria-modal="true"'),'Confirmação acessível com modal interno'],
 [cad.includes("action==='cad-confirm-cancel'")&&cad.includes("action==='cad-confirm-accept'"),'Ações de confirmação e cancelamento disponíveis'],
 [css.includes('.cad-confirm-panel')&&css.includes('.cad-confirm-backdrop'),'Estilos de diálogo próprios do Blue Ocean']
];
for(const [ok,description] of checks){console.log((ok?'OK':'FAIL')+' '+description)}
assert(checks.every(([ok])=>ok),'Falha em contrato de UX do Blueprint H2');
console.log('Blueprint H2: '+checks.length+'/'+checks.length+' contratos aprovados.');

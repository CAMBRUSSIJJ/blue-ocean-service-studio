import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canvasAcceptsRow,canvasAcceptsNewRow,canvasPlacementHint,CANVAS_COMPONENTS} from '../src/services/blueprint-canvas.js';

const read=(p)=>readFileSync(p,'utf8');
const cad=read('src/runtime/journey-cad-ui.js'),css=read('src/runtime/journey-cad.css'),prepare=read('scripts/prepare-assets.mjs');
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
 [cad.includes('Converter explicitamente este cartão?'),'Mover entre áreas exige confirmação explícita'],
 [cad.includes('cad-placement-warning'),'Registros legados sinalizados sem serem apagados'],
 [cad.includes('cad-lanes-hide-empty'),'É possível ocultar faixas sem cartões'],
 [cad.includes('application/x-blue-ocean-lane'),'Faixas podem ser reordenadas por arraste'],
 [cad.includes("moveLane(data.id,Number(data.direction),false)"),'Botões de ordem acessíveis preservados'],
 [cad.includes('cad-inspector-group'),'Inspetor apresenta grupos de propriedades'],
 [cad.includes('aria-label="Detalhes opcionais"'),'Acesso direto aos detalhes de cartão selecionado'],
 [cad.includes("cadState.pending?'Salvando…':saveLabel"),'Cabeçalho reflete estado pendente'],
 [css.includes('.cad-lane-item.is-drag-over'),'Arraste sinaliza destino de faixa'],
 [css.includes('.cad-inspector-advanced'),'Aparência é seccionada no inspetor'],
 [prepare.includes('canvasAcceptsNewRow,canvasPlacementHint'),'Runtime compartilha regras de compatibilidade']
];
for(const [ok,description] of checks){console.log((ok?'OK':'FAIL')+' '+description)}
assert(checks.every(([ok])=>ok),'Falha em contrato de UX do Blueprint H2');
console.log('Blueprint H2: '+checks.length+'/'+checks.length+' contratos aprovados.');

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Link2, PlayCircle, RefreshCw } from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';
import type {
  Id, ServiceOperationBindingStatus, ServiceOperationDirection, ServiceOperationKind, ServiceOperationProvider,
  ServiceOperationSyncMode, ServiceOperationTargetKind,
} from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import {
  buildServiceOperationsBridgeReport, createServiceOperationBinding, defaultOperationKind, recordServiceOperationRun,
  SERVICE_OPERATION_DIRECTION_LABELS, SERVICE_OPERATION_KIND_LABELS, SERVICE_OPERATION_PROVIDER_LABELS,
  SERVICE_OPERATION_RUN_LABELS, SERVICE_OPERATION_STATUS_LABELS, SERVICE_OPERATION_SYNC_LABELS,
  SERVICE_OPERATION_TARGET_LABELS, syncServiceOperationsBridge, updateServiceOperationBinding,
} from '../services/service-operations-bridge';

const targetOrder: ServiceOperationTargetKind[] = ['touchpoint','journey','channel','blueprint','initiative','metric'];
const providerOrder: ServiceOperationProvider[] = ['manual','internal','realtalent_crm','webhook','other'];
const directionOrder: ServiceOperationDirection[] = ['design_to_ops','ops_to_design','bidirectional'];
const syncOrder: ServiceOperationSyncMode[] = ['reference','manual','scheduled','event'];
const statusOrder: ServiceOperationBindingStatus[] = ['draft','active','paused','error','archived'];
const operationOrder: ServiceOperationKind[] = ['activity','workflow','communication','process','execution','data_source'];
const iconKind = (kind: ServiceOperationTargetKind) => kind === 'touchpoint' ? 'touchpoint' : kind === 'journey' ? 'journey' : kind === 'channel' ? 'channel' : kind === 'blueprint' ? 'blueprint' : kind === 'metric' ? 'metric' : 'task';

export function ServiceOperationsBridgeView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  useEffect(() => { const next = syncServiceOperationsBridge(graph); if (JSON.stringify(next.service.operationsBridge) !== JSON.stringify(graph.service.operationsBridge)) setGraph(() => next, 'H7.38: sincronizar ponte operacional'); }, []); // one-shot materialization
  const report = useMemo(() => buildServiceOperationsBridgeReport(graph), [graph]);
  const [selectedId, setSelectedId] = useState<Id>('');
  const [targetKind, setTargetKind] = useState<ServiceOperationTargetKind>('touchpoint');
  const targets = report.targets.filter((item) => item.kind === targetKind);
  const [targetId, setTargetId] = useState<Id>('');
  const selected = report.bindings.find((item) => item.id === selectedId) ?? report.bindings[0] ?? null;
  const create = () => {
    const candidate = targetId || targets[0]?.id || '';
    if (!candidate) { showToast('Crie um objeto de serviço compatível antes de mapear a operação.'); return; }
    const result = createServiceOperationBinding(graph, { targetKind, targetId: candidate, operationKind: defaultOperationKind(targetKind), provider: 'manual', syncMode: 'reference' });
    if (!result.created) { showToast(result.reason === 'duplicate_binding' ? 'Esse vínculo operacional já existe.' : 'Não foi possível criar o vínculo operacional.'); return; }
    setGraph(() => result.graph, 'H7.38: criar vínculo operacional'); setSelectedId(result.bindingId || ''); showToast('Vínculo operacional criado.');
  };
  const patch = (values: Parameters<typeof updateServiceOperationBinding>[2]) => {
    if (!selected) return; const result = updateServiceOperationBinding(graph, selected.id, values); if (!result.updated) { showToast(result.reason === 'external_ref_required' ? 'Informe a referência externa antes de ativar esse provedor.' : 'Não foi possível atualizar o vínculo.'); return; }
    setGraph(() => result.graph, 'H7.38: atualizar vínculo operacional');
  };
  const simulate = () => { if (!selected) return; const result = recordServiceOperationRun(graph, selected.id, 'simulated', 'Simulação local da ponte operacional.'); if (!result.created) { showToast('Esse vínculo não pode ser simulado no estado atual.'); return; } setGraph(() => result.graph, 'H7.38: simular operação'); showToast('Simulação registrada sem executar sistema externo.'); };
  const registerSuccess = () => { if (!selected) return; const result = recordServiceOperationRun(graph, selected.id, 'success', 'Execução externa confirmada manualmente.'); if (!result.created) { showToast('Ative o vínculo antes de registrar uma execução real.'); return; } setGraph(() => result.graph, 'H7.38: registrar execução'); showToast('Execução operacional registrada.'); };

  return <section className="bo-h738" data-service-operations-bridge="7.38">
    <header className="bo-h738-hero"><div><span className="bo-h738-kicker"><Link2 size={14}/> H7.38 · SERVICE OPERATIONS BRIDGE</span><h2>Conecte o desenho do serviço à execução real.</h2><p>Mapeie Touchpoints para atividades, Journeys para fluxos, Canais para comunicação, Blueprints para processos, Iniciativas para execução e Métricas para fontes de dados. O contrato já prevê RealTalent CRM, webhook e outros sistemas sem fingir uma integração externa que ainda não foi autenticada.</p></div><div className="bo-h738-score"><strong>{report.coveragePercent}%</strong><span>cobertura operacional</span><em>{report.counts.active} ativos · {report.counts.errors} com erro</em></div></header>
    <div className="bo-h738-kpis"><article><small>ALVOS MAPEÁVEIS</small><strong>{report.counts.targets}</strong><span>{report.counts.bindings} vínculos criados</span></article><article><small>VÍNCULOS ATIVOS</small><strong>{report.counts.active}</strong><span>{report.counts.draft} em rascunho</span></article><article className={report.counts.errors || report.counts.missingTargets ? 'is-attention' : ''}><small>ATENÇÃO</small><strong>{report.counts.errors + report.counts.missingTargets}</strong><span>{report.counts.missingTargets} alvos ausentes</span></article><article><small>REALTALENT CRM</small><strong>{report.counts.realTalentConfigured}</strong><span>referências configuradas; conector externo ainda separado</span></article></div>
    <section className="bo-h738-coverage"><div><small>COBERTURA POR CAMADA</small><h3>Do mapa para a operação</h3><p>A cobertura mede vínculos ativos; referência externa não significa sincronização online até o conector correspondente existir.</p></div><div>{report.coverage.map((item)=><article key={item.kind}><header><BlueOceanObjectIcon kind={iconKind(item.kind)} size={14}/><strong>{item.label}</strong><span>{item.connected}/{item.total}</span></header><div><i style={{width:`${item.percent}%`}}/></div><small>{item.percent}% conectado</small></article>)}</div></section>
    <section className="bo-h738-create"><div><small>NOVO VÍNCULO</small><strong>Escolha o objeto que terá correspondência operacional</strong></div><select value={targetKind} onChange={e=>{ const kind=e.target.value as ServiceOperationTargetKind; setTargetKind(kind); setTargetId(''); }}><option disabled value="">Tipo</option>{targetOrder.map(kind=><option key={kind} value={kind}>{SERVICE_OPERATION_TARGET_LABELS[kind]}</option>)}</select><select value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">{targets.length?'Selecionar objeto':'Nenhum objeto disponível'}</option>{targets.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select><button type="button" className="primary" onClick={create}><Link2 size={14}/> Criar vínculo</button></section>
    <section className="bo-h738-workbench"><div className="bo-h738-list"><header><div><small>MAPEAMENTOS OPERACIONAIS</small><h3>Design ↔ Operação</h3></div><button type="button" onClick={()=>setGraph(c=>syncServiceOperationsBridge(c),'H7.38: ressincronizar ponte')}><RefreshCw size={14}/></button></header><div>{report.bindings.map(item=><button type="button" key={item.id} className={`${selected?.id===item.id?'selected ':''}is-${item.status}`} onClick={()=>setSelectedId(item.id)}><BlueOceanObjectIcon kind={iconKind(item.targetKind)} size={17}/><span><strong>{item.targetLabel}</strong><small>{SERVICE_OPERATION_KIND_LABELS[item.operationKind]} · {SERVICE_OPERATION_PROVIDER_LABELS[item.provider]}</small></span>{!item.targetActive?<em><AlertTriangle size={12}/> Alvo ausente</em>:item.status==='active'?<CheckCircle2 size={15}/>:<em>{SERVICE_OPERATION_STATUS_LABELS[item.status]}</em>}</button>)}</div>{!report.bindings.length&&<div className="bo-h738-empty"><Activity size={25}/><strong>Nenhum vínculo operacional</strong><p>Crie o primeiro mapeamento para começar a ligar o Service Graph à execução.</p></div>}</div>
      <aside className="bo-h738-inspector">{selected?<><header><div><small>{SERVICE_OPERATION_TARGET_LABELS[selected.targetKind].toUpperCase()}</small><h3>{selected.targetLabel}</h3></div><span className={`is-${selected.status}`}>{SERVICE_OPERATION_STATUS_LABELS[selected.status]}</span></header>
        <div className="bo-h738-two"><label><span>Tipo operacional</span><select value={selected.operationKind} onChange={e=>patch({operationKind:e.target.value as ServiceOperationKind})}>{operationOrder.map(v=><option key={v} value={v}>{SERVICE_OPERATION_KIND_LABELS[v]}</option>)}</select></label><label><span>Provedor</span><select value={selected.provider} onChange={e=>patch({provider:e.target.value as ServiceOperationProvider})}>{providerOrder.map(v=><option key={v} value={v}>{SERVICE_OPERATION_PROVIDER_LABELS[v]}</option>)}</select></label></div>
        <label><span>Referência externa</span><input value={selected.externalRef||''} onChange={e=>patch({externalRef:e.target.value})} placeholder="Ex.: activity:follow-up, pipeline:sales, webhook URL ou ID externo"/></label>
        <div className="bo-h738-two"><label><span>Direção</span><select value={selected.direction} onChange={e=>patch({direction:e.target.value as ServiceOperationDirection})}>{directionOrder.map(v=><option key={v} value={v}>{SERVICE_OPERATION_DIRECTION_LABELS[v]}</option>)}</select></label><label><span>Sincronização</span><select value={selected.syncMode} onChange={e=>patch({syncMode:e.target.value as ServiceOperationSyncMode})}>{syncOrder.map(v=><option key={v} value={v}>{SERVICE_OPERATION_SYNC_LABELS[v]}</option>)}</select></label></div>
        <div className="bo-h738-two"><label><span>Status</span><select value={selected.status} onChange={e=>patch({status:e.target.value as ServiceOperationBindingStatus})}>{statusOrder.map(v=><option key={v} value={v}>{SERVICE_OPERATION_STATUS_LABELS[v]}</option>)}</select></label><label><span>Owner operacional</span><input value={selected.owner||''} onChange={e=>patch({owner:e.target.value})} placeholder="Responsável pela execução"/></label></div>
        <label><span>Nota operacional</span><textarea value={selected.note||''} onChange={e=>patch({note:e.target.value})} placeholder="Contrato, regra de negócio, evento esperado ou condição de execução."/></label>
        <section className="bo-h738-actions"><button type="button" onClick={simulate}><PlayCircle size={14}/> Simular</button><button type="button" className="primary" onClick={registerSuccess}><CheckCircle2 size={14}/> Registrar execução confirmada</button></section>
        <section className="bo-h738-history"><strong>Histórico de execução</strong>{selected.runs.length?selected.runs.slice(0,6).map(run=><article key={run.id}><span><b>{SERVICE_OPERATION_RUN_LABELS[run.status]}</b><small>{new Date(run.createdAt).toLocaleString('pt-BR')}</small></span><p>{run.message||'Sem observação.'}</p></article>):<small>Nenhuma execução registrada. Simulação não chama sistema externo.</small>}</section>
      </>:<div className="bo-h738-empty"><strong>Nenhum vínculo selecionado</strong><p>Selecione ou crie um mapeamento operacional.</p></div>}</aside></section>
  </section>;
}

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const view = read('src/views/NeedsView.tsx');
const styles = read('src/views/need-connected-detail-h760.css');
const model = read('src/services/needs-studio.ts');
const personaModel = read('src/services/persona-studio.ts');
const checks = [
  ['Tela integrada à NeedsView, sem duplicar rota', view.includes('data-need-connected-detail="H7.60"') && view.includes('data-needs-h72="detail"')],
  ['Lista e demais abas continuam no componente', view.includes('data-needs-h72="library"') && ['people', 'relations', 'evidence', 'usage'].every(tab => view.includes("detailTab === '" + tab + "'"))],
  ['Leitura inicial do perfil foi preservada', view.includes('bo-h755-read-screen') && view.includes('DiscoveryReadProfile') && view.includes('onEdit={() => setProfileEditing(true)}')],
  ['Campos usam os mesmos atributos da necessidade', ['title', 'description', 'context', 'desiredOutcome', 'successSignal', 'currentWorkaround'].every(key => view.includes('draft.' + key))],
  ['Salvamento mantém a operação de Service Graph', view.includes('updateNeedProfile({ graph: current, needId: selectedId, draft, connectedIds })') && model.includes('relatedIds') && model.includes('needIds')],
  ['A Persona relacionada não é fictícia', view.includes('personaOptions.filter((item) => connectedIds.includes(item.id))') && !view.includes('Maria da Silva') && !view.includes('Lavanderia')],
  ['Retrato é derivado da Persona real', view.includes('graph.entities?.persona?.[item.id]') && view.includes('personaPortraitUrl') && personaModel.includes('personaPortraitUrl')],
  ['Vínculos são editados sem perder a relação com Personas', view.includes('onChange={() => toggleRelation(item.id)}') && view.includes('checked={connectedIds.includes(item.id)}')],
  ['Mudanças são detectadas antes de sair', view.includes("window.confirm('Existem alterações não salvas.") && view.includes('Alterações pendentes')],
  ['Descartar, salvar e concluir edição continuam disponíveis', view.includes('discardNeed(); setProfileEditing(false)') && view.includes('saveNeed(); setProfileEditing(false)') && view.includes('Concluir edição')],
  ['Importância e tags permanecem dados reais', view.includes('value={draft.importance}') && view.includes('value={tagsText}')],
  ['Remoção mantém confirmação e operação canônica', view.includes('setDeleteId(selected.id)') && view.includes("removeContextEntity(current, 'need', id)")],
  ['Painel organiza Persona e propriedades', styles.includes('.bo-h760-persona-list') && styles.includes('.bo-h760-organization')],
  ['Estilos não afetam as outras telas', styles.includes('.bo-h760-connected .bo-h754-overview-grid.bo-h760-overview') && view.includes("import './need-connected-detail-h760.css'")],
  ['Layout é responsivo e foco acessível', styles.includes('@media(max-width:850px)') && styles.includes('@media(max-width:550px)') && styles.includes('focus-visible')],
];

let passed = 0;
for (const [label, ok] of checks) {
  console.log((ok ? 'OK ' : 'FAIL ') + label);
  if (ok) passed++;
}
console.log('H7.60 Connected Needs Details: ' + passed + '/' + checks.length + ' PASS');
assert.equal(passed, checks.length);

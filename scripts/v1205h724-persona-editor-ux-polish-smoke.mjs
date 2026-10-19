import fs from 'node:fs';

const checks = [];
const ok = (label, condition) => checks.push({ label, condition: Boolean(condition) });
const personas = fs.readFileSync('src/views/PersonasView.tsx', 'utf8');
const css = fs.readFileSync('src/runtime/personas-h724.css', 'utf8');
const style = fs.readFileSync('src/style.css', 'utf8');

ok('AutoTextarea existe e cresce por conteúdo', personas.includes('function AutoTextarea') && personas.includes('scrollHeight'));
ok('overview usa layout principal + lateral', personas.includes('bo-h724-overview-layout') && personas.includes('bo-h724-overview-aside'));
ok('completude migrou para painel lateral', personas.includes('bo-h724-completeness-card'));
ok('canais usam editor por chips', personas.includes('bo-h724-chip-editor') && personas.includes('addChannel'));
ok('tags usam editor por chips', personas.includes('addTag') && personas.includes('removeTag'));
ok('responsável possui sugestões', personas.includes('bo-h724-owner-options') && personas.includes('<datalist'));
ok('remoção saiu da barra fixa', !personas.includes('bo-h71-detail-actions"><button type="button" className="danger"'));
ok('remoção continua acessível por menu', personas.includes('bo-h724-detail-menu') && personas.includes('Remover persona'));
ok('barra inferior informa estado de salvamento', personas.includes('bo-h724-save-state') && personas.includes('Alterações ainda não salvas'));
ok('salvar incorpora chip pendente', personas.includes('effectiveDraft') && personas.includes('pendingChannel'));
ok('CSS H7.2.4 importado no bloco inicial', style.includes("@import './runtime/personas-h724.css';") && style.indexOf('personas-h724.css') < style.indexOf('@tailwind base'));
ok('CSS cria rail sticky e grid amplo', css.includes('.bo-h724-overview-aside') && css.includes('position:sticky') && css.includes('grid-template-columns:minmax(560px,1fr) 290px'));
ok('CSS reduz caixas e usa autogrow', css.includes('.bo-h724-field textarea') && css.includes('min-height:48px') && css.includes('resize:none'));
ok('CSS de chips presente', css.includes('.bo-h724-chip-editor') && css.includes('.bo-h724-chip'));
ok('layout responsivo preservado', css.includes('@media(max-width:1080px)') && css.includes('@media(max-width:760px)'));
ok('não reintroduz verde estrutural legado', !css.toLowerCase().includes('#1d9e75'));

let failures = 0;
for (const check of checks) {
  if (check.condition) console.log(`OK   ${check.label}`);
  else { console.log(`FAIL ${check.label}`); failures += 1; }
}
console.log(`\nV1.20.5-H7.2.4 Persona Editor UX Polish: ${checks.length - failures}/${checks.length} OK`);
process.exitCode = failures ? 1 : 0;

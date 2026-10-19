import fs from 'node:fs';

const files = {
  view: fs.readFileSync('src/views/PersonasView.tsx', 'utf8'),
  library: fs.readFileSync('src/views/WorkspaceLibraryView.tsx', 'utf8'),
  css: fs.readFileSync('src/runtime/personas-h71.css', 'utf8'),
  style: fs.readFileSync('src/style.css', 'utf8'),
};

const checks = [
  ['Personas tem view dedicada', files.library.includes("if (page === 'personas') return <PersonasView studio={studio}/>;")],
  ['biblioteca possui busca', files.view.includes('Buscar personas')],
  ['biblioteca possui filtros', files.view.includes('Não usadas') && files.view.includes('Com evidência') && files.view.includes('Base incompleta')],
  ['criação abre Persona e não modal genérico', files.view.includes('Criar Persona') && files.view.includes('createDiscoveryEntity')],
  ['detalhe possui cinco abas', ['Visão geral','Comportamento','Relações','Evidências','Uso'].every((label) => files.view.includes(label))],
  ['editor usa Persona Studio canônico', files.view.includes('updatePersonaProfile') && files.view.includes('buildPersonaStudioReport')],
  ['relações usam Service Graph', files.view.includes('personaRelationOptions') && files.view.includes('connectedIds')],
  ['remoção limpa relações', files.view.includes('removePersonaFromGraph')],
  ['rastreamento de uso presente', files.view.includes('contextEntityUsage') && files.view.includes('ServiceUsageRelations')],
  ['modo simples/profissional preservado', files.view.includes("mode: 'simple'") && files.view.includes('Avançada')],
  ['CSS H7.1 importado no bloco inicial', files.style.includes("@import './runtime/personas-h71.css';") && files.style.indexOf("@import './runtime/personas-h71.css';") < files.style.indexOf('@tailwind base')],
  ['layout responsivo presente', files.css.includes('@media(max-width:1050px)') && files.css.includes('@media(max-width:760px)')],
  ['não reintroduz cor verde estrutural legada', !files.css.toLowerCase().includes('#1d9e75') && !files.css.toLowerCase().includes('#04342c')],
  ['não usa MutationObserver', !files.view.includes('MutationObserver')],
];

let ok = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${label}`);
  if (pass) ok += 1;
}
console.log(`\nH7.1 Personas 2.0: ${ok}/${checks.length} OK`);
if (ok !== checks.length) process.exit(1);

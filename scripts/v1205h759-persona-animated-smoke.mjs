import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const builder = read('src/views/PersonaSplitBuilder.tsx');
const css = read('src/views/persona-animated-h759.css');
const people = read('src/views/PersonasView.tsx');
const persona = read('src/services/persona-studio.ts');

const checks = [
  ['O editor real usa a tela animada', builder.includes('data-persona-animated-builder="H7.59"')],
  ['O layout incorpora o CSS de referência', builder.includes("import './persona-animated-h759.css'") && css.includes('.bo-h759-persona .bo-split-center')],
  ['A criação utiliza o rascunho real', builder.includes('value={draft.title}') && builder.includes('value={draft.context}')],
  ['O avatar usa a propriedade canônica', builder.includes('value={draft.imageUrl ??') && builder.includes('src={portraitUrl}') && persona.includes('personaPortraitUrl: safePersonaImage(input.draft.imageUrl)')],
  ['O avatar usa apenas HTTPS e iniciais, sem fotos aleatórias', builder.includes('const portraitUrl = ') && builder.includes('https:') && builder.includes('bo-h759-avatar-initials') && !builder.includes('randomuser.me')],
  ['Dores e necessidades reais continuam vinculadas', builder.includes('onAdd(kind, title)') && builder.includes('onRemove(id)') && people.includes('changePersonaEcosystem')],
  ['Rascunhos aguardam salvar, sem objetos órfãos', builder.includes('onSave(localNodes)') && people.includes('finishNewPersona')],
  ['Editor existente preserva o salvamento', people.includes('onSave={()=>{savePersona();setSplitOpen(false);}}')],
  ['Zoom, arraste e centralização são operáveis', builder.includes('onPointerDown={pointerDown}') && builder.includes('onPointerMove={pointerMove}') && builder.includes('const resetView = () =>')],
  ['Estatísticas refletem o estado dos nós', builder.includes("count('pain')") && builder.includes("count('need')")],
  ['Acessibilidade mantém diálogo e foco', builder.includes('aria-modal="true"') && builder.includes("app?.setAttribute('inert', '')")],
  ['A animação respeita movimento reduzido', css.includes('@media(prefers-reduced-motion:reduce)') && css.includes('animation:none!important')],
  ['Formulário e canvas se adaptam ao celular', css.includes('@media(max-width:800px)') && css.includes('grid-template-columns:minmax(0,1fr)')],
  ['Guiado não descarta nós pendentes', builder.includes('onGuided && !localNodes.length && !readOnly')],
];

let successes = 0;
for (const [description, pass] of checks) {
  console.log(`${pass ? 'OK' : 'FAIL'} ${description}`);
  if (pass) successes++;
}
console.log(`H7.59 Persona animada: ${successes}/${checks.length} PASS`);
assert.equal(successes, checks.length);

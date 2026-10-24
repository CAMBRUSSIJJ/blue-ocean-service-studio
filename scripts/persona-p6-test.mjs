import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  personaProfileFromEntity, updatePersonaProfile, normalizePersonaEvidenceClaims,
  personaEvidenceStatements, personaRelationOptions,
} from '../src/services/persona-studio.ts';
import { matrixCardMatches, matrixServiceReferences } from '../src/services/journey-content.js';

const original = {
  service: { id:'s1', updatedAt:'2026-10-01T00:00:00Z' },
  entities: {
    persona:{p1:{id:'p1',type:'persona',serviceId:'s1',title:'Cliente digital',
      behaviors:['Usa aplicativos'], relatedIds:[] }},
    evidence:{
      e1:{id:'e1',type:'evidence',serviceId:'s1',title:'Entrevista 01',source:'Pesquisa',relatedIds:[]},
      e2:{id:'e2',type:'evidence',serviceId:'other',title:'Outro serviço',source:'Fora do escopo'}
    }
  },
  journeys:{j1:{id:'j1',serviceId:'s1',stageIds:['s1'],
    matrixContent:{cells:{s1:{ev:[{i:'n1',type:'evidence',referenceId:'e1'}]}}}}},
  stages:{s1:{id:'s1',title:'Pesquisa',journeyId:'j1'}},
  problems:{},opportunities:{}
};
let checked=0;
const check=(value,message)=>{assert.ok(value,message);checked++;};
const draft=personaProfileFromEntity(original.entities.persona.p1);
check(personaEvidenceStatements(draft).some(row=>row.field==='behaviors' && row.statement==='Usa aplicativos'),
  'Extract exact Persona statements');
draft.evidenceClaims=[{field:'behaviors',statement:'Usa aplicativos',evidenceIds:['e1','e1','e2']}];
let next=updatePersonaProfile({graph:original,personaId:'p1',draft,connectedIds:[],now:'2026-10-02T00:00:00Z'});
const saved=next.entities.persona.p1;
check(saved.personaEvidenceClaims.length===1 && saved.personaEvidenceClaims[0].evidenceIds.join() === 'e1',
  'Deduplicate sources and reject cross-service evidence');
check(saved.relatedIds.includes('e1') && next.entities.evidence.e1.relatedIds.includes('p1'),
  'Anchor preserves canonical two-way Persona/evidence relations');
check(!original.entities.persona.p1.personaEvidenceClaims && !original.entities.evidence.e1.relatedIds.includes('p1'),
  'Input graph is not mutated');
check(!personaRelationOptions(next).some(item=>item.id==='e2'),
  'Persona relation selector isolates evidence from other services');
const refs=matrixServiceReferences(next,{journeyId:'j1'});
check(refs.evidence.find(item=>item.id==='e1').personaIds.includes('p1'),
  'Evidence reference exposes the existing Persona relationship');
check(refs.persona.find(item=>item.id==='p1').personaIds.includes('p1'),
  'Persona reference keeps its own identity');
const note={i:'n1',type:'evidence',referenceId:'e1',personaIds:refs.evidence.find(item=>item.id==='e1').personaIds};
check(matrixCardMatches(note,{personaId:'p1',includeUnassigned:false}) &&
      !matrixCardMatches(note,{personaId:'p-other',includeUnassigned:false}),
  'Focused card filter preserves Persona isolation');
const edited={...personaProfileFromEntity(saved),behaviors:['Prefere chamadas']};
next=updatePersonaProfile({graph:next,personaId:'p1',draft:edited,connectedIds:['e1'],now:'2026-10-03T00:00:00Z'});
check(next.entities.persona.p1.personaEvidenceClaims.length===0,
  'Editing a claim removes the stale statement-specific evidence anchor');
check(!next.entities.evidence.e1.relatedIds.includes('p1'),
  'Stale evidence is not retained as an automatically verified relation');
const explicit = updatePersonaProfile({graph:original,personaId:'p1',draft,connectedIds:['e1'],now:'2026-10-02T00:00:00Z'});
const later = updatePersonaProfile({graph:explicit,personaId:'p1',draft:edited,connectedIds:['e1'],now:'2026-10-03T00:00:00Z'});
check(later.entities.persona.p1.relatedIds.includes('e1'),
  'Explicit profile-wide evidence remains linked after a granular claim changes');
check(normalizePersonaEvidenceClaims([
  {field:'behaviors',statement:'A',evidenceIds:['e1']},
  {field:'behaviors',statement:'A',evidenceIds:['e1','e2']},
  {field:'invalid',statement:'B',evidenceIds:['e1']}
]).length===1,'Claim normalization enforces valid fields and unique statements');

const view=fs.readFileSync('src/views/PersonasView.tsx','utf8');
const editor=fs.readFileSync('src/views/PersonaEvidenceTrace.tsx','utf8');
const context=fs.readFileSync('src/runtime/journey-context-ui.js','utf8');
const filters=fs.readFileSync('src/runtime/journey-card-tools-ui.js','utf8');
check(view.includes('<PersonaEvidenceTrace draft={draft}') && editor.includes('Evidências por afirmação'),
  'Evidence editor is wired into the Persona tab');
check(context.includes('contextPersonaSelectionPending=true') && context.includes('includeUnassigned:false') &&
      filters.includes('cardToolsLinkedPersonas(note)'),
  'Persona selection focuses canonical evidence cards without altering the map');
console.log('P6: '+checked+' verification(s) OK');

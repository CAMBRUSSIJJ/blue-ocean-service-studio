import fs from 'node:fs';
import assert from 'node:assert/strict';
import { buildServiceDefinitionStudioReport, normalizeServiceDefinitionDraft, serviceDefinitionConnectionOptions, serviceDefinitionDraftFromDefinition } from '../src/services/service-definition.ts';
import { buildServiceProjectReport, createServiceProjectState, normalizeServiceProjectState, updateServiceProjectDefinition } from '../src/services/service-project.ts';

let passed = 0;
const ok = (condition, message) => { assert.ok(condition, message); passed += 1; };
const now = '2026-10-07T20:00:00.000Z';
const graph = {
  schemaVersion: 3,
  persistenceRevision: 1,
  entities: {
    persona: { 'persona-1': { id: 'persona-1', type: 'persona', title: 'Profissional sem tempo', description: 'Pessoa com rotina intensa' } },
    problem: { 'problem-1': { id: 'problem-1', type: 'problem', title: 'Deslocamento consome tempo', description: 'Fricção validada', status: 'validated', validatedAt: now } },
    evidence: { 'evidence-1': { id: 'evidence-1', type: 'evidence', title: '7 de 10 citam falta de tempo', description: 'Entrevistas', confidence: 'high' } },
  },
  views: { whiteboards: {} },
  service: { id: 'svc-definition', name: 'Lavanderia', description: '', journeyIds: [], createdAt: now, updatedAt: now, project: createServiceProjectState('svc-definition', now, 'definition') },
  journeys: {}, stages: {}, touchpoints: {}, problems: {}, opportunities: {}, tasks: {},
  blueprintDraft: { evidencias: '', frontstage: '', backstage: '', suporte: '' },
  research: { sources: {} },
};

const base = graph.service.project.definition;
ok(Array.isArray(base.successCriteria) && base.successCriteria.length === 0, 'new project initializes success criteria');
ok(Array.isArray(base.outOfScope) && base.outOfScope.length === 0, 'new project initializes out-of-scope list');
ok(Array.isArray(base.assumptions) && base.assumptions.length === 0, 'new project initializes assumptions');
ok(Array.isArray(base.personaIds) && base.personaIds.length === 0, 'new project initializes persona links');
ok(Array.isArray(base.problemIds) && base.problemIds.length === 0, 'new project initializes problem links');
ok(Array.isArray(base.evidenceIds) && base.evidenceIds.length === 0, 'new project initializes evidence links');

const legacy = structuredClone(graph);
delete legacy.service.project.definition.successCriteria;
delete legacy.service.project.definition.outOfScope;
delete legacy.service.project.definition.assumptions;
delete legacy.service.project.definition.personaIds;
delete legacy.service.project.definition.problemIds;
delete legacy.service.project.definition.evidenceIds;
const migrated = normalizeServiceProjectState(legacy);
ok(Array.isArray(migrated.service.project.definition.successCriteria), 'legacy project migrates success criteria');
ok(Array.isArray(migrated.service.project.definition.personaIds), 'legacy project migrates persona links');
ok(Array.isArray(migrated.service.project.definition.problemIds), 'legacy project migrates problem links');
ok(Array.isArray(migrated.service.project.definition.evidenceIds), 'legacy project migrates evidence links');

let report = buildServiceDefinitionStudioReport(graph);
ok(report.score === 0, 'empty definition starts at zero readiness');
ok(!report.readyToDesign, 'empty definition cannot start design');
ok(report.total === 9, 'definition readiness has nine explicit criteria');
ok(report.connections.length === 3, 'canonical Discovery options are exposed');
ok(report.connections.filter((item) => item.kind === 'persona').length === 1, 'persona option resolved');
ok(report.connections.filter((item) => item.kind === 'problem').length === 1, 'validated problem option resolved');
ok(report.connections.filter((item) => item.kind === 'evidence').length === 1, 'evidence option resolved');

const draft = normalizeServiceDefinitionDraft({
  promise: 'Roupa pronta sem deslocamento desnecessário',
  outcome: 'Cliente recupera tempo e recebe roupa pronta no prazo',
  scope: 'Coleta, lavagem, acompanhamento e entrega',
  startBoundary: 'Cliente solicita coleta',
  endBoundary: 'Entrega confirmada',
  principles: ['Simplicidade', 'Transparência', 'Confiabilidade', 'Simplicidade'],
  successCriteria: ['Entrega no prazo', 'Cliente conclui sem ajuda'],
  outOfScope: ['Conserto de roupas'],
  assumptions: ['Cliente aceita janela de coleta'],
  personaIds: ['persona-1', 'persona-1', 'missing'],
  problemIds: ['problem-1'],
  evidenceIds: ['evidence-1'],
});
ok(draft.principles.length === 3, 'definition normalizer deduplicates principles');
ok(draft.personaIds.length === 2, 'definition normalizer deduplicates ids before graph pruning');
report = buildServiceDefinitionStudioReport(graph, draft);
ok(report.score === 100, 'complete definition reaches 100 readiness');
ok(report.readyToDesign, 'complete definition is ready to design');
ok(report.completed === 9, 'all nine criteria complete');
ok(report.draft.personaIds.length === 1 && report.draft.personaIds[0] === 'persona-1', 'report prunes missing persona refs');
ok(report.targetPersonaCount === 1, 'target persona count');
ok(report.validatedProblemCount === 1, 'validated problem count');
ok(report.evidenceCount === 1, 'evidence count');
ok(report.checks.every((item) => item.complete), 'all readiness checks explainably complete');

let saved = updateServiceProjectDefinition(graph, report.draft);
const persisted = serviceDefinitionDraftFromDefinition(saved.service.project.definition);
ok(persisted.promise === draft.promise, 'promise persisted');
ok(persisted.outcome === draft.outcome, 'outcome persisted');
ok(persisted.scope === draft.scope, 'scope persisted');
ok(persisted.startBoundary === draft.startBoundary && persisted.endBoundary === draft.endBoundary, 'boundaries persisted');
ok(persisted.principles.length === 3, 'principles persisted');
ok(persisted.successCriteria.length === 2, 'success criteria persisted');
ok(persisted.outOfScope.length === 1, 'out-of-scope persisted');
ok(persisted.assumptions.length === 1, 'assumptions persisted');
ok(persisted.personaIds[0] === 'persona-1', 'persona link persisted');
ok(persisted.problemIds[0] === 'problem-1', 'problem link persisted');
ok(persisted.evidenceIds[0] === 'evidence-1', 'evidence link persisted');
const projectReport = buildServiceProjectReport(saved);
ok(projectReport.phases.definition.score === 100, 'Service Project phase uses expanded definition readiness');
ok(projectReport.phases.definition.completed === 9, 'Service Project phase has nine definition checks');

const noEvidence = normalizeServiceDefinitionDraft({ ...report.draft, evidenceIds: [] });
const noEvidenceReport = buildServiceDefinitionStudioReport(graph, noEvidence);
ok(noEvidenceReport.score === 89, 'missing evidence drops one of nine criteria');
ok(!noEvidenceReport.readyToDesign, 'missing evidence blocks design readiness');
ok(noEvidenceReport.checks.find((item) => item.id === 'evidence')?.complete === false, 'missing evidence criterion is explicit');

const options = serviceDefinitionConnectionOptions(graph, report.draft);
ok(options.find((item) => item.id === 'persona-1')?.selected === true, 'persona selection resolved');
ok(options.find((item) => item.id === 'problem-1')?.selected === true, 'problem selection resolved');
ok(options.find((item) => item.id === 'evidence-1')?.confidence === 'high', 'evidence confidence exposed');

const home = fs.readFileSync('src/views/WorkspaceHome.tsx', 'utf8');
const css = fs.readFileSync('src/runtime/service-project-home.css', 'utf8');
const service = fs.readFileSync('src/services/service-definition.ts', 'utf8');
for (const marker of ['data-service-definition-studio="1"', 'Service Definition Studio', 'PRONTIDÃO', '03 · RASTREABILIDADE', 'PERSONAS-ALVO', 'PROBLEMAS VALIDADOS', 'READINESS DE DEFINIÇÃO', 'Critérios de sucesso', 'Fora do escopo', 'Premissas a validar']) ok(home.includes(marker), `home marker ${marker}`);
for (const marker of ['.bo1201-definition-studio', '.bo1201-definition-layout', '.bo1201-definition-context', '.bo1201-definition-readiness', '.bo1201-definition-score']) ok(css.includes(marker), `css marker ${marker}`);
for (const marker of ['buildServiceDefinitionStudioReport', 'serviceDefinitionConnectionOptions', 'normalizeServiceDefinitionDraft', 'readyToDesign', 'successCriteria']) ok(service.includes(marker), `service marker ${marker}`);
const model = fs.readFileSync('src/domain/model.ts', 'utf8');
for (const marker of ['successCriteria: string[]', 'outOfScope: string[]', 'personaIds: Id[]', 'problemIds: Id[]', 'evidenceIds: Id[]']) ok(model.includes(marker), `model marker ${marker}`);
const schema = fs.readFileSync('src/domain/schema.ts', 'utf8');
for (const marker of ['successCriteria:z.array(z.string()).default([])', 'personaIds:idList.default([])', 'problemIds:idList.default([])', 'evidenceIds:idList.default([])']) ok(schema.includes(marker), `schema marker ${marker}`);
const integrity = fs.readFileSync('src/runtime/data-integrity.js', 'utf8');
for (const marker of ['successCriteria:[]', 'personaIds:[]', 'service.project.definition.personaIds', 'service.project.definition.problemIds', 'service.project.definition.evidenceIds']) ok(integrity.includes(marker), `runtime integrity marker ${marker}`);
const project = fs.readFileSync('src/services/service-project.ts', 'utf8');
ok(project.includes('definition.successCriteria.length > 0'), 'Service Project reads success criteria');
ok(project.includes('definition.personaIds.length > 0'), 'Service Project reads persona links');
ok(project.includes('definition.problemIds.length > 0'), 'Service Project reads problem links');
ok(project.includes('definition.evidenceIds.length > 0'), 'Service Project reads evidence links');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
ok(/^1\.(?:2[0-9]|[3-9][0-9])\./.test(pkg.version) && Number(pkg.version.split('.')[2]) >= (pkg.version.startsWith('1.20.') ? 1 : 0), 'package version 1.20.1 or newer');
ok(pkg.scripts['service-definition:smoke']?.includes('v1201-service-definition-smoke.mjs'), 'service definition smoke registered');
ok(pkg.scripts['service-definition:browser']?.includes('v1201-browser-service-definition.py'), 'service definition browser truth registered');
console.log(`V1.20.1 Service Definition Studio: ${passed} OK / 0 FAIL`);

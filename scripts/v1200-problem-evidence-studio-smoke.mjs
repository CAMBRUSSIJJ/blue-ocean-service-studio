import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createDiscoveryEntity } from '../src/services/discovery-workspace.ts';
import { createServiceProjectState } from '../src/services/service-project.ts';
import {
  buildProblemEvidenceStudioReport, evidenceDraftFromEntity, problemContextOptions, problemEvidenceOptions,
  problemHypothesisDraftFromEntity, updateEvidenceRecord, updateProblemHypothesis, validateProblemHypothesis,
} from '../src/services/problem-evidence-studio.ts';

let passed = 0;
const ok = (condition, message) => { assert.ok(condition, message); passed += 1; };
const now = '2026-10-07T19:00:00.000Z';
const graph = {
  schemaVersion: 3,
  persistenceRevision: 1,
  entities: {},
  views: { whiteboards: {} },
  service: { id: 'svc-problem', name: 'Lavanderia', description: '', journeyIds: [], createdAt: now, updatedAt: now, project: createServiceProjectState('svc-problem', now) },
  journeys: {}, stages: {}, touchpoints: {}, problems: {}, opportunities: {}, tasks: {},
  blueprintDraft: { evidencias: '', frontstage: '', backstage: '', suporte: '' },
  research: { sources: {} },
};

const specs = [
  ['persona', 'Profissional sem tempo', 'Pessoa que trabalha o dia inteiro', undefined],
  ['need', 'Economizar tempo', 'Resolver roupa sem deslocamento extra', undefined],
  ['job', 'Ter roupas prontas', 'Manter a semana organizada', undefined],
  ['pain', 'Deslocamento demorado', 'Ir e voltar consome tempo útil', undefined],
  ['problemHypothesis', 'O deslocamento é a principal fricção', 'A ida até a lavanderia parece concentrar a maior parte da fricção.', undefined],
  ['evidence', '7 de 10 citam falta de tempo', 'Entrevistas recorrentes mencionam deslocamento e falta de tempo.', 'high'],
  ['evidence', '2 clientes preferem atendimento presencial', 'Há um grupo menor que valoriza ir até a loja.', 'high'],
];
for (let i = 0; i < specs.length; i += 1) {
  const [kind, title, description, confidence] = specs[i];
  const id = `${kind}-${kind === 'evidence' ? (i - 4) : 1}`;
  const entity = createDiscoveryEntity({ graph, kind, title, description, confidence, now, id });
  graph.entities[kind] ||= {};
  graph.entities[kind][id] = entity;
}

ok(problemContextOptions(graph).length === 4, 'four context objects available');
ok(problemEvidenceOptions(graph).length === 2, 'two evidences available');
ok(problemHypothesisDraftFromEntity(graph.entities.problemHypothesis['problemHypothesis-1']).title.includes('deslocamento'), 'hypothesis draft derives title');
ok(evidenceDraftFromEntity(graph.entities.evidence['evidence-1']).confidence === 'high', 'evidence draft preserves confidence');
let report = buildProblemEvidenceStudioReport(graph, 'problemHypothesis-1');
ok(Boolean(report), 'studio report exists');
ok(report.status === 'hypothesis', 'starts as hypothesis');
ok(report.validationScore === 33, 'statement and no-strong-contradiction are initially complete');
ok(!report.readyToValidate, 'cannot validate without linked context/evidence');
ok(report.contextConnections.length === 0, 'no context connections initially');
ok(report.evidenceConnections.length === 0, 'no evidence connections initially');

const draft = { title: 'O deslocamento é a principal fricção', description: 'O deslocamento amplia tempo e esforço.', impact: 'Aumenta abandono e custo de tempo.' };
let updated = updateProblemHypothesis({
  graph,
  hypothesisId: 'problemHypothesis-1',
  draft,
  contextIds: ['persona-1', 'need-1', 'job-1', 'pain-1'],
  evidenceLinks: [
    { evidenceId: 'evidence-1', stance: 'supports' },
    { evidenceId: 'evidence-2', stance: 'contradicts' },
  ],
  now: '2026-10-07T19:05:00.000Z',
});
const hypothesis = updated.entities.problemHypothesis['problemHypothesis-1'];
ok(hypothesis.title === draft.title, 'hypothesis title persisted');
ok(hypothesis.description === draft.description, 'hypothesis description persisted');
ok(hypothesis.impact === draft.impact, 'impact persisted');
ok(hypothesis.hypothesisVersion === 1, 'hypothesis version persisted');
ok(hypothesis.status === 'testing', 'linked evidence moves hypothesis to testing');
ok(hypothesis.contextIds.length === 4, 'context ids persisted');
ok(hypothesis.evidenceIds.length === 2, 'evidence ids persisted');
ok(hypothesis.evidenceLinks.length === 2, 'evidence relation metadata persisted');
ok(hypothesis.relatedIds.length === 6, 'general graph relations persisted');
for (const kind of ['persona', 'need', 'job', 'pain']) {
  const entity = updated.entities[kind][`${kind}-1`];
  ok(entity.relatedIds.includes('problemHypothesis-1'), `${kind} reverse relation exists`);
  ok(entity.hypothesisIds.includes('problemHypothesis-1'), `${kind} hypothesis index exists`);
}
for (const id of ['evidence-1', 'evidence-2']) {
  const evidence = updated.entities.evidence[id];
  ok(evidence.relatedIds.includes('problemHypothesis-1'), `${id} reverse relation exists`);
  ok(evidence.hypothesisIds.includes('problemHypothesis-1'), `${id} hypothesis index exists`);
}

report = buildProblemEvidenceStudioReport(updated, 'problemHypothesis-1');
ok(report.status === 'testing', 'report shows testing');
ok(report.contextConnections.length === 4, 'four context connections resolved');
ok(report.evidenceConnections.length === 2, 'two evidence connections resolved');
ok(report.supportCount === 1, 'support count');
ok(report.contradictionCount === 1, 'contradiction count');
ok(report.neutralCount === 0, 'neutral count');
ok(report.highConfidenceSupportCount === 1, 'high-confidence support count');
ok(report.highConfidenceContradictionCount === 1, 'high-confidence contradiction count');
ok(report.validationScore === 83, 'only strong contradiction blocks readiness');
ok(!report.readyToValidate, 'strong contradiction blocks validation');
ok(report.validationChecks.find((item) => item.id === 'contradiction')?.complete === false, 'contradiction criterion is explainable');

updated = updateProblemHypothesis({
  graph: updated,
  hypothesisId: 'problemHypothesis-1',
  draft,
  contextIds: ['persona-1', 'need-1', 'job-1', 'pain-1'],
  evidenceLinks: [
    { evidenceId: 'evidence-1', stance: 'supports' },
    { evidenceId: 'evidence-2', stance: 'neutral' },
  ],
  now: '2026-10-07T19:10:00.000Z',
});
report = buildProblemEvidenceStudioReport(updated, 'problemHypothesis-1');
ok(report.validationScore === 100, 'readiness reaches 100 after strong contradiction is resolved');
ok(report.readyToValidate, 'hypothesis ready to validate');
ok(report.supportCount === 1, 'support remains explicit');
ok(report.neutralCount === 1, 'contextual evidence remains linked');

let validated = validateProblemHypothesis(updated, 'problemHypothesis-1', '2026-10-07T19:15:00.000Z');
const validatedHypothesis = validated.entities.problemHypothesis['problemHypothesis-1'];
const problemId = validatedHypothesis.validatedProblemId;
ok(Boolean(problemId), 'validated problem id stored on hypothesis');
ok(validatedHypothesis.status === 'validated', 'hypothesis status validated');
ok(validatedHypothesis.validationNeedsReview === false, 'validation review flag cleared');
ok(Boolean(validated.entities.problem[problemId]), 'canonical validated problem created in entities.problem');
const problem = validated.entities.problem[problemId];
ok(problem.type === 'problem', 'validated entity type is problem');
ok(problem.status === 'validated', 'problem status validated');
ok(problem.sourceHypothesisId === 'problemHypothesis-1', 'problem preserves source hypothesis');
ok(problem.evidenceIds.length === 2, 'problem preserves evidence ids');
ok(problem.supportingEvidenceIds.length === 1, 'supporting evidence snapshot stored');
ok(problem.contradictingEvidenceIds.length === 0, 'no contradictory evidence in final snapshot');
ok(problem.contextIds.length === 4, 'problem preserves discovery context');
ok(problem.validationVersion === 1, 'validation version persisted');
ok(problem.validatedAt === '2026-10-07T19:15:00.000Z', 'validated timestamp persisted');
report = buildProblemEvidenceStudioReport(validated, 'problemHypothesis-1');
ok(report.status === 'validated', 'report resolves validated status');
ok(report.validatedProblem?.id === problemId, 'report resolves validated problem');

const evidenceBefore = validated.entities.evidence['evidence-1'];
validated = updateEvidenceRecord({ graph: validated, evidenceId: 'evidence-1', draft: { title: '7 de 10 entrevistados citam deslocamento', description: 'Entrevistas semiestruturadas.', confidence: 'medium', sourceType: 'interview' }, now: '2026-10-07T19:20:00.000Z' });
const evidenceAfter = validated.entities.evidence['evidence-1'];
ok(evidenceAfter.title.includes('entrevistados'), 'evidence title updated');
ok(evidenceAfter.description === 'Entrevistas semiestruturadas.', 'evidence description updated');
ok(evidenceAfter.confidence === 'medium', 'evidence confidence updated');
ok(evidenceAfter.sourceType === 'interview', 'evidence source type updated');
ok(evidenceAfter.evidenceVersion === 1, 'evidence version persisted');
ok(evidenceAfter.relatedIds.includes('problemHypothesis-1'), 'editing evidence preserves graph relation');
ok(evidenceBefore.id === evidenceAfter.id, 'editing evidence preserves identity');

const editedDraft = { ...draft, impact: 'Impacto revisado depois da validação.' };
let changed = updateProblemHypothesis({ graph: validated, hypothesisId: 'problemHypothesis-1', draft: editedDraft, contextIds: ['persona-1', 'need-1', 'job-1', 'pain-1'], evidenceLinks: [{ evidenceId: 'evidence-1', stance: 'supports' }, { evidenceId: 'evidence-2', stance: 'neutral' }], now: '2026-10-07T19:25:00.000Z' });
ok(changed.entities.problemHypothesis['problemHypothesis-1'].validationNeedsReview === true, 'editing validated hypothesis flags review');
const oldValidatedAt = changed.entities.problem[problemId].validatedAt;
changed = validateProblemHypothesis(changed, 'problemHypothesis-1', '2026-10-07T19:30:00.000Z');
ok(changed.entities.problemHypothesis['problemHypothesis-1'].validationNeedsReview === false, 'revalidation clears review flag');
ok(changed.entities.problem[problemId].impact === editedDraft.impact, 'revalidation refreshes validated problem');
ok(changed.entities.problem[problemId].validatedAt === oldValidatedAt, 'original validation date is preserved');
ok(changed.entities.problem[problemId].updatedAt === '2026-10-07T19:30:00.000Z', 'revalidation updates problem timestamp');

const refusedGraph = structuredClone(graph);
const refused = validateProblemHypothesis(refusedGraph, 'problemHypothesis-1', '2026-10-07T19:40:00.000Z');
ok(!refused.entities.problem, 'validation refuses incomplete hypothesis');

const home = fs.readFileSync('src/views/WorkspaceHome.tsx', 'utf8');
const css = fs.readFileSync('src/runtime/service-project-home.css', 'utf8');
const service = fs.readFileSync('src/services/problem-evidence-studio.ts', 'utf8');
const integrity = fs.readFileSync('src/runtime/data-integrity.js', 'utf8');
for (const marker of ['data-problem-evidence-studio="1"', 'PROBLEM &amp; EVIDENCE STUDIO', 'Transforme suposição em problema rastreável', 'Hipóteses e problemas', 'Evidências', 'CRITÉRIOS DE VALIDAÇÃO', 'BALANÇO DE EVIDÊNCIAS', 'Validar como problema', 'Atualizar problema validado', 'EVIDENCE DESK']) ok(home.includes(marker), `home marker ${marker}`);
for (const marker of ['Sustenta', 'Contradiz', 'Contextual', 'Não ligada', 'Confiança', 'Tipo de fonte']) ok(home.includes(marker), `evidence UI marker ${marker}`);
for (const marker of ['.bo1200-problem-evidence-studio', '.bo1200-problem-layout', '.bo1200-evidence-matrix', '.bo1200-validation-panel', '.bo1200-evidence-layout']) ok(css.includes(marker), `css marker ${marker}`);
for (const marker of ['buildProblemEvidenceStudioReport', 'updateProblemHypothesis', 'updateEvidenceRecord', 'validateProblemHypothesis', 'readyToValidate', 'evidenceLinks']) ok(service.includes(marker), `service marker ${marker}`);
ok(integrity.includes("'job','pain','problemHypothesis','problem'"), 'runtime integrity initializes new canonical kinds');
const project = fs.readFileSync('src/services/service-project.ts', 'utf8');
ok(project.includes('validatedProblems = count(graph.entities?.problem)'), 'Service Project counts validated problems');
ok(project.includes('validatedProblems + stagedProblems > 0'), 'Improvement requires validated/structured problem');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
ok(/^1\.(?:2[0-9]|[3-9][0-9])\./.test(pkg.version), 'package version remains V1.20+');
ok(pkg.scripts['problem-evidence:smoke']?.includes('v1200-problem-evidence-studio-smoke.mjs'), 'problem evidence smoke registered');
ok(pkg.scripts['problem-evidence:browser']?.includes('v1200-browser-problem-evidence-studio.py'), 'problem evidence browser truth registered');

console.log(`V1.20.0 Problem & Evidence Studio: ${passed} OK / 0 FAIL`);

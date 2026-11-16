import { describe, it, expect } from 'vitest';
import { buildGuidedWorkspaceRecommendation } from '../guided-service-workspace.ts';
import type { GuidedWorkspaceFacts } from '../guided-service-workspace.ts';

/** Fully-done facts → cockpit recommendation. Modify one field to trigger each branch. */
function doneFacts(overrides: Partial<GuidedWorkspaceFacts> = {}): GuidedWorkspaceFacts {
  return {
    researchReady: true,
    ecologyReady: true,
    propositionReady: true,
    journeys: 2,
    channels: 3,
    channelCoverage: 100,
    blueprints: 1,
    whiteboards: 0,
    whiteboardObjects: 0,
    prototypes: 1,
    learnings: 1,
    decisions: 1,
    currentFutureReady: true,
    prioritizedProblems: 2,
    initiatives: 1,
    outcomesReady: true,
    governanceCoverage: 100,
    governanceOverdue: 0,
    governancePendingApproval: 0,
    operationsCoverage: 100,
    operationsErrors: 0,
    ...overrides,
  };
}

/** Minimal facts for a brand-new service. */
function emptyFacts(overrides: Partial<GuidedWorkspaceFacts> = {}): GuidedWorkspaceFacts {
  return {
    researchReady: false,
    ecologyReady: false,
    propositionReady: false,
    journeys: 0,
    channels: 0,
    channelCoverage: 0,
    blueprints: 0,
    whiteboards: 0,
    whiteboardObjects: 0,
    prototypes: 0,
    learnings: 0,
    decisions: 0,
    currentFutureReady: false,
    prioritizedProblems: 0,
    initiatives: 0,
    outcomesReady: false,
    governanceCoverage: 0,
    governanceOverdue: 0,
    governancePendingApproval: 0,
    operationsCoverage: 0,
    operationsErrors: 0,
    ...overrides,
  };
}

// ─── Returned shape ──────────────────────────────────────────────────────────

describe('buildGuidedWorkspaceRecommendation — shape', () => {
  it('retorna target, phase, title, reason, label, alternatives', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts());
    expect(result).toMatchObject({
      target: expect.any(String),
      phase: expect.any(String),
      title: expect.any(String),
      reason: expect.any(String),
      label: expect.any(String),
      alternatives: expect.any(Array),
    });
  });

  it('alternatives limita a no máximo 2 items', () => {
    // Trigger contextual list with multiple items to test the slice(0,2)
    const facts = doneFacts({ channels: 2, channelCoverage: 50, researchReady: false, propositionReady: false, whiteboards: 1, whiteboardObjects: 0 });
    const result = buildGuidedWorkspaceRecommendation(facts);
    expect(result.alternatives.length).toBeLessThanOrEqual(2);
  });

  it('alternatives exclui o próprio target', () => {
    const facts = emptyFacts({ researchReady: false, journeys: 0 });
    const result = buildGuidedWorkspaceRecommendation(facts);
    expect(result.alternatives.some(a => a.target === result.target)).toBe(false);
  });
});

// ─── Branches — decision tree ────────────────────────────────────────────────

describe('buildGuidedWorkspaceRecommendation — branches', () => {
  it('target="research" quando researchReady=false e journeys=0', () => {
    const result = buildGuidedWorkspaceRecommendation(emptyFacts({ researchReady: false }));
    expect(result.target).toBe('research');
  });

  it('target="ecology" quando ecologyReady=false, researchReady=true e journeys=0', () => {
    const result = buildGuidedWorkspaceRecommendation(emptyFacts({ researchReady: true, ecologyReady: false }));
    expect(result.target).toBe('ecology');
  });

  it('target="proposition" quando propositionReady=false, research/ecology ok e journeys=0', () => {
    const result = buildGuidedWorkspaceRecommendation(emptyFacts({ researchReady: true, ecologyReady: true, propositionReady: false }));
    expect(result.target).toBe('proposition');
  });

  it('target="journey" quando journeys=0 e todos os anteriores ok', () => {
    const result = buildGuidedWorkspaceRecommendation(emptyFacts({ researchReady: true, ecologyReady: true, propositionReady: true }));
    expect(result.target).toBe('journey');
  });

  it('atalho blueprint quando journeys>0 e channels>0 e blueprints=0 (antes de channels)', () => {
    // This short-circuit fires even if channelCoverage < 80
    const result = buildGuidedWorkspaceRecommendation(emptyFacts({ journeys: 1, channels: 2, channelCoverage: 50, blueprints: 0 }));
    expect(result.target).toBe('blueprint');
  });

  it('target="channels" quando channels=0', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ channels: 0, channelCoverage: 0, blueprints: 1 }));
    expect(result.target).toBe('channels');
  });

  it('target="channels" quando channelCoverage<80', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ channels: 3, channelCoverage: 70, blueprints: 1 }));
    expect(result.target).toBe('channels');
  });

  it('target="blueprint" quando blueprints=0 e channels suficiente', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ blueprints: 0 }));
    expect(result.target).toBe('blueprint');
  });

  it('target="prototypes" quando prototypes=0', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ prototypes: 0 }));
    expect(result.target).toBe('prototypes');
  });

  it('target="learning" quando learnings=0', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ learnings: 0 }));
    expect(result.target).toBe('learning');
  });

  it('target="decisions" quando decisions=0', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ decisions: 0 }));
    expect(result.target).toBe('decisions');
  });

  it('target="current-future" quando currentFutureReady=false', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ currentFutureReady: false }));
    expect(result.target).toBe('current-future');
  });

  it('target="improvement" quando prioritizedProblems=0', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ prioritizedProblems: 0 }));
    expect(result.target).toBe('improvement');
  });

  it('target="portfolio" quando initiatives=0', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ initiatives: 0 }));
    expect(result.target).toBe('portfolio');
  });

  it('target="outcomes" quando outcomesReady=false', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ outcomesReady: false }));
    expect(result.target).toBe('outcomes');
  });

  it('target="governance" quando governanceCoverage<80', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ governanceCoverage: 60 }));
    expect(result.target).toBe('governance');
  });

  it('target="governance" quando governanceOverdue>0', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ governanceOverdue: 1 }));
    expect(result.target).toBe('governance');
  });

  it('target="governance" quando governancePendingApproval>0', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ governancePendingApproval: 2 }));
    expect(result.target).toBe('governance');
  });

  it('target="operations" quando operationsCoverage<80', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ operationsCoverage: 70 }));
    expect(result.target).toBe('operations');
  });

  it('target="operations" quando operationsErrors>0', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ operationsErrors: 1 }));
    expect(result.target).toBe('operations');
  });

  it('target="cockpit" quando tudo completo', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts());
    expect(result.target).toBe('cockpit');
  });
});

// ─── phaseForTarget mapeado no retorno ──────────────────────────────────────

describe('buildGuidedWorkspaceRecommendation — phase', () => {
  it('phase="understand" para target research', () => {
    const result = buildGuidedWorkspaceRecommendation(emptyFacts());
    expect(result.phase).toBe('understand');
  });

  it('phase="design" para target journey', () => {
    const result = buildGuidedWorkspaceRecommendation(emptyFacts({ researchReady: true, ecologyReady: true, propositionReady: true }));
    expect(result.phase).toBe('design');
  });

  it('phase="design" para target channels', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ channels: 0, blueprints: 1 }));
    expect(result.phase).toBe('design');
  });

  it('phase="validate" para target prototypes', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ prototypes: 0 }));
    expect(result.phase).toBe('validate');
  });

  it('phase="improve" para target improvement', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ prioritizedProblems: 0 }));
    expect(result.phase).toBe('improve');
  });

  it('phase="operate" para target cockpit', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts());
    expect(result.phase).toBe('operate');
  });

  it('phase="operate" para target governance', () => {
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ governanceOverdue: 1 }));
    expect(result.phase).toBe('operate');
  });
});

// ─── contextual alternatives ─────────────────────────────────────────────────

describe('buildGuidedWorkspaceRecommendation — contextual alternatives', () => {
  it('inclui "Classificar canais pendentes" quando channels>0 e channelCoverage<100', () => {
    const result = buildGuidedWorkspaceRecommendation(emptyFacts({ researchReady: true, ecologyReady: true, propositionReady: true, channels: 2, channelCoverage: 60 }));
    // primary is journey; alternatives should include channels
    expect(result.alternatives.some(a => a.target === 'channels')).toBe(true);
  });

  it('inclui "Adicionar ao Whiteboard" quando whiteboards>0 e whiteboardObjects=0', () => {
    const result = buildGuidedWorkspaceRecommendation(emptyFacts({ researchReady: true, ecologyReady: true, propositionReady: true, whiteboards: 1, whiteboardObjects: 0 }));
    expect(result.alternatives.some(a => a.target === 'whiteboard')).toBe(true);
  });

  it('inclui "Completar pesquisa" quando !researchReady e primary não é research', () => {
    // journeys=1 so primary skips research branch; but researchReady=false adds research to contextual
    const result = buildGuidedWorkspaceRecommendation(emptyFacts({ journeys: 1, channels: 0, channelCoverage: 0, researchReady: false }));
    expect(result.alternatives.some(a => a.target === 'research')).toBe(true);
  });

  it('inclui "Definir proposição" quando !propositionReady e primary não é proposition', () => {
    const result = buildGuidedWorkspaceRecommendation(emptyFacts({ journeys: 1, channels: 0, researchReady: true, ecologyReady: true, propositionReady: false }));
    expect(result.alternatives.some(a => a.target === 'proposition')).toBe(true);
  });

  it('não repete target primário nas alternatives', () => {
    // channels primary → channels should NOT be in alternatives even if channelCoverage<100
    const result = buildGuidedWorkspaceRecommendation(doneFacts({ channels: 2, channelCoverage: 60, blueprints: 1 }));
    expect(result.alternatives.some(a => a.target === 'channels')).toBe(false);
  });
});

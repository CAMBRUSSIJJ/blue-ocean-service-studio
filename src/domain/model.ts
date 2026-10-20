export type Id = string;
export type ActiveTab = 'home' | 'context' | 'whiteboards' | 'journey' | 'canvas' | 'action';
export type Emotion = 'negative' | 'neutral' | 'positive';
export type JourneyMomentType = 'none' | 'positive' | 'negative' | 'critical';
export type TaskStatus = 'todo' | 'doing' | 'done';

export type ServiceProjectPhase = 'discovery' | 'definition' | 'design' | 'validation' | 'improvement';
export type ServiceProjectStatus = 'draft' | 'active' | 'validated' | 'archived';
export type ServiceProjectDefinition = {
  promise: string;
  outcome: string;
  scope: string;
  startBoundary: string;
  endBoundary: string;
  principles: string[];
  successCriteria: string[];
  outOfScope: string[];
  assumptions: string[];
  personaIds: Id[];
  problemIds: Id[];
  evidenceIds: Id[];
};
export type ServiceProjectState = {
  version: 1;
  id: Id;
  serviceId: Id;
  status: ServiceProjectStatus;
  currentPhase: ServiceProjectPhase;
  definition: ServiceProjectDefinition;
  createdAt: string;
  updatedAt: string;
};

export type DesignContextRef = {
  version: 1;
  source: 'service-definition';
  createdAt: string;
  personaIds: Id[];
  needIds: Id[];
  jobIds: Id[];
  painIds: Id[];
  problemIds: Id[];
  evidenceIds: Id[];
};


export type StakeholderKind = 'customer' | 'employee' | 'manager' | 'partner' | 'supplier' | 'regulator' | 'community' | 'organization' | 'system' | 'other';
export type StakeholderInfluence = 1 | 2 | 3 | 4 | 5;
export type ServiceStakeholder = {
  id: Id;
  serviceId: Id;
  name: string;
  kind: StakeholderKind;
  role?: string;
  summary?: string;
  goals?: string;
  needs?: string;
  influence: StakeholderInfluence;
  interest: StakeholderInfluence;
  evidenceIds: Id[];
  personaId?: Id;
  createdAt: string;
  updatedAt: string;
};
export type ServiceEcologyRelationKind = 'uses' | 'delivers' | 'depends_on' | 'pays' | 'influences' | 'regulates' | 'supports' | 'exchanges_information' | 'creates_value';
export type ServiceEcologyRelation = {
  id: Id;
  fromId: Id;
  toId: Id;
  kind: ServiceEcologyRelationKind;
  note?: string;
  strength?: 'weak' | 'medium' | 'strong';
  createdAt: string;
};
export type ServiceEcologyState = {
  version: 1;
  stakeholders: Record<Id, ServiceStakeholder>;
  relations: Record<Id, ServiceEcologyRelation>;
  updatedAt: string;
};

export type Service = {
  id: Id;
  name: string;
  description: string;
  journeyIds: Id[];
  createdAt: string;
  updatedAt: string;
  layerSettings?: ServiceLayerSettings;
  scenarios?: Record<Id, ServiceScenario>;
  scenarioState?: ScenarioState;
  presentationStudio?: PresentationStudio;
  intelligence?: ServiceIntelligenceState;
  benefitsRealization?: BenefitsRealizationState;
  operatingReview?: OperatingReviewState;
  collaboration?: CollaborationState;
  project?: ServiceProjectState;
  ecology?: ServiceEcologyState;
  proposition?: ServicePropositionState;
  /** H7.30 Service Prototype Lab. Experiments reference source artifacts without mutating them. */
  prototypeLab?: ServicePrototypeLabState;
  /** H7.31 Evidence & Learning System. Converts completed prototype rounds into canonical evidence and explicit learnings. */
  learningSystem?: ServiceLearningState;
  /** H7.32 Decision & Iteration Loop. Turns reviewed learnings into explicit, approved and conflict-safe service changes. */
  decisionSystem?: ServiceDecisionState;
  /** H7.33 Current × Future Service. Keeps an explicit baseline and a separately editable target state without mutating canonical service objects. */
  currentFuture?: CurrentFutureServiceState;
  /** H7.34 Problems, Opportunities & Prioritization. Central improvement backlog fed by traceable service signals. */
  improvementBacklog?: ServiceImprovementBacklogState;
  /** H7.35 Improvement Portfolio. Turns selected opportunities into governed, traceable improvement initiatives. */
  improvementPortfolio?: ServiceImprovementPortfolioState;
  /** H7.36 Metrics & Service Outcomes. Connects canonical metrics to service artifacts and records measured outcomes over time. */
  outcomes?: ServiceOutcomesState;
  /** H7.37 Service Governance. Defines ownership, review cadence, approval and governance health for critical service components. */
  governance?: ServiceGovernanceState;
  /** H7.38 Service Operations Bridge. Maps design artifacts to operational references and execution telemetry without coupling the graph to one provider. */
  operationsBridge?: ServiceOperationsBridgeState;
};

export type JourneyLaneType = 'text' | 'image' | 'stage' | 'icons' | 'grid' | 'divider' | 'emotion' | 'embed';
export type JourneyCard = { id: string; content: string; checked?: boolean; icon?: string };
export type JourneyLaneTone = 'neutral' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
export type JourneyLane = { id: string; type: JourneyLaneType; label: string; hidden?: boolean; tone?: JourneyLaneTone; height?: number; binding?: 'customerAction' | 'thoughts' | 'touchpoints' | 'needs' | 'pains'; cards: Record<string, string>; cardItems?: Record<string, JourneyCard[]>; };
export type JourneyMapLayout = { version: 1; lanes: JourneyLane[]; stageWidth?: number; introDismissed?: boolean };

export type Journey = {
  id: Id;
  serviceId: Id;
  name: string;
  stageIds: Id[];
  mapLayout?: JourneyMapLayout;
  owner?: string;
  status?: 'draft' | 'active' | 'archived';
  favorite?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  objective?: string;
  nextReviewAt?: string;
  lastView?: WhiteboardLayoutMode;
  createdAt?: string;
  updatedAt?: string;
  lastOpenedAt?: string | null;
  /** Optional custom dashboard/editor cover. When absent, the Blue Ocean default cover is used. */
  coverImage?: string;
  coverUpdatedAt?: string;
  designContext?: DesignContextRef;
};

export type Stage = {
  id: Id;
  journeyId: Id;
  title: string;
  customerAction: string;
  thoughts?: string;
  emotion: Emotion;
  needIds?: Id[];
  painIds?: Id[];
  touchpointIds: Id[];
  validatedProblemIds?: Id[];
  evidenceIds?: Id[];
  momentOfTruth?: JourneyMomentType;
  momentNote?: string;
  problemIds: Id[];
  opportunityIds: Id[];
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
  scenarioIds?: Id[];
};

export type ServiceChannelKind = 'digital' | 'messaging' | 'phone' | 'email' | 'in_person' | 'physical' | 'partner' | 'system' | 'other';
export type ServiceChannel = {
  id: Id;
  serviceId: Id;
  name: string;
  kind: ServiceChannelKind;
  description?: string;
  owner?: string;
  active?: boolean;
  createdAt: string;
  updatedAt: string;
};
export type ChannelContinuityRating = 'unknown' | 'pass' | 'fail';
export type ChannelContinuityDimension = 'context' | 'identity' | 'ownership' | 'expectation' | 'status';
export type ChannelHandoffAssessment = {
  id: Id;
  serviceId: Id;
  fromChannelId: Id;
  toChannelId: Id;
  ratings: Record<ChannelContinuityDimension, ChannelContinuityRating>;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type Touchpoint = {
  id: Id;
  serviceId: Id;
  name: string;
  /** Legacy label preserved for backwards compatibility. H7.29 uses channelId as the canonical relation. */
  channel: string;
  channelId?: Id;
  scenarioIds?: Id[];
  experienceState?: 'current' | 'future' | 'both';
};

export type Problem = {
  id: Id;
  stageId: Id;
  description: string;
  scenarioIds?: Id[];
  experienceState?: 'current' | 'future' | 'both';
};

export type Opportunity = {
  id: Id;
  stageId: Id;
  title: string;
  problemIds: Id[];
  taskIds: Id[];
  scenarioIds?: Id[];
  experienceState?: 'current' | 'future' | 'both';
  owner?: string;
  impact?: number;
  effort?: number;
  metricIds?: Id[];
};

export type Task = {
  id: Id;
  opportunityId: Id;
  title: string;
  status: TaskStatus;
  owner?: string;
  accountable?: string;
  consulted?: string;
  informed?: string;
  stageId?: Id;
  journeyId?: Id;
  dueDate?: string;
  updatedAt?: string;
  scenarioIds?: Id[];
  horizon?: IntelligenceHorizon;
  impact?: number;
  effort?: number;
  risk?: InitiativeRisk;
  priority?: InitiativePriority;
  expectedResult?: string;
  metricIds?: Id[];
  dependencyIds?: Id[];
  dependenciesReviewed?: boolean;
};

export type StageDraft = {
  title: string;
  customerAction: string;
  touchpoints: string;
};

export type BlueprintDraft = {
  evidencias: string;
  frontstage: string;
  backstage: string;
  suporte: string;
};

export type BlueprintEvidencePurpose = 'service' | 'research';
export type BlueprintActivityRef = { kind: 'frontstage' | 'backstage' | 'process'; id: Id };
export type BlueprintActivityDetails = {
  durationMinutes?: number;
  waitMinutes?: number;
  targetMinutes?: number;
  capacityPerHour?: number;
  demandPerHour?: number;
  failureMode?: string;
  recoveryAction?: string;
  promiseLinked?: boolean;
  promiseContribution?: string;
  customerMessage?: string;
  predecessors?: BlueprintActivityRef[];
};
export type BlueprintQualityDimension = 'reliability' | 'responsiveness' | 'assurance' | 'empathy' | 'tangibles';
export type BlueprintServiceStrategy = {
  version: 1;
  promiseSource?: 'service' | 'custom';
  servicePromise?: string;
  product?: string;
  price?: string;
  place?: string;
  promotion?: string;
  people?: string;
  process?: string;
  physicalEvidence?: string;
  qualityCriteria?: Partial<Record<BlueprintQualityDimension, { criterion: string; metricId?: Id }>>;
};

export type GraphEntity = { id: Id; type?: string; title?: string; name?: string; description?: string; stageId?: Id; journeyId?: Id; serviceId?: Id; owner?: string; scenarioIds?: Id[]; experienceState?: 'current' | 'future' | 'both'; evidencePurpose?: BlueprintEvidencePurpose; operationalDetails?: BlueprintActivityDetails; [key: string]: unknown };

export type ServiceLayerKey = 'experience' | 'research' | 'friction' | 'improvement' | 'operation' | 'measurement';
export type ServiceLayerSettings = { visibleLayers: ServiceLayerKey[]; preset?: string };

// H7.28 — Blueprint Semantic Zoom + Custom Layers.
// Stored on the Blueprint board so every service can evolve its own operational language
// without changing the canonical Journey or other Blueprints in the workspace.
export type BlueprintSemanticZoom = 'strategic' | 'journey' | 'operational';
export type BlueprintLaneRole = 'evidence' | 'customer' | 'frontstage' | 'backstage' | 'process' | 'system' | 'custom';
export type BlueprintLaneConfig = {
  id: Id;
  key: string;
  role: BlueprintLaneRole;
  label: string;
  description: string;
  tone: 'slate' | 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'yellow';
  editable: boolean;
  required: boolean;
  order: number;
  visibleIn: BlueprintSemanticZoom[];
  custom?: boolean;
};
export type BlueprintSettings = {
  version: 1;
  semanticZoom: BlueprintSemanticZoom;
  preset: 'standard' | 'healthcare' | 'hospitality' | 'saas' | 'custom';
  lanes: BlueprintLaneConfig[];
  updatedAt: string;
};
export type ServicePropositionStatus = 'draft' | 'ready' | 'validated';
export type ServiceProposition = {
  version: 1;
  status: ServicePropositionStatus;
  audience: string;
  problem: string;
  promise: string;
  outcome: string;
  experience: string;
  differentiator: string;
  businessValue: string;
  capabilities: string[];
  principles: string[];
  linkedInsightIds: Id[];
  linkedNeedIds: Id[];
  linkedProblemIds: Id[];
  linkedEvidenceIds: Id[];
  createdAt: string;
  updatedAt: string;
};
export type ServicePropositionState = {
  version: 1;
  current: ServiceProposition;
  updatedAt: string;
};
export type PrototypeExperimentStatus = 'draft' | 'ready' | 'running' | 'completed' | 'archived';
export type PrototypeExperimentOutcome = 'pending' | 'passed' | 'failed' | 'inconclusive';
export type PrototypeCriterionResult = 'pending' | 'pass' | 'fail';
export type PrototypeFidelity = 'conversation' | 'paper' | 'clickable' | 'roleplay' | 'concierge' | 'process' | 'live_pilot';
export type PrototypeParticipant = {
  id: Id;
  name: string;
  role?: string;
  segment?: string;
  note?: string;
  createdAt: string;
};
export type PrototypeSuccessCriterion = {
  id: Id;
  label: string;
  measure?: string;
  target?: string;
  result: PrototypeCriterionResult;
  evidenceNote?: string;
};
export type PrototypeSourceSnapshot = {
  capturedAt: string;
  journeyId?: Id;
  journeyName?: string;
  stageIds: Id[];
  touchpoints: Array<{ id: Id; name: string; channelId?: Id; channel?: string }>;
  scenarioId?: Id;
  scenarioName?: string;
  proposition?: { status: ServicePropositionStatus; audience: string; promise: string; outcome: string; experience: string };
};
export type ServicePrototypeExperiment = {
  id: Id;
  serviceId: Id;
  title: string;
  hypothesis: string;
  fidelity: PrototypeFidelity;
  status: PrototypeExperimentStatus;
  outcome: PrototypeExperimentOutcome;
  objective?: string;
  instructions?: string;
  journeyId?: Id;
  stageIds: Id[];
  touchpointIds: Id[];
  scenarioId?: Id;
  participantIds: Id[];
  criteria: PrototypeSuccessCriterion[];
  observationNotes: string[];
  sourceSnapshot: PrototypeSourceSnapshot;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
};
export type ServicePrototypeLabState = {
  version: 1;
  experiments: Record<Id, ServicePrototypeExperiment>;
  participants: Record<Id, PrototypeParticipant>;
  activeExperimentId?: Id;
  updatedAt: string;
};

export type LearningHypothesisVerdict = 'validated' | 'refuted' | 'inconclusive';
export type LearningConfidence = 'low' | 'medium' | 'high';
export type LearningRecommendation = 'keep' | 'iterate' | 'discard' | 'retest';
export type LearningStatus = 'draft' | 'reviewed' | 'archived';
export type ServiceLearningRecord = {
  id: Id;
  serviceId: Id;
  experimentId: Id;
  experimentCompletedAt: string;
  hypothesisSnapshot: string;
  experimentOutcome: PrototypeExperimentOutcome;
  verdict: LearningHypothesisVerdict;
  confidence: LearningConfidence;
  recommendation: LearningRecommendation;
  status: LearningStatus;
  summary: string;
  rationale?: string;
  evidenceIds: Id[];
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
};
export type ServiceLearningState = {
  version: 1;
  records: Record<Id, ServiceLearningRecord>;
  activeLearningId?: Id;
  updatedAt: string;
};


export type ServiceDecisionStatus = 'draft' | 'proposed' | 'approved' | 'rejected' | 'applied' | 'archived';
export type ServiceDecisionTargetKind = 'proposition' | 'journey' | 'blueprint';
export type ServiceDecisionApplicationResult = 'applied' | 'conflict' | 'noop';
export type ServiceDecisionChange = {
  id: Id;
  targetKind: ServiceDecisionTargetKind;
  targetId?: Id;
  targetLabel: string;
  field: string;
  beforeValue: string;
  proposedValue: string;
  appliedAt?: string;
};
export type ServiceDecisionRecord = {
  id: Id;
  serviceId: Id;
  learningId: Id;
  title: string;
  rationale: string;
  status: ServiceDecisionStatus;
  recommendationSnapshot: LearningRecommendation;
  confidenceSnapshot: LearningConfidence;
  learningSummarySnapshot: string;
  changes: ServiceDecisionChange[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
  appliedAt?: string;
  applicationResult?: ServiceDecisionApplicationResult;
  applicationNote?: string;
};
export type ServiceDecisionState = {
  version: 1;
  records: Record<Id, ServiceDecisionRecord>;
  activeDecisionId?: Id;
  updatedAt: string;
};


export type ServiceStatePerspective = 'current' | 'future';
export type ServiceStateEntryKind = 'proposition' | 'journey' | 'channel' | 'blueprint' | 'responsibility';
export type ServiceGapStatus = 'unreviewed' | 'accepted' | 'in_progress' | 'resolved' | 'dismissed';
export type ServiceGapChangeType = 'changed' | 'added' | 'removed';
export type ServiceStateEntry = {
  id: Id;
  kind: ServiceStateEntryKind;
  sourceId?: Id;
  label: string;
  fields: Record<string, string>;
  sourceUpdatedAt?: string;
};
export type ServiceStateSnapshot = {
  id: Id;
  perspective: ServiceStatePerspective;
  serviceId: Id;
  label: string;
  capturedAt: string;
  sourceServiceUpdatedAt: string;
  entries: Record<Id, ServiceStateEntry>;
};
export type ServiceGapMetadata = {
  status: ServiceGapStatus;
  owner?: string;
  note?: string;
  updatedAt: string;
};
export type CurrentFutureServiceState = {
  version: 1;
  current?: ServiceStateSnapshot;
  future?: ServiceStateSnapshot;
  gapMetadata: Record<string, ServiceGapMetadata>;
  projectedDecisionIds: Id[];
  updatedAt: string;
};


export type ImprovementSourceKind = 'research' | 'validated_problem' | 'journey' | 'channel' | 'prototype' | 'current_future' | 'blueprint';
export type ImprovementProblemStatus = 'new' | 'triaged' | 'accepted' | 'resolved' | 'dismissed';
export type ImprovementOpportunityStatus = 'candidate' | 'selected' | 'planned' | 'discarded';
export type ImprovementPriorityBand = 'low' | 'medium' | 'high' | 'critical';
export type ImprovementSourceRef = {
  kind: ImprovementSourceKind;
  sourceId: string;
  label: string;
  detail?: string;
};
export type ServiceImprovementProblem = {
  id: Id;
  serviceId: Id;
  sourceKey: string;
  sourceRefs: ImprovementSourceRef[];
  sourceActive: boolean;
  title: string;
  description: string;
  impact: 1 | 2 | 3 | 4 | 5;
  frequency: 1 | 2 | 3 | 4 | 5;
  effort: 1 | 2 | 3 | 4 | 5;
  risk: 1 | 2 | 3 | 4 | 5;
  urgency: 1 | 2 | 3 | 4 | 5;
  status: ImprovementProblemStatus;
  owner?: string;
  note?: string;
  evidenceIds: Id[];
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
};
export type ServiceImprovementOpportunity = {
  id: Id;
  serviceId: Id;
  sourceKey?: string;
  title: string;
  problemIds: Id[];
  status: ImprovementOpportunityStatus;
  owner?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};
export type ServiceImprovementBacklogState = {
  version: 1;
  problems: Record<Id, ServiceImprovementProblem>;
  opportunities: Record<Id, ServiceImprovementOpportunity>;
  updatedAt: string;
};


export type ImprovementInitiativeStatus = 'backlog' | 'planned' | 'in_progress' | 'validating' | 'implemented';
export type ImprovementInitiativeRisk = 'low' | 'medium' | 'high';
export type ServiceImprovementInitiative = {
  id: Id;
  serviceId: Id;
  opportunityId: Id;
  title: string;
  problemIds: Id[];
  status: ImprovementInitiativeStatus;
  owner?: string;
  expectedOutcome?: string;
  effort: 1 | 2 | 3 | 4 | 5;
  expectedImpact: 1 | 2 | 3 | 4 | 5;
  deliveryRisk: ImprovementInitiativeRisk;
  progress: number;
  startDate?: string;
  targetDate?: string;
  dependencyIds: Id[];
  decisionIds: Id[];
  experimentIds: Id[];
  metricIds: Id[];
  note?: string;
  createdAt: string;
  updatedAt: string;
  implementedAt?: string;
};
export type ServiceImprovementPortfolioState = {
  version: 1;
  initiatives: Record<Id, ServiceImprovementInitiative>;
  updatedAt: string;
};

// H7.36 — Metrics & Service Outcomes. Metrics remain canonical GraphEntity records;
// this state stores explicit bindings and measurement history without mutating service artifacts.
export type ServiceMetricDirection = 'at_least' | 'at_most';
export type ServiceMetricTargetKind = 'proposition' | 'journey' | 'touchpoint' | 'handoff' | 'blueprint' | 'initiative';
export type ServiceMetricRole = 'value' | 'outcome' | 'experience' | 'sla' | 'operation' | 'result';
export type ServiceMetricBinding = {
  id: Id;
  serviceId: Id;
  metricId: Id;
  targetKind: ServiceMetricTargetKind;
  targetId: Id;
  role: ServiceMetricRole;
  createdAt: string;
};
export type ServiceMetricMeasurement = {
  id: Id;
  serviceId: Id;
  metricId: Id;
  value: number;
  measuredAt: string;
  note?: string;
  createdAt: string;
};
export type ServiceOutcomesState = {
  version: 1;
  bindings: Record<Id, ServiceMetricBinding>;
  measurements: Record<Id, ServiceMetricMeasurement>;
  updatedAt: string;
};

// H7.37 — Service Governance. Governance is explicit and traceable; it does not mutate governed artifacts.
export type ServiceGovernanceTargetKind = 'journey' | 'blueprint' | 'channel' | 'metric' | 'initiative';
export type ServiceGovernanceCadence = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';
export type ServiceGovernanceApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';
export type ServiceGovernanceReviewOutcome = 'healthy' | 'attention' | 'action_required';
export type ServiceGovernanceRecord = {
  id: Id; serviceId: Id; targetKind: ServiceGovernanceTargetKind; targetId: Id; targetLabel: string; active: boolean;
  owner?: string; accountable?: string; reviewers: string[]; cadence: ServiceGovernanceCadence; customIntervalDays?: number;
  nextReviewAt?: string; lastReviewedAt?: string; approvalRequired: boolean; approvalStatus: ServiceGovernanceApprovalStatus;
  approver?: string; approvedAt?: string; approvalNote?: string; note?: string; createdAt: string; updatedAt: string;
};
export type ServiceGovernanceReview = {
  id: Id; governanceId: Id; reviewedAt: string; reviewer: string; outcome: ServiceGovernanceReviewOutcome; note?: string; nextReviewAt?: string; createdAt: string;
};
export type ServiceGovernanceState = {
  version: 1; records: Record<Id, ServiceGovernanceRecord>; reviews: Record<Id, ServiceGovernanceReview>; updatedAt: string;
};

// H7.38 — Service Operations Bridge. Operational references are explicit mappings; external execution remains provider-controlled.
export type ServiceOperationTargetKind = 'touchpoint' | 'journey' | 'channel' | 'blueprint' | 'initiative' | 'metric';
export type ServiceOperationKind = 'activity' | 'workflow' | 'communication' | 'process' | 'execution' | 'data_source';
export type ServiceOperationProvider = 'internal' | 'realtalent_crm' | 'webhook' | 'manual' | 'other';
export type ServiceOperationDirection = 'design_to_ops' | 'ops_to_design' | 'bidirectional';
export type ServiceOperationSyncMode = 'reference' | 'manual' | 'scheduled' | 'event';
export type ServiceOperationBindingStatus = 'draft' | 'active' | 'paused' | 'error' | 'archived';
export type ServiceOperationRunStatus = 'simulated' | 'success' | 'partial' | 'failed';
export type ServiceOperationBinding = {
  id: Id; serviceId: Id; targetKind: ServiceOperationTargetKind; targetId: Id; targetLabel: string; targetActive: boolean;
  operationKind: ServiceOperationKind; provider: ServiceOperationProvider; externalRef?: string; direction: ServiceOperationDirection; syncMode: ServiceOperationSyncMode;
  status: ServiceOperationBindingStatus; owner?: string; note?: string; lastRunAt?: string; lastRunStatus?: ServiceOperationRunStatus; lastRunMessage?: string; createdAt: string; updatedAt: string;
};
export type ServiceOperationRun = {
  id: Id; serviceId: Id; bindingId: Id; startedAt: string; completedAt?: string; status: ServiceOperationRunStatus; message?: string; createdAt: string;
};
export type ServiceOperationsBridgeState = {
  version: 1; bindings: Record<Id, ServiceOperationBinding>; runs: Record<Id, ServiceOperationRun>; updatedAt: string;
};

export type ServiceScenarioStatus = 'draft' | 'testing' | 'accepted' | 'rejected';
export type ServiceScenario = {
  id: Id;
  name: string;
  description?: string;
  kind: 'current' | 'future' | 'alternative';
  createdAt: string;
  updatedAt?: string;
  status?: ServiceScenarioStatus;
  hypothesis?: string;
  baselineScenarioId?: Id;
  propositionPatch?: Partial<ServiceProposition>;
  successCriteria?: string[];
  insightIds?: Id[];
  needIds?: Id[];
  problemIds?: Id[];
  evidenceIds?: Id[];
  promotedAt?: string;
};
export type ScenarioState = { mode: 'all' | 'single' | 'compare'; activeScenarioId: Id; compareScenarioId: Id };


export type IntelligenceHorizon = 'now' | 'next' | 'later';
export type InitiativeRisk = 'low' | 'medium' | 'high';
export type InitiativePriority = 'low' | 'medium' | 'high' | 'critical';
export type ServiceIntelligenceState = { version: 1; lastReviewedAt?: string | null };

export type OperatingReviewCadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';
export type OperatingDecisionStatus = 'open' | 'done' | 'cancelled';
export type OperatingDecisionType = 'decision' | 'commitment' | 'escalation';
export type OperatingDecision = { id: Id; title: string; type: OperatingDecisionType; owner?: string; dueDate?: string; status: OperatingDecisionStatus; rationale?: string; sourceAgendaId?: string; sourceType?: string; sourceId?: Id; meetingId?: Id; taskId?: Id; createdAt: string; updatedAt?: string };
export type OperatingReviewAgendaSignal = { severity: 'high' | 'medium' | 'low'; category: string; detail: string };
export type OperatingReviewAgendaItem = { id: string; sourceType: string; sourceId: Id; severity: 'high' | 'medium' | 'low'; category: string; title: string; detail: string; owner?: string; signalCount?: number; signals?: OperatingReviewAgendaSignal[] };
export type OperatingReviewMeeting = { id: Id; title: string; facilitator?: string; startedAt: string; endedAt?: string | null; status: 'open' | 'closed'; agendaSnapshot: OperatingReviewAgendaItem[]; discussedIds: string[]; decisionIds: Id[]; snapshot?: Record<string, number | string | null>; snapshotEnd?: Record<string, number | string | null> };
export type OperatingReviewState = { version: 1 | 2; cadence: OperatingReviewCadence; owner?: string; nextReviewAt?: string; lastReviewedAt?: string | null; activeMeetingId?: Id | null; meetings: OperatingReviewMeeting[]; decisions: OperatingDecision[]; suppressedAgenda?: Record<string, { until?: string; reason?: string }> };

export type BenefitStatus = 'planned' | 'tracking' | 'at_risk' | 'realized' | 'stopped';
export type BenefitDirection = 'increase' | 'decrease';
export type BenefitConfidence = 'low' | 'medium' | 'high';
export type BenefitReview = { id: Id; benefitId: Id; reviewedAt: string; status: BenefitStatus; current?: number | ''; notes?: string };
export type BenefitsRealizationState = { version: 1; lastReviewedAt?: string | null; reviews: BenefitReview[] };
export type BenefitRecord = GraphEntity & { type: 'benefit'; title: string; owner?: string; status: BenefitStatus; baseline?: number | ''; current?: number | ''; target?: number | ''; unit?: string; direction: BenefitDirection; confidence?: BenefitConfidence; forecastDate?: string; nextReviewAt?: string; taskIds: Id[]; metricIds: Id[]; opportunityIds: Id[]; evidenceIds: Id[]; notes?: string; realizedAt?: string | null };


export type CollaborationRole = 'owner' | 'editor' | 'commenter' | 'viewer';
export type CollaborationMember = { id: Id; name: string; email?: string; role: CollaborationRole; status: 'active' | 'invited' | 'disabled'; avatar?: string; createdAt: string; updatedAt?: string };
export type CollaborationComment = { id: Id; targetType: 'service' | 'journey' | 'stage' | 'entity' | 'board' | 'item'; targetId: Id; targetLabel?: string; authorId: Id; body: string; status: 'open' | 'resolved'; createdAt: string; updatedAt?: string; resolvedAt?: string | null };
export type CollaborationActivity = { id: Id; actorId: Id; action: string; targetType?: string; targetId?: Id; summary: string; createdAt: string };
export type CollaborationSyncState = { mode: 'local-only' | 'adapter-ready' | 'connected'; adapterId?: string | null; remoteWorkspaceId?: string | null; lastSyncedAt?: string | null; baseRevision?: number; conflicts?: Array<{ id: Id; entityType: string; entityId: Id; detectedAt: string; status: 'open' | 'resolved' }> };
export type CollaborationState = { version: 1; workspaceId: Id; workspaceName: string; currentUserId: Id; members: Record<Id, CollaborationMember>; comments: CollaborationComment[]; activity: CollaborationActivity[]; sync: CollaborationSyncState };

export type WorkshopSession = {
  id: Id;
  name: string;
  source: 'frames' | 'stages';
  startedAt: string;
  endedAt?: string | null;
  currentIndex: number;
  timerMinutes: number;
  timerEndsAt?: string | null;
  timerRemainingSec: number;
  timerRunning: boolean;
  votes: Record<Id, number>;
  voteLabels: Record<Id, string>;
  notes?: string;
  summary?: { topVotes?: Array<{ id: Id; label: string; votes: number }> };
};
export type PresentationStudio = {
  slideSource: 'frames' | 'stages';
  frameOrderByBoard: Record<Id, Id[]>;
  notes: Record<Id, string>;
  workshop: { timerMinutes: number; sessions: WorkshopSession[]; activeSessionId?: Id | null };
};


export type ResearchMethod = 'interview' | 'observation' | 'service_safari' | 'shadowing' | 'survey' | 'support' | 'analytics' | 'document' | 'workshop' | 'experiment' | 'other';
export type ResearchProjectStatus = 'draft' | 'active' | 'synthesis' | 'complete';
export type ResearchObservationKind = 'said' | 'observed' | 'measured' | 'context';
export type ResearchInsightLevel = 'said' | 'observed' | 'meaning';
export type ResearchSource = {
  id: Id; type: ResearchMethod;
  title: string; summary?: string; date?: string; owner?: string; participant?: string; tags?: string[]; projectId?: Id; method?: string; sample?: string; createdAt: string; updatedAt: string;
};
export type ResearchProject = {
  id: Id; serviceId: Id; title: string; goal: string; status: ResearchProjectStatus; methodIds: ResearchMethod[]; owner?: string; participantCount?: number; sourceIds: Id[]; observationIds: Id[]; createdAt: string; updatedAt: string;
};
export type ResearchObservation = {
  id: Id; serviceId: Id; projectId?: Id; sourceId?: Id; kind: ResearchObservationKind; text: string; context?: string; participant?: string; observedAt?: string; evidenceId?: Id; createdAt: string; updatedAt: string;
};
export type ResearchRepository = {
  sources: Record<Id, ResearchSource>;
  projects?: Record<Id, ResearchProject>;
  observations?: Record<Id, ResearchObservation>;
  collections?: Record<Id, { id: Id; title: string; sourceIds: Id[] }>;
  activeProjectId?: Id;
  createdAt?: string;
  updatedAt?: string;
};

export type GraphIntegrityState = { schemaVersion: 3; migratedAt?: string; lastValidatedAt?: string; lastRepairAt?: string; repairCount?: number };

export type ServiceGraph = {
  entities: Record<string, Record<Id, GraphEntity>>;
  persistenceRevision?: number;
  schemaVersion: 3;
  views: { whiteboards: Record<Id, WhiteboardView> };
  service: Service;
  journeys: Record<Id, Journey>;
  stages: Record<Id, Stage>;
  touchpoints: Record<Id, Touchpoint>;
  /** H7.29 canonical channels. Optional for backwards-compatible persisted graphs; schema migration defaults to {}. */
  channels?: Record<Id, ServiceChannel>;
  channelHandoffs?: Record<Id, ChannelHandoffAssessment>;
  problems: Record<Id, Problem>;
  opportunities: Record<Id, Opportunity>;
  tasks: Record<Id, Task>;
  blueprintDraft: BlueprintDraft;
  research: ResearchRepository;
  integrity?: GraphIntegrityState;
};

export type StageBundle = {
  stage: Stage;
  touchpoints: Touchpoint[];
  problems: Problem[];
  opportunities: Opportunity[];
  tasks: Task[];
};


// A board stores layout. A smart item points at one object in the Service Graph.
export type CoreObjectKind = 'stage' | 'touchpoint' | 'problem' | 'opportunity' | 'task';
export type RuntimeObjectKind = CoreObjectKind | 'benefit' | 'persona' | 'need' | 'job' | 'pain' | 'problemHypothesis' | 'expectation' | 'channel' | 'emotion' | 'evidence' | 'insight' | 'metric' | 'customerAction' | 'frontstage' | 'backstage' | 'process' | 'system' | 'person' | 'solution' | 'experiment' | 'resource' | 'responsible' | 'role' | 'dependency' | 'policy';
export type SmartObjectKind = RuntimeObjectKind;
export type WhiteboardTone = 'slate' | 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'yellow';
export type ServiceFrameLayerKey = 'evidence' | 'customer' | 'frontstage' | 'backstage' | 'process' | 'enablement';
export type WhiteboardSemantic = 'note' | 'evidence' | 'frontstage' | 'backstage' | 'process' | 'system' | 'role' | 'dependency' | 'policy' | 'frame';
export type WhiteboardItem =
  | { id: Id; kind: 'free'; shape: 'note' | 'text' | 'shape' | 'frame'; semantic?: WhiteboardSemantic; tone?: WhiteboardTone; groupId?: Id; text: string; x: number; y: number; width: number; height: number; serviceStageId?: Id; serviceLayer?: ServiceFrameLayerKey; blueprintStageId?: Id; blueprintLane?: string }
  | { id: Id; kind: 'smart'; objectKind: SmartObjectKind; objectId: Id; tone?: WhiteboardTone; groupId?: Id; x: number; y: number; width: number; height: number; serviceStageId?: Id; serviceLayer?: ServiceFrameLayerKey; blueprintStageId?: Id; blueprintLane?: string };
export type WhiteboardEdge = {
  id: Id; fromId: Id; toId: Id; label: string; style: 'solid' | 'dashed'; arrow: 'end' | 'both' | 'none';
};
export type WhiteboardLayoutMode = 'free' | 'service' | 'blueprint' | 'flow' | 'journey';
export type WhiteboardView = {
  id: Id; serviceId: Id; name: string; journeyId?: Id; viewKind?: 'journey' | 'blueprint' | 'free'; items: Record<Id, WhiteboardItem>; edges: Record<Id, WhiteboardEdge>;
  layoutMode?: WhiteboardLayoutMode; gridVisible?: boolean; snapToGrid?: boolean;
  designContext?: DesignContextRef; blueprintSettings?: BlueprintSettings; serviceStrategy?: BlueprintServiceStrategy; serviceFrameVersion?: number; updatedAt?: string;
};

export type JourneyRow = 'customerAction' | 'thoughts' | 'emotion' | 'needs' | 'touchpoints' | 'moments' | 'validatedProblems' | 'evidence' | 'problems' | 'opportunities';

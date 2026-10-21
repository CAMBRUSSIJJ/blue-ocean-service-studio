/** Read-only guidance based on the canonical Service Graph; never copies or invents activities. */
export const BLUEPRINT_EMOTION_LABELS = ['Muito insatisfeito','Insatisfeito','Neutro','Satisfeito','Muito satisfeito'];
export function blueprintEmotionValue(stage) {
  const raw = stage?.emotionScore;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= -2 && raw <= 2) return raw;
  return stage?.emotion === 'negative' ? -1 : stage?.emotion === 'positive' ? 1 : 0;
}
export function buildBlueprintGuidedReading({ stages = [], lanes = [], rows = [], issues = [], qualityDimensions = [], qualityCriteria = {} } = {}) {
  const order = ['customer','frontstage','backstage','evidence','process','enablement'];
  const sorted = [...lanes].sort((a,b) => order.indexOf(a.key) - order.indexOf(b.key));
  const checklist = sorted.map(lane => {
    const covered = rows.filter(row => !row.missing.some(missing => missing.key === lane.key)).length;
    return { key: lane.key, label: lane.label, covered, total: stages.length };
  });
  const next = checklist.find(row => row.covered < row.total) ?? null;
  const validStages = new Set(stages.map(stage => stage.id));
  const priorities = issues.filter(issue => !issue.stageId || validStages.has(issue.stageId))
    .map(issue => ({ ...issue, stageTitle: stages.find(stage => stage.id === issue.stageId)?.title || '' }))
    .sort((a,b) => (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1))
    .slice(0,5);
  const quality = qualityDimensions.map(dimension => ({
    key: dimension.key, label: dimension.label, configured: !!String(qualityCriteria?.[dimension.key]?.criterion || '').trim()
  }));
  return {
    steps: stages.length, checklist, next, priorities,
    coverage: rows.length && lanes.length ? Math.round(rows.reduce((sum,row) => sum + row.complete,0) * 100 / (rows.length * lanes.length)) : 0,
    quality,
    qualityConfigured: quality.filter(d => d.configured).length,
    emotion: stages.map(stage => ({ stageId: stage.id, stageTitle: stage.title, value: blueprintEmotionValue(stage) })),
  };
}

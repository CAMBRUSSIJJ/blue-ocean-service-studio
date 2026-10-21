import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Self-contained runtime test: type-only model dependency disappears on transpilation.
const source = readFileSync(new URL('../src/domain/journey-visualization.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const visual = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(output));
assert.equal(visual.emotionScore(undefined, 'negative'), -1);
assert.equal(visual.emotionScore(-2, 'positive'), -2);
assert.equal(visual.emotionScore('2', 'positive'), 1);
assert.equal(visual.emotionFromScore(-2), 'negative');
assert.equal(visual.emotionFromScore(0), 'neutral');
assert.equal(visual.emotionFromScore(2), 'positive');
assert.equal(visual.metricValue(''), null);
assert.equal(visual.metricValue('NaN'), null);
assert.equal(visual.metricValue('4.5'), 4.5);
assert.deepEqual(visual.metricRange([null, -2, 6]), { min: -2, max: 6 });
assert.equal(visual.trendPath([0, 1, 2], 1, -2, 2), 'M 0 66 L 50 34 L 100 26');
assert.equal(visual.trendPath([null, null], 0, -2, 2), '');
const a=visual.trendPath([-2,2],0,-2,2);
const b=visual.trendPath([-2,2],1,-2,2);
assert.equal(Number(a.split(' ').at(-1)), Number(b.split(' ')[2]));
console.log('Journey visual curves: OK');

import { readFileSync } from 'node:fs';

const checks = [];
const check = (label, pass) => {
  checks.push({ label, pass: Boolean(pass) });
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${label}`);
};

const designSystem = readFileSync('src/views/DesignSystemView.tsx', 'utf8');
const home = readFileSync('src/views/WorkspaceHome.tsx', 'utf8');

check('DesignSystemView não importa React default sem uso', !/^import React from ['"]react['"];?/m.test(designSystem));
check('WorkspaceHome não importa Gauge sem uso', !/\bGauge\b/.test(home));
check('WorkspaceHome mantém hooks React usados', /import \{ useEffect, useMemo, useState \} from ['"]react['"]/.test(home));
check('typecheck segue obrigatório em source:verify', /"source:verify"\s*:\s*"[^"]*npm run typecheck/.test(readFileSync('package.json','utf8')));

const failed = checks.filter((item) => !item.pass);
console.log(`\nV1.17.7-H1 unused-import recovery: ${checks.length - failed.length}/${checks.length}`);
if (failed.length) process.exit(1);

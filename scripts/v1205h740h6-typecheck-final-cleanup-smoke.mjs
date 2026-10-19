import fs from 'node:fs';
const source = fs.readFileSync('src/views/BlueprintWorkspaceView.tsx','utf8');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
let ok=0, fail=0;
function check(cond,msg){ if(cond){ console.log('OK:',msg); ok++; } else { console.error('FAIL:',msg); fail++; } }
check(fs.existsSync('src/views/BlueprintWorkspaceView.tsx'),'BlueprintWorkspaceView existe');
check(!source.includes('const primaryJourney = journeys[0] ?? studio.journey;'),'primaryJourney não utilizado foi removido');
check(source.includes('buildServiceEcologyReport'),'Workspace H7.40-H5 preservado após cleanup');
check((pkg.description||'').includes('H7.40-H6 Typecheck Final Cleanup'),'release H7.40-H6 identificada no package');
console.log(`H7.40-H6 Typecheck Final Cleanup: ${ok}/${ok+fail} PASS`);
if(fail) process.exit(1);

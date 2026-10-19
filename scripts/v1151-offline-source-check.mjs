import { execFileSync } from 'node:child_process';

const run = (cmd, args) => {
  console.log(`> ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, {stdio:'inherit'});
};
run('node', ['scripts/v1151-lock-verify.mjs']);
run('tsc', ['--noEmit', '--noCheck']);
run('node', ['scripts/v1120-stability-smoke.mjs']);
run('node', ['scripts/v1130-design-system-smoke.mjs']);
run('node', ['scripts/v1140-workspace-home-smoke.mjs']);
run('node', ['scripts/v1150-global-navigation-smoke.mjs']);
run('node', ['scripts/v1102-demo-smoke.mjs']);
console.log('\nOffline source check: OK');

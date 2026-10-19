import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { sourceFingerprint } from './source-fingerprint.mjs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (!existsSync('dist/index.html')) throw new Error('dist/index.html ausente; execute o build antes do provenance.');
const source = sourceFingerprint();
const lockHash = createHash('sha256').update(readFileSync('package-lock.json')).digest('hex');
const buildId = createHash('sha256').update(`${pkg.version}:${source.hash}:${lockHash}`).digest('hex').slice(0, 16);
const manifest = {
  product: 'BLUE OCEAN Service Studio',
  version: pkg.version,
  buildId,
  sourceSha256: source.hash,
  lockSha256: lockHash,
  sourceFileCount: source.files.length,
  sourceAuthority: 'src/',
  generatedBy: 'npm run build',
};
writeFileSync('dist/build-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Build provenance: ${pkg.version} · ${buildId}`);

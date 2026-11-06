import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';

export function prepareBlueOcean3D() {
  const source = resolve('src/integrations/blue-ocean3d');
  const target = resolve('public/blue-ocean3d');
  mkdirSync(target, { recursive: true });
  cpSync(source + '/app', target + '/app', { recursive: true, filter: path => !path.endsWith('.d.mts') });
  cpSync(source + '/vendor', target + '/vendor', { recursive: true });
  const manifest = JSON.parse(readFileSync(source + '/app/css-manifest.json', 'utf8'));
  const layers = manifest.map(name => 'sb-' + basename(name, '.css'));
  const bundle = ['/* Generated from src/integrations/blue-ocean3d/app/css-manifest.json. */', '@layer ' + layers.join(', ') + ';'];
  for (const name of manifest) {
    if (basename(name) !== name || !name.endsWith('.css')) throw new Error('Invalid 3D CSS manifest entry');
    const css = readFileSync(source + '/app/' + name, 'utf8');
    if (/!\s*important\b/i.test(css)) throw new Error('Use cascade layers in 3D CSS sources');
    bundle.push(`@layer sb-${basename(name, '.css')} {\n${css}\n}`);
  }
  bundle.push('[hidden] { display: none !important; }');
  writeFileSync(target + '/app/styles-bundle.css', bundle.join('\n') + '\n');
}

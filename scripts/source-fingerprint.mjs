import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DEFAULT_ROOTS = ['src', 'scripts', 'index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'postcss.config.js', 'tailwind.config.js', 'vercel.json'];

function collect(path, root, out) {
  if (!existsSync(path)) return;
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const name of readdirSync(path).sort()) collect(join(path, name), root, out);
    return;
  }
  out.push({ path: relative(root, path).replaceAll('\\', '/'), bytes: readFileSync(path) });
}

export function sourceFingerprint(root = process.cwd(), roots = DEFAULT_ROOTS) {
  const files = [];
  for (const item of roots) collect(join(root, item), root, files);
  files.sort((a, b) => a.path.localeCompare(b.path));
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file.path); hash.update('\0'); hash.update(file.bytes); hash.update('\0');
  }
  return { hash: hash.digest('hex'), files: files.map(file => file.path) };
}

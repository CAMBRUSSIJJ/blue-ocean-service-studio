import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const markdownFiles = (directory) => readdirSync(resolve(root, directory), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  .map((entry) => resolve(root, directory, entry.name));
const files = [
  ...markdownFiles('.'),
  ...markdownFiles('docs'),
  ...markdownFiles('.github'),
  ...markdownFiles('.cloud-environment'),
  resolve(root, 'docs/archive/README.md'),
];
const failures = [];
let checked = 0;

// Registros históricos mantêm os caminhos da época; apenas o índice é atual.
// A verificação é local e não requer acesso a URLs externas.
for (const file of files) {
  const source = readFileSync(file, 'utf8').replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '');
  const targets = [
    ...[...source.matchAll(/!?\[[^\]\n]*\]\(<?([^\s)>]+)>?(?:\s+["'][^\n]*?["'])?\)/g)].map((match) => match[1]),
    ...[...source.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/g)].map((match) => match[1]),
  ];
  for (const target of targets) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) continue;
    checked++;
    try {
      const path = decodeURIComponent(target.split(/[?#]/, 1)[0]);
      const destination = path.startsWith('/') ? resolve(root, `.${path}`) : resolve(dirname(file), path);
      if (!existsSync(destination)) failures.push(`${relative(root, file)}: ${target}`);
    } catch {
      failures.push(`${relative(root, file)}: destino inválido ${target}`);
    }
  }
}

if (failures.length) {
  console.error(`Documentação: ${failures.length} link(s) local(is) inválido(s).\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Documentação: ${checked} links locais válidos em ${files.length} arquivos.`);
}

#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const version = pkg.version || 'dev';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', 'dist');
const host = '127.0.0.1';
const port = 4173;
const url = `http://${host}:${port}/`;
const checkOnly = process.argv.includes('--check');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

function safePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, url).pathname);
  const requested = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.resolve(root, '.' + requested);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  let file = safePath(req.url || '/');
  if (!file) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(root, 'index.html');
  }
  try {
    const data = fs.readFileSync(file);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Type', mime[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.writeHead(200); res.end(data);
  } catch (err) {
    res.writeHead(500); res.end('Server error');
  }
});

server.on('error', (err) => {
  if (err?.code === 'EADDRINUSE') {
    console.error('A porta 4173 já está em uso. Feche a execução anterior antes de iniciar esta versão.');
  } else {
    console.error(`Não foi possível iniciar o servidor local: ${err.message}`);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  if (checkOnly) {
    console.log('Servidor local Node: porta 4173 disponível, aplicativo pronto.');
    server.close(() => process.exit(0));
    return;
  }
  console.log(`BLUE OCEAN Service Studio V${version} — ${url}`);
  console.log('Mantenha este terminal aberto. Pressione Ctrl+C para encerrar.');
  if (process.env.DISPLAY || process.env.WAYLAND_DISPLAY) {
    try {
      const child = spawn('xdg-open', [url], { stdio: 'ignore', detached: true });
      child.unref();
    } catch {}
  }
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));

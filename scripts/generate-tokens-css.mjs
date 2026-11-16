/**
 * Gerador de tokens.css a partir de tokens.ts
 *
 * Lê src/design-system/tokens.ts, extrai o objeto `boTokens` e gera
 * src/design-system/tokens.css com todas as CSS custom properties.
 *
 * Uso: chamado automaticamente por prepare-assets.mjs (npm run pretypecheck).
 */
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const tsOpts = {
  compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
};

// Transpila tokens.ts → JS (CommonJS para poder usar require-eval)
const tsSource = readFileSync('src/design-system/tokens.ts', 'utf8');
const jsSource = transpileModule(tsSource, tsOpts).outputText;

// Avalia o módulo CommonJS em memória
const mod = { exports: {} };
const fn = new Function('module', 'exports', 'require', jsSource);
fn(mod, mod.exports, createRequire(import.meta.url));

const { boTokens } = mod.exports;

if (!boTokens || typeof boTokens !== 'object') {
  console.error('[generate-tokens-css] ERRO: boTokens não encontrado em tokens.ts');
  process.exit(1);
}

// Separadores de seção (comentários inline detectados no objeto)
const SECTION_COMMENTS = {
  '--bo-color-primary-950': '/* ── Paleta de cores ─────────────────────────────────────────────────── */',
  '--bo-ocean-deep':        '\n  /* ── H7.13 — Blue Ocean Identity System ──────────────────────────── */',
  '--bo-color-canvas':      '\n  /* ── Cores semânticas de superfície e texto ───────────────────────── */',
  '--bo-color-success-700': '\n  /* ── Estados semânticos ────────────────────────────────────────────── */',
  '--bo-font-sans':         '\n  /* ── Tipografia ─────────────────────────────────────────────────────── */',
  '--bo-space-1':           '\n  /* ── Espaçamento ────────────────────────────────────────────────────── */',
  '--bo-radius-sm':         '\n  /* ── Raio / Sombras / Sobreposição ──────────────────────────────────── */',
  '--bo-control-h-sm':      '\n  /* ── Controles / Ícones / Layout ───────────────────────────────────── */',
  '--bo-transition-fast':   '\n  /* ── Motion / Z-index ───────────────────────────────────────────────── */',
  '--bo-board-canvas':      '\n  /* ── Aliases semânticos do Board ───────────────────────────────────── */',
  '--bo-navy':              '\n  /* ── Aliases de compatibilidade (módulos legados) ──────────────────── */',
};

const lines = [
  '/* BLUE OCEAN Service Studio — Design Tokens',
  '   ARQUIVO GERADO — edite src/design-system/tokens.ts, não este arquivo.',
  '   Gerado por scripts/generate-tokens-css.mjs */',
  ':root{',
  '  color-scheme:light;',
];

for (const [key, value] of Object.entries(boTokens)) {
  if (SECTION_COMMENTS[key]) lines.push(SECTION_COMMENTS[key]);
  lines.push(`  ${key}:${value};`);
}

lines.push('}', '');

const css = lines.join('\n');
writeFileSync('src/design-system/tokens.css', css, 'utf8');
console.log(`[generate-tokens-css] ${Object.keys(boTokens).length} tokens → src/design-system/tokens.css`);

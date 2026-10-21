# BLUE OCEAN Service Studio — V1.15.1 Build Pipeline Recovery

## Objetivo

Hotfix técnico entre V1.15.0 e V1.16.0 para recuperar um pipeline de build reproduzível sem alterar o produto ou o Service Graph.

## Alterações

- versão do pacote e lock sincronizadas em `1.15.1`;
- `engines` e `packageManager` explícitos;
- `npm run doctor` diagnostica Node/npm, instalação local e disponibilidade do registry;
- `npm run lock:verify` valida consistência entre `package.json` e `package-lock.json`;
- `npm run syntax:check` permite validar sintaxe/transpilação TS mesmo em ambiente sem dependências locais completas;
- `npm run source:verify` consolida lock + sintaxe + regressão funcional;
- `npm run build` agora encerra com validação estrutural do `dist`;
- `npm run release:verify` vira o gate completo para releases;
- `preflight-linux.sh` atualizado para V1.15.1 e para os assets V1.12–V1.15;
- smoke de Global Navigation não fica preso a patch exato da V1.15.0.

## Diagnóstico do ambiente de geração

O acesso a `registry.npmjs.org` não resolve por DNS neste ambiente. Isso impede `npm ci` aqui, independentemente da integridade do lock. A verificação offline do source usa o compilador TypeScript global e os smoke tests determinísticos. Em um ambiente com rede, o gate definitivo é:

```bash
npm ci
npm run release:verify
```

## Compatibilidade

Nenhuma mudança de schema, storage, IDs, migrações ou Service Graph. A UI e as funções permanecem equivalentes à V1.15.0; esta versão corrige exclusivamente o pipeline de engenharia/release.

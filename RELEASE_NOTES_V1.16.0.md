# BLUE OCEAN Service Studio — V1.16.0

## Source Recovery & Reproducible Build

Esta versão é **de fundação técnica**. Ela não redesenha a interface e não altera o Service Graph. O objetivo é parar de tratar bundles compilados como fonte de verdade e preparar as próximas versões para serem construídas diretamente do source.

## Adicionado

- source authority formal: `src/` + arquivos de configuração;
- versão única em `package.json`, sincronizada para React e runtimes;
- `VERSION` e `public/app-version.json` gerados automaticamente;
- provenance de build em `dist/build-manifest.json`;
- hash SHA-256 do source e do `package-lock.json` no manifest;
- `npm run source:authority`;
- `npm run foundation:smoke`;
- CI de build reproduzível;
- E2E Playwright para Home, Whiteboard e Wizard em desktop/tablet/mobile;
- upload automático de screenshots no CI;
- documentação `SOURCE_AUTHORITY.md`.

## Melhorado

- pipeline `npm run build` agora: prepara assets → TypeScript → Vite → provenance → validação do dist;
- `npm run release:verify` passa a provar source, contratos e build;
- launcher e preflight Linux usam a versão do package, não string fixa;
- preflight descobre automaticamente os bundles hashados do Vite;
- App e Whiteboard usam a mesma versão canônica;
- runtimes de shell/navegação/precision recebem a versão durante a geração dos assets.

## Corrigido

- versão manual espalhada por React, Whiteboard e scripts Linux;
- risco de `V1.10.2`/`V1.15.4` permanecer visível depois de uma nova release;
- preflight quebrar sempre que o hash do bundle Vite mudar;
- ausência de evidência de qual source originou um `dist`.

## Removido

- `dist/` como autoridade do projeto;
- correção manual de bundle como fluxo oficial de release;
- dependência de nome exato do bundle React no preflight.

## Dados e compatibilidade

- Schema permanece **V3**;
- IDs `rt*` preservados;
- chaves `realtalent-*` preservadas nesta versão;
- nenhuma migration de dados;
- nenhuma alteração na estrutura do Service Graph.

## Validação disponível sem rede

```bash
npm run source:verify
```

## Validação definitiva com rede

```bash
npm ci
npm run release:verify
```

## Limitação do ambiente desta entrega

O ambiente de execução usado para preparar esta release não consegue resolver `registry.npmjs.org`. Assim, o build React completo não é afirmado como executado localmente aqui. O projeto foi estruturado para que GitHub Actions, Vercel ou uma máquina Linux com internet execute o gate definitivo sem patches no bundle.

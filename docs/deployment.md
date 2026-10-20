# Build e publicação

O código-fonte fica em `src/`. Os arquivos `public/v*.js`, `public/v*.css`, `src/generated/app-version.ts` e `dist/` são gerados pelo build; não devem ser editados nem enviados manualmente.

## Configuração da Vercel

- Repositório: `CAMBRUSSIJJ/blue-ocean-service-studio`.
- Branch de produção: `main`.
- Node: **22.x**, compatível com o campo `engines` do projeto.
- Instalação: `npm ci`.
- Build: `npm run build`.
- Diretório publicado: `dist`.

Os comandos de instalação, build e diretório já estão definidos em `vercel.json`. Na integração Git da Vercel, um novo commit na `main` deve iniciar um novo deploy. Confira o hash em **Source** para verificar qual código está sendo compilado. A opção **Redeploy** de uma tentativa anterior reutiliza o commit daquela tentativa.

## Verificações antes de publicar

```sh
npm ci
npm run release:verify
npm run editor:selection:test
npm run editor:browser
npm run e2e:visual
```

`release:verify` inclui verificação do ambiente, lockfile, TypeScript, contratos de compatibilidade, build de produção e integridade do `dist`. Os testes de navegador requerem Python com Playwright e Chromium. Para usar o navegador instalado no sistema, defina `CHROMIUM_PATH` se ele não estiver no `PATH`.

O workflow `.github/workflows/quality.yml` executa as verificações e os testes comportamentais da Jornada, além dos testes dos editores e das capturas visuais. As evidências são publicadas como artefatos do GitHub Actions.

## Correção do erro de produção

O erro original `TS6133` era uma variável `selectedStageId` não utilizada em `JourneyCanvasFree.tsx`. A correção mantém as demais variáveis recebidas de `studio`. Apagar a linha inteira também remove `graph`, `journey`, `orderedStages` e outros valores necessários, causando diversos erros `TS2304` em cascata.

O commit `5ee161c` restaura essas declarações e remove somente a variável sem uso. As melhorias de Whiteboard/Blueprint ficam em um commit separado, para facilitar revisão e recuperação.

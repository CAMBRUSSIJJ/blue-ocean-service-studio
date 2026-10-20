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

## Deploy bloqueado antes do build

Quando o status é **Blocked** e não existem logs de compilação, abra **Deployment Checks** para consultar o motivo. Isso é diferente de um erro do TypeScript durante o build.

Se a mensagem informar que o autor Git não tem acesso ao projeto, confira a conta GitHub conectada à Vercel, as permissões do projeto e a identidade configurada no repositório. O plano Hobby pode restringir deploys de autores que não pertencem à conta autorizada. Acesso de escrita no GitHub não garante acesso ao projeto na Vercel.

Use `git config --local user.name` e `git config --local user.email` para conferir a identidade deste repositório. O e-mail deve pertencer à sua própria conta GitHub autorizada, incluindo seu endereço `noreply` quando aplicável. Ambientes na nuvem podem herdar configurações Git diferentes; confira esses dados antes de publicar. Corrigir essa configuração não exige reescrever commits anteriores.

O aviso **Node.js Version Override** indica uma diferença entre a configuração do painel e o campo `engines`. Configure **22.x** no projeto da Vercel para alinhar os dois; esse aviso, isoladamente, não identifica a causa de um deploy bloqueado.

## Verificações antes de publicar

```sh
npm ci
npm run release:verify
npm run editor:selection:test
npm run journey:layout:test
npm run journey:browser
npm run editor:browser
npm run blueprint:methodology:browser
npm run e2e:visual
```

`release:verify` inclui verificação do ambiente, lockfile, TypeScript, contratos de compatibilidade, build de produção e integridade do `dist`. Os testes de navegador requerem Python com Playwright e Chromium. Para usar o navegador instalado no sistema, defina `CHROMIUM_PATH` se ele não estiver no `PATH`.

O workflow `.github/workflows/quality.yml` executa as verificações e os testes comportamentais da Jornada, além dos testes dos editores e das capturas visuais. As evidências são publicadas como artefatos do GitHub Actions.

## Correção do erro de produção

O erro original `TS6133` era uma variável `selectedStageId` não utilizada em `JourneyCanvasFree.tsx`. A correção mantém as demais variáveis recebidas de `studio`. Apagar a linha inteira também remove `graph`, `journey`, `orderedStages` e outros valores necessários, causando diversos erros `TS2304` em cascata.

O commit `5ee161c` restaura essas declarações e remove somente a variável sem uso. As melhorias de Whiteboard/Blueprint e da [Jornada configurável](journey-editor-2.md) preservam essa correção. Esta versão é publicada no repositório existente, mantendo seu histórico.

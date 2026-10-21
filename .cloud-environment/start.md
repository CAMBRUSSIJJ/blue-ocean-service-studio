# Inicialização do Blue Ocean Service Studio na nuvem

Use o checkout existente em `/workspace/blue-ocean-service-studio`. Cada tarefa da nuvem já é isolada; crie um worktree Git apenas quando houver solicitação explícita. Preserve o código versionado, testes, manifests, lockfiles e alterações existentes durante a preparação do ambiente.

O sistema de arquivos preparado mantém Node, npm, node_modules, assets gerados e builds já concluídos. Os processos do servidor precisam ser iniciados em cada tarefa nova. Ative o Node 22 em cada sessão de comandos:

```bash
export PATH=/workspace/.cloud-tools/npm-10.9.2/bin:/workspace/.cloud-tools/node-v22.23.4-linux-x64/bin:$PATH
export npm_config_cache=/workspace/.cache/npm
export CHROMIUM_PATH=/usr/bin/chromium
cd /workspace/blue-ocean-service-studio
node --version  # v22.23.4
npm --version   # 10.9.2
```

O Node 24 padrão da imagem não corresponde ao intervalo suportado pelo projeto. Se as dependências estiverem ausentes ou o package-lock.json mudar, execute `npm ci --no-audit --no-fund`. Preserve o lockfile durante a instalação. O script de instalação restaura as versões fixadas quando necessário, verifica o checksum do arquivo do Node e mantém a verificação de TLS e dos pacotes.

Inicie `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` em uma sessão de terminal gerenciada. O comando gera os assets antes de iniciar o Vite. Conclua instalação, build e QA antes de iniciar o servidor: esses comandos removem e recriam assets públicos, podendo invalidar o cache do Vite. Se forem executados com o Vite ativo, reinicie apenas o processo desta tarefa. O cache desatualizado pode impedir o carregamento de estilos e módulos e afetar a navegação no celular, mesmo com o dist funcionando. Antes de reutilizar um servidor, confirme que pertence a esta aplicação. Preserve processos de outras tarefas e examine os logs quando houver falha.

Para verificar a prontidão, consulte `http://127.0.0.1:5173/app-version.json`, confirme o produto `BLUE OCEAN Service Studio` e a versão de package.json. Depois execute `BLUE_OCEAN_URL=http://127.0.0.1:5173 npm run entry:browser`. O runner usa Playwright Python e Chromium para testar entrada, workspace local, criação de projeto e Jornada, estrutura inicial e persistência. As evidências ficam em `artifacts/`, ignorado pelo Git. No onboarding, use endereços de loopback apenas para requisições internas; não apresente links de preview localhost ao usuário.

O fluxo padrão usa armazenamento local do navegador e a ação `Abrir workspace local sem conta`. Esse fluxo não exige backend, banco de dados, credenciais externas ou segredos de ambiente. Exporte backups para preservar uma cópia dos dados fora do contexto do navegador.

Para validar a distribuição, execute `npm run release:verify` com Node 22 e npm 10.9.2 ativos. O comando verifica ambiente, lockfile, TypeScript, contratos de código, QA, build e integridade do dist. Para comportamento da Jornada, use `npm run editor:selection:test`, `npm run journey:a2:test`, `npm run journey:h1709:move:test`, `npm run journey:h1709:test`, `npm run journey:h1709:p3:test` e `npm run journey:layout:test`. Depois do build, `npm run entry:browser` sem BLUE_OCEAN_URL testa o dist com um servidor temporário. `python3 scripts/h1710-journey-template-whiteboard-browser.py` cobre modelos, exclusão, persistência e Whiteboard, e também aceita BLUE_OCEAN_URL.

Outras suítes de editores e validação visual estão documentadas em docs/deployment.md e docs/testes.md. AXE_PATH habilita checks adicionais de acessibilidade quando aponta para uma cópia confiável de axe.min.js. Registre essas auditorias como executadas apenas quando estiverem habilitadas.

Após preparar o ambiente, confira `git status --short --untracked-files=all`. Resultados gerados podem aparecer em caminhos ignorados; o setup deve preservar os arquivos versionados. Um aviso isolado de DNS no doctor não comprova indisponibilidade do registro: o npm funciona pelo proxy configurado. Preserve as configurações de proxy, autenticação e certificados da plataforma.

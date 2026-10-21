# Guia de desenvolvimento

## Ferramentas

Use **Node.js 22** e **npm 10 ou superior**. O projeto declara npm 10.9.2 em
`packageManager`, e essa foi a versão usada para validar o ambiente da nuvem.
Se você usa nvm, execute `nvm install` e `nvm use` na raiz do repositório.

```bash
npm ci
npm run dev
```

O comando de desenvolvimento prepara os assets do runtime e inicia o Vite.
Abra o endereço informado no terminal e escolha **Abrir workspace local sem conta**.
Não é necessário configurar variáveis de ambiente para esse fluxo.

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `src/domain/` | Schema, migrações, integridade e operações do grafo. |
| `src/services/` | Regras e relatórios de serviço, Jornada e Blueprint. |
| `src/state/` | Controller da aplicação e histórico de alterações. |
| `src/views/` | Telas e superfícies dos editores. |
| `src/components/`, `src/design-system/` | Componentes, ícones e estilos compartilhados. |
| `src/runtime/` | Integrações e recursos do runtime dos editores. |
| `src/repositories/` | Persistência e importação/exportação. |
| `scripts/` | Preparo, build, contratos e testes. |
| `qa/` | Contratos de UX e simulador de Whiteboard. |

Leia a [arquitetura](arquitetura.md) antes de mudar como os editores compartilham dados.

## Build e servidor de desenvolvimento

```bash
npm run release:verify
npm run preview
```

O build prepara `public/v*.js`, `public/v*.css`, o módulo de versão e `dist/`.
Esses arquivos são gerados: corrija o código-fonte, depois gere novamente.

Finalize instalação, QA e build antes de iniciar o Vite. A preparação dos assets
remove e recria arquivos; se ela ocorrer com o servidor ativo, o cache de arquivos
públicos do Vite pode ficar desatualizado. Reinicie o servidor após essa operação
se estilos ou módulos de runtime deixarem de carregar.

## Persistência e dados de teste

O fluxo local salva no navegador. Projetos, preferências e contas locais não são
um serviço de sincronização entre dispositivos. Use projetos fictícios nos testes
e exporte backups antes de limpar os dados do navegador.

## Ambiente da nuvem

O checkout gerenciado usa `/workspace/blue-ocean-service-studio`. A
[configuração versionada](../.cloud-environment/README.md) inclui instalação,
ativação do toolchain e instruções de início. Cada tarefa já é isolada; use o
checkout existente e crie worktrees apenas quando isso for solicitado.

## Antes de enviar uma mudança

Execute os [testes pertinentes](testes.md), confira `git diff --check` e
verifique se o commit contém apenas arquivos da mudança. Consulte também
[CONTRIBUTING.md](../CONTRIBUTING.md).

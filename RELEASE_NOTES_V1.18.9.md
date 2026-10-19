# BLUE OCEAN Service Studio — V1.18.9
## Creation Architecture Reset

### Objetivo
Corrigir a arquitetura de criação do produto antes de adicionar novas ferramentas. A V1.18.9 remove o starter invisível que fazia um workspace novo nascer com Serviço/Jornada/Etapas e separa definitivamente Whiteboard livre, Journey e Blueprint.

O critério central desta release é simples:

```text
Instalação limpa
→ Home vazia
→ Criar Serviço
→ Criar Quadro em branco
→ canvas com 0 objetos e 0 conexões
```

Nenhuma etapa, Persona, Journey ou Blueprint pode ser criada sem ação explícita do usuário.

### Corrigido — P0
- Dashboard volta a receber seu CSS na ordem correta; os imports de Dashboard/Creation Reset ficam antes das diretivas Tailwind.
- workspace novo nasce sem Serviço do usuário, Journey, Stage, Touchpoint, Problema, Oportunidade, Tarefa ou Whiteboard.
- removido o seed de produção `Serviço principal / Jornada principal / Descoberta / Primeiro Contato / Pagamento`.
- starter legado intocado é reconhecido e convertido com segurança para workspace vazio; projetos realmente editados não são apagados.
- `Blueprint em branco` agora é semanticamente branco: não recebe `journeyId`, não materializa stages e abre em layout livre.
- `Blueprint a partir de Jornada` virou caminho explicitamente distinto e exige `journeyId` válido.
- Whiteboards `viewKind=free` nunca entram na biblioteca de Blueprints.
- abrir/normalizar Journey não inventa mais uma `Persona principal` quando não existe Persona real.
- Guided Builder deixa de criar Persona/Journey como efeito colateral de calcular progresso ou abrir ajuda.

### Adicionado
- fluxo real **Criar Serviço**.
- estado inicial da Home: **Crie seu primeiro serviço**.
- três caminhos após criar um Serviço:
  1. Quadro em branco;
  2. Construção guiada;
  3. Template.
- módulo **Whiteboards** de primeira classe na sidebar.
- biblioteca própria de Whiteboards livres.
- criação `Novo quadro → Começar em branco`, com `items={}` e `edges={}`.
- ação de demo separada: **Explorar serviço de exemplo**.
- gate `creation-reset:smoke` dedicado ao ciclo de criação.

### Service Graph
`Service` continua sendo o objeto-raiz, mas o workspace não finge mais que existe um Serviço antes de o usuário criá-lo.

A criação explícita de Serviço gera somente:
- `service`;
- coleções canônicas vazias;
- zero Journey;
- zero Stage;
- zero Whiteboard;
- zero Blueprint.

### Whiteboard
Whiteboard passa a ser uma superfície própria:

```text
Whiteboard
├── free
├── journey
└── blueprint
```

`free` é um canvas livre e não é mais tratado como Blueprint por exclusão.

### Guided Service Builder
A fundação da V1.18.8 foi preservada, mas reposicionada corretamente:
- guidance começa depois da criação explícita do Serviço;
- progresso pode ser lido sem criar objetos escondidos;
- a etapa de Journey solicita criação explícita de Jornada vazia;
- o usuário continua podendo trabalhar em modo guiado, essencial ou desligado.

### Preservado
Sem quebra intencional de:
- Service Graph Schema V3;
- IDs de projetos existentes;
- backups/import/export;
- IndexedDB/local persistence;
- Service Health;
- Attention Engine;
- Continue/Favorites/Pins;
- Service Architecture;
- Guidance Engine;
- Journey/Blueprints já existentes de projetos reais.

### QA
- Creation Architecture Reset: **83/83**.
- Regressão completa V1.12 → V1.18.9: **810 OK / 0 FAIL**.
- Demo smoke: **79 objetos, 0 problemas de referência, 5 etapas, 7 evidências, 7 iniciativas**.
- `tsc --noEmit --noCheck`: aprovado.
- `node --check`: Whiteboard Core, Workspace Home runtime e shell aprovados.
- package-lock verify: aprovado.
- source authority: aprovado.
- source foundation: aprovado.
- Linux preflight: aprovado.

### Limitações do ambiente de validação
O `npm ci` completo não pôde ser concluído neste ambiente. A tentativa online ficou bloqueada pela disponibilidade do registry; a tentativa offline falhou com `ENOTCACHED` para dependência ausente no cache (`zod-4.6.5.tgz`).

Por isso não são declarados como aprovados aqui:
- `npm run typecheck` dependente do `node_modules` completo;
- `npm run build` React/Vite completo.

Também foi preparado um harness de navegador para o ciclo real de criação, mas Chromium/Playwright foi impedido pelo ambiente com `ERR_BLOCKED_BY_ADMINISTRATOR` tanto em localhost quanto em `file://`. Esse E2E de navegador **não é declarado como aprovado**.

Nenhum `dist` antigo e nenhum `node_modules` parcial são incluídos nos pacotes finais.

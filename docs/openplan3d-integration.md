# OpenPlan3D dentro do Blue Ocean Service Studio

## Escopo desta primeira integração
A área **Projeto → Desenho do serviço → Salas e 3D** dispõe de dois modos:

- **Editor CAD · OpenPlan3D:** motor Svelte/Three.js compilado isoladamente e servido em `/openplan3d/editor/` **na mesma origem do Blue Ocean**. Plantas são registradas no `ServiceGraph.service.cadPlans.plans[mapId]`, com revisão, controle de alterações concorrentes e backup pelo fluxo já existente do projeto.
- **Simulação do serviço:** editor Blue Ocean 3D existente, mantendo ambientes, atividades, vínculos com mapas e simulação operacional em `service.spatialDesign`.

As plantas CAD são armazenadas por mapa de serviço e pela planta geral (`service-space`). A primeira fase **não converte automaticamente** a geometria CAD em paredes da simulação, nem a antiga simulação em CAD. Esses modelos continuam lado a lado sem sobrescrever informações.

## Licença e origem do motor
- Fonte: https://github.com/laanlabs/openPlan3D
- Commit fixado: `98f9cb467e4045c6abc5d9880ada1f03dff50c68`
- Licença: MIT © 2026 theLodgeStudio.
- Os avisos MIT e `MODEL_SOURCES.md` são preservados em `public/openplan3d/` após a compilação.
- Antes de comercializar, audite licenças de bibliotecas, modelos, texturas e componentes externos. Nem todos os arquivos de mídia têm necessariamente as mesmas permissões do código MIT.

## Correção do fallback duplicado (7/11/2026)
Se o OpenPlan3D não estiver compilado, o Vite pode responder com o `index.html` do Blue Ocean em uma rota estática inexistente. Isso provoca a interface principal **dentro do próprio editor**.

A entrada CAD agora só monta o iframe depois de confirmar o arquivo `/openplan3d/blue-ocean-source-commit.txt` com a versão fixada e usa o caminho explícito `/openplan3d/editor/index.html`. Há também uma segunda proteção para detectar a home do Blue Ocean no lugar do editor e um aviso limpo com opção de verificar novamente.

O `npm run dev` passa a executar `npm run openplan:prepare` antes de iniciar o Vite. A primeira execução pode demorar e requer acesso à internet; as seguintes usam cache se o build estiver íntegro. Se a preparação falhar, o servidor não será iniciado com um CAD inexistente.

## Instalação e execução
O Blue Ocean continua em Node.js 22. Somente o motor OpenPlan3D utiliza Node.js 24, isolado por `npx` no preparo. O comando requer internet na primeira execução e Git.

```bash
git clone --branch feat/openplan3d-native-service-spaces-20261107 https://github.com/CAMBRUSSIJJ/blue-ocean-service-studio.git
cd blue-ocean-service-studio
npm ci
npm run openplan:prepare
npm run dev
```

Abra o endereço exibido pelo Vite, acesse um projeto e selecione **Salas e 3D → Editor CAD**. Para gerar a distribuição, rode `npm run build`, que prepara automaticamente o motor antes do build oficial.

O motor não usa a API/conta hospedada do OpenPlan3D. O hook de analytics upstream é removido na compilação. Alguns catálogos de modelos e texturas de terceiros podem depender de URLs externas, cuja disponibilidade e licença devem ser verificadas. A captura iOS via Firebase e os endpoints de upload da hospedagem original **não são disponibilizados** no modo estático.

## Fluxo de dados e segurança
1. O iframe é servido na **mesma origem** e recebe uma sessão aleatória criada pela página do Blue Ocean.
2. A mensagem `hydrate` leva a planta salva no ServiceGraph e seu identificador de serviço/mapa.
3. O editor transmite alterações após debounce; a página principal valida tipo, tamanho e isolamento do serviço, verifica a versão-base e só então grava uma transação no grafo.
4. A página principal confirma o recebimento ou solicita reidratação em caso de conflito.
5. As plantas entram nos backups do Blue Ocean por serem parte do ServiceGraph. O editor upstream também pode gravar dados no armazenamento local do navegador; isso não deve ser confundido com sincronização remota.

Um iframe de mesma origem **não é um isolamento de segurança contra código malicioso**: o upstream e suas dependências devem ser auditados e revisados a cada atualização. Não altere o commit fixado sem verificar o código.

## Limites desta versão / verificações necessárias
- A compilação isolada do SvelteKit estático e a renderização WebGL precisam de validação em Chromium e Firefox após o download das dependências.
- Testar abertura com mapa geral e com jornadas, edição de paredes, móveis, portas, save/reload, exportação JSON, troca de projetos e backup/restauração.
- Testar modo de tela cheia, CSS em 1280×720 e celular, sem barras/sobreposições.
- Testar o comportamento com armazenamento cheio e alterações concorrentes em duas abas.
- A integração com atividades, rotas e simulação será realizada por um adaptador geométrico, após a estabilização do CAD.
- Não publicar em production antes de validar o build, a UI e a segurança do iframe.

## Reversão
A integração é isolada em uma branch/PR. Basta não fazer merge para manter a versão de produção inalterada. Depois de incorporada, pode-se voltar temporariamente ao modo **Simulação do serviço**, que mantém sua implementação e dados anteriores.

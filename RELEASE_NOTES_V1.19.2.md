# BLUE OCEAN Service Studio — V1.19.2
## Visual Service Builder

A V1.19.2 corrige o principal problema observado na gravação de uso da V1.19.1: o usuário podia abrir um Whiteboard novo, mas o Assistente ainda lia estrutura antiga do serviço, mostrava progresso herdado e criava grande parte dos dados sem fazer o serviço nascer visualmente no canvas.

## Nova BuilderSession
Cada Whiteboard guiado passa a ter uma sessão de construção própria, persistida no metadata do quadro.

Ao iniciar o Assistente o usuário escolhe explicitamente:
- **Criar do zero**;
- **Mapear o que já existe**;
- **Melhorar o serviço**.

Em **Criar do zero**, o progresso começa em 0% e somente entidades explicitamente criadas/associadas àquela BuilderSession entram no progresso e no fluxo visual. Objetos antigos do Service Graph deixam de contaminar a nova construção.

## O serviço nasce no Whiteboard
O Assistente passa a materializar visualmente o trabalho enquanto o usuário responde:
- Serviço;
- Resultado esperado;
- Início e fim do serviço;
- Persona;
- Etapas;
- Touchpoints;
- Emoções;
- Frontstage (Ação visível);
- Backstage (Bastidores);
- Processos;
- Sistemas;
- Evidências;
- Problemas;
- Métricas;
- Melhorias/Oportunidades.

As etapas são organizadas horizontalmente e as camadas de experiência/operação são distribuídas em lanes. A sequência entre etapas e o fluxo Persona → primeira etapa recebem conexões visuais explícitas.

## Progresso corrigido
A UI passa a diferenciar melhor:
- progresso da BuilderSession (`Construção X%`);
- Whiteboard realmente vazio (`Quadro em branco`);
- Service Readiness/Health existente.

Um quadro novo em modo `create_new` não começa mais em 50%/55% por causa de conteúdo antigo do serviço.

## Guided start corrigido
A ação de Construção Guiada no Dashboard cria um **novo Whiteboard vazio** antes de iniciar o Assistente, em vez de reaproveitar silenciosamente o primeiro quadro livre existente.

## Proteções preservadas
- abrir o Assistente não cria conteúdo automaticamente;
- Persona, Jornada e Etapas continuam exigindo confirmação explícita;
- Service Graph continua sendo a fonte canônica;
- Whiteboard livre continua separado de Journey e Blueprint;
- V1.19.1 Core Reliability permanece preservada.

## Sim Kit 2.2
A Fase 7 foi atualizada para validar:
- seletor de intenção da BuilderSession;
- `Criar do zero` em 0%;
- cards visuais de Serviço/limites;
- Persona e Stage na mesma sessão;
- sequência visual entre etapas;
- objetos opcionais de evidência/problema/métrica/melhoria;
- persistência da sessão.

## QA executado
- `npm run qa`: **975 OK / 0 FAIL**;
- Visual Service Builder: **72/72**;
- Whiteboard Core Reliability: **42/42**;
- Service Builder Assistant: **51/51**;
- Creation Architecture Reset: **83/83**;
- Guided Service Builder: **117/117**;
- Sim Kit static contracts: **16/16**;
- `tsc --noEmit --noCheck`: **OK**;
- package-lock verify: **OK**;
- source authority: **OK**;
- source foundation: **OK**;
- Linux preflight: **OK**.

## Não declarado como aprovado neste ambiente
A instalação npm não concluiu dentro do limite disponível. Portanto esta release **não declara** como PASS o build React/Vite completo nem a execução dinâmica do Sim Kit 2.2 com `jsdom/fake-indexeddb/esbuild`.

## Próximas lacunas relevantes
- navegador real/Playwright para validar visual, drag, overflow e screenshots;
- visualização progressiva mais conversacional do Stage Builder;
- plano infinito para coordenadas negativas;
- relações semânticas entre edges;
- asset store dedicado para imagens;
- compare/merge profissional para conflito entre abas.

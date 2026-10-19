# SOURCE BASELINE — V1.19.2 Visual Service Builder

## Base
V1.19.1 — Whiteboard Core Reliability + Service Builder Assistant + Sim Kit 2.1.

## Objetivo
Fazer o Assistente construir o serviço **visualmente dentro do Whiteboard**, sem misturar objetos antigos quando o usuário inicia uma nova construção.

## Invariantes preservados
- workspace limpo continua sem conteúdo fictício;
- Serviço continua sendo criado explicitamente;
- Whiteboard em branco continua em branco;
- abrir Assistente não cria entidades escondidas;
- Service Graph continua canônico;
- `free`, `journey` e `blueprint` continuam semanticamente separados;
- correções de foco, drag, atalhos, placement, acessibilidade, conflito e navegação da V1.19.1 são preservadas.

## BuilderSession
Estado por Whiteboard com:
- `id`;
- `intent` (`create_new`, `map_existing`, `improve_existing`);
- `journeyId`;
- blocos concluídos de Serviço/Objetivo;
- IDs das entidades criadas/associadas por tipo;
- IDs dos itens visuais gerenciados;
- flag de auto-layout visual.

## Escopo de criação
### create_new
- não importa automaticamente Journey/Stage/Persona antigos;
- progresso usa somente entidades da sessão;
- inicia em 0%;
- criação visual acontece somente após confirmação do usuário.

### map_existing / improve_existing
- importam explicitamente o escopo da Journey ativa;
- permitem trabalhar sobre estrutura existente sem fingir que é uma criação nova.

## Visual Builder
O layout automático da sessão cria/organiza:
- contexto do Serviço no topo;
- Persona;
- Stage horizontal;
- lanes de Touchpoint, Emoção, Frontstage, Backstage, Processo e Sistema;
- lanes de Evidência, Problema, Métrica e Melhoria;
- edges de sequência entre stages;
- edge de Persona para primeira etapa.

Somente itens marcados como pertencentes à BuilderSession são reorganizados; objetos livres externos não são reposicionados.

## Semântica de progresso
- Whiteboard vazio: `Quadro em branco`;
- BuilderSession ativa: `Construção X%`;
- demais contextos: Readiness legado.

O progresso de construção não é tratado como Service Health.

## Dashboard
Construção guiada cria um novo Whiteboard vazio e só então inicia o Service Builder Assistant.

## QA
- regressão completa `npm run qa`: 975 OK / 0 FAIL;
- Visual Service Builder: 72/72;
- Sim Kit static contracts: 16/16;
- preflight, lock, source authority e source foundation aprovados.

## Limitações
- execução dinâmica do Sim Kit depende de dependências npm externas não disponíveis neste ambiente;
- full production build não foi declarado como PASS;
- coordenadas negativas não fazem parte desta release;
- `relationType` de edges ainda não foi introduzido;
- IA generativa não estrutura automaticamente o serviço.

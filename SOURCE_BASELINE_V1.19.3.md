# SOURCE BASELINE — V1.19.3 Whiteboard Interaction & Structure UX

## Base
V1.19.2 — Visual Service Builder + V1.19.1 Core Reliability + Sim Kit 2.2.

## Objetivo
Resolver os quatro atritos observados no uso real do Whiteboard: navegação/zoom, gestão de quadros, renomeação confiável e criação/reutilização intuitiva de entidades estruturadas.

## Invariantes preservados
- workspace limpo continua vazio;
- Whiteboard livre continua separado de Journey/Blueprint;
- BuilderSession `create_new` continua isolada;
- Service Graph continua sendo a fonte canônica;
- Assistant não cria entidades escondidas;
- foco/cursor, placement, atalhos, conflito e canvas autoexpansível da V1.19.1 permanecem;
- Visual Service Builder não reorganiza objetos livres externos à sessão.

## Interaction UX
### Zoom
- faixa 0.10–4.00;
- slider +/−/100%;
- Fit to Content;
- Fit to Selection;
- zoom wheel ancorado ao cursor.

### Whiteboard lifecycle
Runtime expõe:
- `renameBoard(id,name)`;
- `duplicateBoard(id)`;
- `deleteBoard(id)`.

A biblioteca usa menu contextual por quadro.

### Rename
- objeto livre: atualiza instância visual;
- Smart Object: atualiza entidade canônica via `setEntityTitle`;
- edição inline com Enter/Escape/blur;
- Inspector incremental preservado.

### Delete semantics
- `Remover do quadro`: representação apenas;
- `Excluir do serviço`: entidade + impacto calculado pelo domínio.

## Entity Picker V2
Fluxo principal:
1. Criar novo ou Reutilizar existente;
2. orientação em linguagem de negócio;
3. prevenção de duplicata;
4. agrupamento por origem/contexto;
5. localização de instâncias já presentes.

Etapa e Ponto de contato recebem copy e sugestões específicas.

## Imagens
O Inspector apresenta contexto orientado a intenção:
- Onde esta imagem entra?;
- Etapa relacionada;
- Área do serviço.

## QA
- regressão completa: 1045 OK / 0 FAIL;
- V1.19.3 gate: 70/70;
- Sim Kit static contracts: 32/32;
- syntax, lock, source authority, source foundation e Linux preflight aprovados.

## Limitação ambiental
`npm ci` não concluiu por `EAI_AGAIN`; build/typecheck completo e Sim Kit dinâmico não são declarados como PASS.

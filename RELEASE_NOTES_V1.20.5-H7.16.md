# V1.20.5-H7.16 — Blue Ocean Object Language

## Base
V1.20.5-H7.15 — Ocean Workspace Home.

## Objetivo
Dar identidade proprietária aos objetos do Service Studio sem alterar novamente a arquitetura da Home. A H7.16 substitui a dependência visual de ícones genéricos por uma gramática Blue Ocean baseada em fluxo, camadas, sinais, profundidade e relações.

## Icon System
Foi criado `src/design-system/blue-ocean-objects.tsx` como autoridade visual dos objetos.

A família cobre Journey, Blueprint, Whiteboard, Persona, Necessidade, Job, Dor, Hipótese, Problema, Evidência, Métrica, Stage, Touchpoint, Customer Action, Frontstage, Backstage, Processo, Sistema, Oportunidade, Tarefa e demais objetos operacionais.

Os glyphs usam SVG próprio e uma gramática comum:
- curvas/fluxos para experiência e jornada;
- camadas para Blueprint e operação;
- halo para pessoas/personas;
- ruptura para Problema;
- sinal para Evidência;
- composição conectada para Whiteboard.

## Semantic Object Color System
Cada tipo passa a ter cor estável em toda a interface. Exemplos:
- Journey: Ocean Blue `#2563eb`;
- Blueprint: Teal `#0f8f83`;
- Whiteboard / Persona: Violet `#7657d6`;
- Problema: Coral Red `#d94b5b`;
- Evidência: Signal Cyan `#1598c9`;
- Métrica: Emerald `#14946d`;
- Sistema: Slate `#657386`.

A cor acompanha o objeto em ícone, thumbnail, Smart Object, Inspector e chips relacionados.

## Artifact Silhouettes
Journey, Blueprint e Whiteboard agora usam miniaturas próprias e reconhecíveis nos Recentes:
- Journey: sequência/fluxo de etapas;
- Blueprint: camadas horizontais;
- Whiteboard: composição de formas conectadas.

## Smart Objects
O Whiteboard passa a aplicar a linguagem H7.16 diretamente nos objetos:
- ícone proprietário;
- cor semântica por tipo;
- assinatura de forma (`halo`, `layer`, `signal`, `rupture`, `block` etc.);
- faixa lateral semântica;
- label e origem mais claras;
- Inspector usando o mesmo ícone do objeto.

Não há mudança no dado canônico ou no Service Graph: a alteração é de representação visual e interação.

## Relation Language
As relações ganham uma gramática visual explícita:
- `Sustenta` — linha contínua azul/ciano;
- `Contradiz` — linha vermelha tracejada;
- `Contextualiza` — linha violeta pontilhada;
- `Depende de` — linha slate pontilhada.

O Inspector do Whiteboard também oferece presets rápidos para aplicar esses quatro tipos sem exigir configuração manual do estilo.

## Compatibilidade
- H7.15 Ocean Workspace Home preservada.
- H7.14 Service Depth preservada.
- H7.13 Blue Ocean Identity preservada, incluindo o marcador de onda legado necessário ao contrato de regressão.
- H7.11 Whiteboard 2.0 preservado.
- nenhum schema, migration ou versionamento de dados alterado.
- `package.json.version` continua `1.20.5`.

## QA
- H7.16 Blue Ocean Object Language: 40/40 PASS.
- H7.15 Ocean Workspace Home: 30/30 PASS.
- H7.14 Service Depth & Adaptive Home: 30/30 PASS.
- H7.13 Blue Ocean Identity: 26/26 PASS.
- H7.11 Whiteboard 2.0: 40/40 PASS.
- `npm run qa`: 1898 OK / 0 FAIL.
- `npm run syntax:check`: PASS.
- `npm run lock:verify`: PASS.
- `npm run source:authority`: PASS.
- `npm run foundation:smoke`: 12/12 PASS.
- `./preflight-linux.sh`: PASS.

## Limitação de ambiente
`npm ci` não concluiu dentro do limite deste ambiente e deixou uma instalação parcial, que foi removida antes do empacotamento. Por isso `npm run typecheck` e `npm run build` completos não são declarados como PASS nesta geração. O pacote final permanece sem `node_modules`, `dist`, `.generated` ou artefatos transitórios.

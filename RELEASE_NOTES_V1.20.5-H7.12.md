# V1.20.5-H7.12 — Brand Experience & Workspace Home 2.0

Base: **V1.20.5-H7.11-H1 — Typecheck Cleanup**.

## Objetivo

Dar uma identidade visual própria ao Dashboard/Home sem alterar a arquitetura de navegação e sem reposicionar as funções aprovadas pelo usuário.

## Mantido

- Sidebar com os mesmos grupos e destinos.
- Topbar e controles existentes.
- Ações rápidas: Nova jornada, Nova persona e Nova métrica.
- Seções principais: Recentes, Favoritos e Aprender.
- Rotas `rt-navigation` e coordenadores existentes.
- H7.11 Whiteboard 2.0 e toda a linhagem H7.1–H7.11.

## Melhorado

### Brand language
- Nova paleta semântica Blue Ocean para interação e categorias.
- Azul = Journey/interação principal.
- Violeta = contexto/Persona.
- Teal = resultado/operação.
- Âmbar = atenção/evidência de apoio.
- Sidebar recebe assinatura visual por domínio sem alterar a IA.
- Header do Dashboard recebe acabamento mais institucional e discreto.

### Quick Actions
- As três ações mantêm posição e função.
- Cada ação passa a ter eyebrow, explicação curta e identidade semântica.
- Hover/foco padronizados e responsivos.

### Recentes
- Cards deixam de parecer arquivos genéricos.
- Journey, Blueprint e Whiteboard têm thumbnails distintos.
- Cards exibem metadados reais do Service Graph:
  - etapas;
  - evidências;
  - problemas conectados;
  - objetos;
  - conexões.

### Favoritos
- Favoritos viram uma pequena estante de referência com contexto do artefato.
- Empty state orienta o usuário sem adicionar função paralela.

### Continuidade
- Nova faixa `Continue de onde parou`.
- Nova recomendação `Próximo passo` baseada no estado real do projeto.
- Regras verificam Persona, Journey, quantidade de etapas, Evidências, Blueprint e Whiteboard.
- A recomendação usa rotas/coordenadores já existentes e não cria dados automaticamente.

### Sinais do serviço
- Home mostra contagens reais de Personas, Problemas validados e Evidências.
- O bloco reforça que contexto e desenho permanecem no mesmo Service Graph.

### Aprender
- Conteúdo permanece no mesmo lugar, mas fica visualmente secundário ao trabalho corrente.
- Cards passam a usar a mesma linguagem semântica do produto.

## Arquivos principais

- `src/views/WorkspaceDashboardView.tsx`
- `src/runtime/brand-experience-h712.css`
- `src/style.css`
- `scripts/v1205h712-brand-experience-smoke.mjs`
- `preflight-linux.sh`
- `package.json`

## QA

- H7.12 Brand Experience: **25/25 PASS**.
- `npm run qa`: **1772 OK / 0 FAIL**.
- H7.11 Whiteboard 2.0: **40/40 PASS**.
- H7.0 Dashboard Polish: **10/10 PASS**.
- H7.0.1 Sidebar & Wave Polish: **14/14 PASS**.
- `npm run syntax:check`: PASS.
- `npm run lock:verify`: PASS.
- `npm run source:authority`: PASS.
- `npm run foundation:smoke`: 12/12 PASS.
- `./preflight-linux.sh`: PASS.

## Limitação do ambiente

O pacote final não contém `node_modules`. Uma tentativa de `npm ci --offline --ignore-scripts` falhou porque `zod-4.6.5.tgz` não está no cache local. Assim, `npm run typecheck` e `npm run build` completos não são declarados como PASS neste ambiente. O `syntax:check` e os smokes estruturais passaram.

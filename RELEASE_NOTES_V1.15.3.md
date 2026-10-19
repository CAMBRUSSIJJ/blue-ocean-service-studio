# BLUE OCEAN Service Studio — V1.15.3 Branding Consolidation & Visual Recovery

## Objetivo

Eliminar a convivência entre o branding BLUE OCEAN e a camada visual histórica verde/bege. Esta versão não adiciona novas ferramentas; ela consolida a identidade visual na origem dos módulos e corrige regressões de navegação observadas na auditoria de tela.

## Consolidação visual

- Design Tokens V3 passam a ser a única referência estrutural de cor, superfície, texto, borda e geometria.
- Canvas `#F7F8FA`, superfícies `#FFFFFF`, sidebar `#F3F5F8`, borda `#E3E7ED`, texto `#172033`.
- Azul `#1E63F0` passa a representar ação, foco e seleção.
- Teal permanece como acento; verde fica reservado a semântica de sucesso.
- Paleta estrutural histórica (`#04342C`, `#1D9E75`, `#0B4C40`, `#E7F5EF`, `#F1EFE8` e derivados de superfície) foi removida dos CSS de runtime.
- Shells e módulos antigos agora resolvem seus aliases por tokens BLUE OCEAN em vez de declarar uma segunda identidade.

## Sidebar e navegação

- Removida a injeção duplicada de `ENTENDER` pelo workspace de Pesquisa.
- Removidas as categorias legadas `MODELAR` e `EXECUTAR` injetadas pelo shell histórico.
- O BLUE OCEAN Shell passa a ser o único dono da taxonomia visual da sidebar.
- Normalização de estado ativo garante apenas um item com `aria-current="page"` e classes de seleção por vez.
- Mantidos os grupos: DESIGN, ENTENDER, MELHORAR, OPERAR e WORKSPACE.

## Branding visível

- Nome visível consolidado como **BLUE OCEAN Service Studio**.
- Exportações de Whiteboard, backup, Service Graph, CSV, SVG, PNG e PDF usam nomes BLUE OCEAN.
- Título do Whiteboard atualizado para `BLUE OCEAN Service Studio · V1.15.3`.
- Collaboration usa BLUE OCEAN em textos e arquivos visíveis.
- `BlueOceanRuntime` passa a ser o alias público preferencial. `RealTalentRuntime` e formatos/chaves `realtalent-*` permanecem internamente apenas para compatibilidade com projetos e backups existentes.

## Dist / publicação

O `dist` foi ressincronizado com os runtimes V1.15.3. O bundle React previamente validado foi mantido por falta de dependências locais completas, mas recebeu apenas duas substituições visuais determinísticas: marca exibida (`RealTalent` → `BLUE OCEAN`) e badge de versão (`V1.9.4` → `V1.15.3`). Nenhum contrato de dados ou handler foi alterado no bundle compilado.

## QA

- Stability V1.12: 12/12
- Design System V1.13: 10/10
- Workspace Home V1.14: 14/14
- Global Navigation V1.15: 17/17
- Precision Studio: 17/17
- Branding Consolidation: 14/14
- Demo: 79 objetos / 0 referências quebradas
- Dist verify: OK
- Paleta estrutural legada no CSS publicado: 0 ocorrências
- Branding antigo visível no runtime publicado: 0 ocorrências conhecidas

## Próximo ciclo

Após validar visualmente esta baseline, a próxima reconstrução recomendada é **V1.16.0 — Journey Workspace 3.0**.

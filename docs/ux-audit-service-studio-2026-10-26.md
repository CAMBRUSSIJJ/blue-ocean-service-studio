# Blue Ocean Service Studio — Auditoria de UX e plano de consolidação
Data: 26/10/2026 · Baselines: `main` 507c934 / PR #45 `feat/blue-ocean-editor-flexible-20261025`

## 1. Objetivo e alcance
Avaliar o fluxo completo de criação, desenho, análise, revisão e melhoria de um serviço sem reduzir a capacidade profissional do Blue Ocean. A auditoria cobre arquitetura da informação, fluxos, textos, feedback, consistência, acessibilidade, responsividade, estados vazios e integridade da edição.

**Método e limitações.** Levantamento por código-fonte, documentação, especificações e logs de CI. **Não é uma validação integral em navegador ou teste moderado com usuários.** O resultado de testes e a aprovação visual precisam ser registrados por commit antes do merge. Observações abaixo indicam o nível de comprovação: **FATO** (confirmado em código ou CI), **RISCO** (exige reprodução no navegador) e **PROPOSTA** (direção de produto).

## 2. Modelo de produto a preservar
- Um `Service Graph` canônico; Jornada, Blueprint, Matriz e Whiteboard usam referências aos mesmos registros, sem duplicar entidades.
- Um **mapa do serviço**, com *perspectivas* Jornada e Blueprint. Mudar a perspectiva não cria um segundo mapa.
- Um começo rápido: mapa vazio ou template editável, sem inventar evidências, emoções ou observações.
- Experiência progressiva para iniciantes; ferramentas completas, acessíveis sem perda de contexto, para profissionais.
- Preferências de apresentação (largura, altura, faixas, zoom, filtros) independentes dos dados de domínio.
- Dados atuais predominantemente locais ao navegador; importação, backup e trabalho remoto devem ser distinguidos na interface.

## 3. Diagnóstico priorizado

| ID | Natureza | Severidade | Evidência observada | Recomendação / critério |
| --- | --- | --- | --- | --- |
| QA-01 | FATO | P0 bloqueante | CI da PR #45 em `6683013` parou em `blueprint:canvas:test`: comparação do estado salvo não aceitava os campos normalizados novos. | Comparar metadados normalizados preservando todos os campos; executar CI completo. |
| QA-02 | FATO | P0 bloqueante | Reexecução após QA-01 encontrou teste com `420` fixo, mas a geometria usa offset `CANVAS_GRID.label=218`, resultando em `428`. | Derivar posição do grid canônico e continuar até a suíte completa passar. |
| NAV-01 | FATO + RISCO | P1 | `src/App.tsx` concentra navegação global, por projeto e rotas herdadas; `BlueprintWorkspaceView` adiciona grupos internos e muitas capacidades. | Construir inventário de caminhos reais e reduzir a duplicação visual. Cada tela deve ter contexto e retorno previsíveis. |
| NAV-02 | RISCO | P1 | Navegação por nível inicial e completo usa agrupamentos diferentes; pesquisas/capacidades aparecem em telas secundárias. | Definir uma IA canônica por tarefa; iniciantes recebem orientação, não outra arquitetura. |
| ED-01 | FATO + RISCO | P1 | A PR #45 adotou alças de cartão/faixa/etapa ocultas em repouso e expostas por hover ou foco, mais alternativas de teclado. | Testar descoberta, ponteiro, foco, toque, limites, cancelamento, desfazer/refazer e persistência sem alças permanentes. |
| ED-02 | RISCO | P1 | Um mesmo editor combina clique, duplo clique, arraste, menu de contexto e painel de propriedades. | Confirmar que selecionar, editar, redimensionar e mover não disparam ações concorrentes. |
| ED-03 | FATO | P1 | `src/runtime/journey-cad.css` continha diversos textos de 10–12 px e controles de reordenação de 26 × 29 px. | Elevar tipografia secundária e hit targets sem expandir indefinidamente o canvas. |
| DS-01 | FATO + RISCO | P1 | A branch contém dezenas de folhas de estilo de runtime e camadas de compatibilidade coexistentes com `src/design-system/`. | Inventariar regras em conflito, consolidar tokens e retirar sobrescritas apenas com teste visual comparativo. |
| DATA-01 | FATO + RISCO | P1 | README/arquitetura descrevem persistência local e backup; serviço remoto tem planejamento/fluxos em branch separada. | Exibir claramente salvo / salvando / erro / local / remoto; testar importação e recuperação. |
| ACC-01 | RISCO | P1 | Drag, zoom, menus, tabs e handles misturam SVG e HTML; o código já contém alguns caminhos por teclado. | Validar WCAG 2.2 AA, incluindo 2.5.7 e 2.5.8, foco, leitura por tecnologia assistiva, touch e movimento reduzido. |
| MOB-01 | RISCO | P1 | `journey-cad.css` troca canvas por representação móvel em até 760 px. | Testar equivalência de tarefas e recuperar o mesmo estado ao alternar desktop/móvel. |
| WB-01 | FATO + RISCO | P2 | `qa/whiteboard-sim/KNOWN_ISSUES.md` monitora coordenadas negativas, conexões sem tipo, snapshots amplos e imagens. | Reproduzir cenários no Whiteboard atual; separar limites aceitos de defeitos ativos. |
| SIM-01 | RISCO | P2 | Service CAD 3D foi trabalhado em artefato local separado; não foi validado com esta branch principal. | Auditar em pacote próprio; decidir vínculo ao Service Graph antes de integração. |

**Prioridade**: P0 impede liberação; P1 dificulta o fluxo principal; P2 é evolução controlada. Nível “risco” **não** representa bug confirmado.

## 4. Arquitetura de informação proposta

**Nível 1 — Plataforma:** Home, Serviços/Projetos, Configurações e dados. A navegação global não muda de lugar entre projetos.

**Nível 2 — Serviço:** Entender → Definir → Desenhar → Validar → Melhorar. São *orientações sobre o mesmo workspace*, não cinco assistentes obrigatórios. Uma ferramenta avançada pode ser aberta diretamente a qualquer momento.

**Nível 3 — Editor:** cabeçalho compacto (voltar, nome, perspectiva, estado do salvamento); lateral esquerda (Componentes / Faixas), canvas central (conteúdo), inspetor direito (detalhes opcionais); ações globais em menu curto, ferramentas de navegação próximas ao canvas.

O painel esquerdo gerencia *criação e estrutura*. O painel direito gerencia *propriedades do selecionado*. A cena central conserva prioridade visual. Jornada e Blueprint trocam linguagem e visibilidade das faixas, **não** dados.

## 5. Contratos do editor

| Operação | Entrada canônica | Resultado esperado |
| --- | --- | --- |
| Selecionar | Clique simples / teclado | Seleção clara e propriedades disponíveis, sem alterar conteúdo. |
| Editar | Duplo clique / ação Editar | Edição contextual previsível; Escape cancela sem mutação. |
| Adicionar cartão | `+` da célula / biblioteca | Escolhe tipo compatível, mantém etapa e faixa; cancelar não cria conteúdo. |
| Redimensionar cartão | Hover no canto / foco, setas, Home | Prévia sem deslocamentos irreversíveis; dimensões salvas com o cartão. |
| Redimensionar faixa | Borda inferior / teclado / inspetor | Altura automática preserva conteúdo; valor manual é mínimo e não corta cartões. |
| Redimensionar etapa | Hover na borda / teclado | Altera só a largura da etapa; não apaga cartões. |
| Emoções | Curva por etapa e Persona | Valores não registrados distintos de “neutro”; conexões antigas preservadas. |
| Mover cartão | Arraste e alternativa por clique | Etapa e faixa válidas, vínculo canônico e identidade mantidos; inválidos geram erro útil. |
| Excluir | Menu contextual + confirmação | Informa escopo (cartão, vínculos, mapa) e permite recuperar via histórico quando aplicável. |
| Navegar | Mão, zoom, Início, Ajustar | Não mistura pan com mover cartão; zero estado canônico alterado pela navegação. |
| Salvar | Ação local/host | Sucesso ou falha visíveis; reabrir preserva dados e apresentação. |

Para touch, controles não podem depender de hover. Devem existir meios acessíveis por menus, seletores e campos; alvo mínimo WCAG 2.2 AA: 24 × 24 CSS px, sujeito às exceções normativas. Padrão desejado em controles compactos do Blue Ocean: pelo menos 32 × 32 px; preferir 40–44 px quando houver espaço.

## 6. Tipografia e linguagem visual
- Usar Inter/system como família de interface; evitar mais de uma hierarquia concorrente em cada painel.
- Texto funcional do editor: ~13–14 px; descrições e metadados: no mínimo 12 px como diretriz de produto, sem alegar que isso sozinho comprova WCAG.
- Contraste, foco visível e responsividade validados sobre cores e fundos reais; símbolos e cores não podem carregar sozinhos informação.
- Ícones funcionais da mesma família SVG, com nomes acessíveis, rótulos quando não forem familiares e ajuda contextual.
- Evitar controles de redimensionamento permanentes. Usar hover/foco/alternativa touch e área de ação transparente, sem “pílulas” decorativas.
- Evitar contadores de hipóteses e indicadores de diagnóstico sobrepostos ao mapa: apresentar em revisão/inspetor sob demanda.
- Organizar componentes em grupos semanticamente identificáveis; gerenciar Faixas em seção própria.
- Remover CSS legado somente após capturas comparativas e regressão em 390, 834 e 1440 px.

## 7. Roteiro de teste de ponta a ponta
Em um serviço fictício de salão, sem dados reais de clientes:
1. Criar o serviço e um projeto; abrir o mapa vazio e conferir ausência de evidências inventadas.
2. Cadastrar uma Persona com necessidades e vínculo à jornada.
3. Criar três etapas: descobrir, agendar e realizar atendimento.
4. Adicionar ação, canal, evidência e uma atividade operacional; cancelar um cartão novo.
5. Alterar faixa, ordem e largura da etapa; redimensionar cartão com mouse e restaurar por teclado.
6. Registrar uma emoção; trocar Persona e confirmar isolamento da curva.
7. Trocar Jornada/Blueprint/Matriz, manter IDs, relações, ordem e dados.
8. Conectar frontstage, backstage e apoio; testar handoff e rejeição de ligação inválida.
9. Duplicar, mover, excluir, desfazer/refazer e reabrir mapa após recarga.
10. Exportar, importar e validar integridade; repetir tarefas críticas em 834 e 390 px com touch e teclado.
11. Inspecionar leitor de tela, foco, contraste, movimento reduzido e ações acessíveis sem arraste.
12. Só depois validar pesquisas, melhorias e resultados usando as mesmas entidades.

Registrar: conclusão de tarefa, passos, erros, tempo, perda de dados, foco, sobreposição de UI, responsividade e captura da evidência. Testes automatizados **não** equivalem a entrevistas com profissionais.

## 8. Entregas e gates
**Gate 0 — PR #45:** CI integral e `release:verify`; browser QA dos editores; diferenças visuais; persistência e histórico; documentação atualizada. Sem publicar `main` com CI vermelho.

**Gate 1 — Navegação:** inventário de rotas, breadcrumbs/retorno, seleção de projeto e fase, superfícies vazias, estados de leitura e permissão; nenhum caminho para função central depende de conhecimento escondido.

**Gate 2 — Design system:** tokens para espaços, tipografia, cores e componentes; reduzir estilos concorrentes por subsistema, com snapshots de antes/depois.

**Gate 3 — Pesquisa, Personas, Whiteboard e operação:** cenários reais por área usando mesmo grafo, sem duplicação semântica.

**Gate 4 — Service CAD 3D:** auditoria do artefato executável e dos controles; conexão de cenários com o Service Graph somente após requisitos e comportamento definidos.

## 9. Referências metodológicas
- Nielsen Norman Group — 10 heurísticas de usabilidade: https://www.nngroup.com/articles/ten-usability-heuristics/
- W3C — WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Documentação do Blue Ocean: `docs/arquitetura.md`, `docs/blueprint-canvas.md`, `docs/testes.md`, `docs/editor-simplicity.md`, `docs/whiteboard-blueprint-ux.md`.

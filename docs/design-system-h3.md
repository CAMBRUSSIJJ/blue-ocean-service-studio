# Blue Ocean Service Studio — H3 · Regra única de interface

## Escopo e fonte de verdade
Todo módulo novo deve utilizar `src/design-system/tokens.css`, `src/design-system/components.css` e `src/design-system/unified-ui-h3.css`.
A camada de compatibilidade `legacy-compat.css` é preservada para não quebrar funcionalidades antigas.
O editor isolado de Blueprint/Jornada carrega o **mesmo** `unified-ui-h3.css` a partir de `/blue-ocean-ui-h3.css`.
Não criar uma nova paleta nem sobrescrever tokens globais dentro de uma tela.

## Tipografia
- Família principal: Geist, seguida dos fallbacks definidos em `--bo-font-sans`.
- Texto normal: 14 px, linhas entre 1,45 e 1,6.
- Rótulos e botões: 13 px; auxiliares: 12 px; títulos de área: 20–28 px.
- Cores semânticas: texto principal `--bo-color-text`, secundário `--bo-color-text-secondary`, explicação `--bo-color-text-muted`.
- Nunca depender apenas da cor para apresentar erro, status, seleção ou informação obrigatória.

## Componentes
| Componente | Regra |
| --- | --- |
| Botão primário | `.bo-button.bo-button--primary`, azul semântico, altura padrão de 40 px no contexto de formulário |
| Botão secundário | `.bo-button--secondary`, superfície clara e borda semântica |
| Botão discreto | `.bo-button--ghost`, usado para voltar, cancelar ou ações não destrutivas |
| Botão destrutivo | `.bo-button--danger`, vermelho apenas quando a ação destrói registros |
| Botão só com ícone | `.bo-icon-button` com `aria-label`, não usar texto 10 px como substituto |
| Texto de campo | `.bo-field` e `.bo-input/.bo-select/.bo-textarea`, rótulo explícito e área de foco visível |
| Pop-up / diálogo | `.bo-dialog` com cabeçalho, conteúdo e rodapé; modal nativo `<dialog>` quando apropriado |
| Estado de carregamento | `aria-busy`, texto ou indicador de status acessível e somente ações dependentes desabilitadas |

## Dimensões e espaçamento
- Controle padrão em formulário: `--bo-control-h-lg` (40 px).
- Controle compacto: `--bo-control-h-md` (36 px).
- Botão ícone preserva proporção 1:1.
- Raios: `--bo-radius-md` (8 px), painéis `--bo-radius-lg` (12 px), diálogos `--bo-radius-xl` (16 px).
- Espaçamento: múltiplos de `--bo-space-1` (4 px). Evitar margens arbitrárias.

## Estados
- Normal, hover, foco, pressionado, selecionado, desabilitado, carregando, erro e sucesso devem ser distinguíveis.
- Foco de teclado sempre visível, sem alterar dados ou navegação de forma inesperada.
- Pop-ups têm botão de fechar e operação reversível por Cancelar/Escape quando possível.
- Destruições e mudanças semânticas pedem confirmação **na UI**, nunca `window.confirm`.
- Em `prefers-reduced-motion` as animações de feedback deixam de ser essenciais.

## Limites da padronização
Não normalizar indiscriminadamente cartões arrastáveis, miniaturas de projeto, faixas,
barras de emoções, controle de zoom e o conteúdo SVG de Journey/Blueprint. Esses objetos
têm papéis de manipulação visual próprios; somente seus controles externos seguem H3.
A padronização não muda o Service Graph, não migra projetos e não altera dados armazenados.

## Integração
- App React: `src/style.css` importa `unified-ui-h3.css` depois dos estilos legados.
- Iframe Blueprint: `src/runtime/journey-matrix.html` carrega `/blue-ocean-ui-h3.css` depois de `/journey-cad.css`.
- Build: `scripts/prepare-assets.mjs` publica o mesmo arquivo no `public/`.
- Teste: `npm run design:h3:test`.
- Antes de promover: build, regressões e inspeção real de Home, Projeto, Personas, Necessidades, Mapas, Whiteboard, Blueprint e diálogos em desktop e mobile.

## Critérios de aceite
- Não existem duas fontes de tokens para botões, textos e pop-ups nos contextos migrados.
- Cor, altura, raio, foco, texto e estado desabilitado equivalentes entre app React e editor isolado.
- Contraste e foco de navegação validados nas situações de uso.
- Nenhum gesto de arraste, seleção, edição, conexão, zoom ou redimensionamento é afetado.
- Novos componentes são implementados sobre o design system, não com CSS avulso.

# Salas e 3D com o layout H7.65

A base desta integração é `f88345c` (`fix/h765-layout-corrigido-20261105`), que contém a Home “Bem-vindo ao seu Workspace”, três modelos de início rápido e a sidebar nativa H7.65. O endereço de produção não foi consultado diretamente: a conexão Vercel desta sessão não concedeu acesso ao projeto.

A integração importa somente os motores CAD/3D, suas pontes de dados, schemas e controles. A Home, cabeçalho, cartões, estilos globais e dimensões da sidebar permanecem iguais à base. No celular, apenas a ordem das camadas do drawer foi corrigida: o menu precisa ficar acima do backdrop existente para receber cliques. A navegação ganha o item **Salas e 3D** em **Desenho do serviço**. O editor é carregado sob demanda.

O OpenPlan3D e a simulação mantêm dados independentes por serviço e mapa, incluídos nos backups existentes. Os vínculos entre sala e etapa não modificam a geometria nem o conteúdo da Jornada.

## Organização do CAD

O cabeçalho reúne o seletor de mapa, CAD/simulação e tela cheia. A planta recebe uma barra flutuante com seleção, paredes, texto, medição e escadas. Esses botões usam os stores e comandos originais do OpenPlan3D: também refletem as mudanças feitas por atalhos de teclado. A biblioteca completa continua disponível para salas, portas, janelas, mobiliário e importações.

O painel **Ambiente e jornada** inicia recolhido e abre sobre o editor; no celular, aparece na parte inferior. Fechar o painel preserva o rascunho e devolve o foco ao botão de abertura. O iframe e a planta permanecem montados durante essa interação. O seletor de pavimento, as vistas 2D/3D, o zoom, a grade, as réguas e os comandos de salvar/exportar continuam sendo os controles reais do motor.

Os adaptadores ficam em `src/integrations/blue-ocean-cad-controls.source` e `.css`, aplicados apenas no modo incorporado. O script de preparação verifica os pontos de integração do upstream e inclui o hash dos adaptadores no cache do build. O arquivo `blue_ocean_cad_editor.tsx` forneceu a referência de organização visual; a sidebar escura e os controles simulados do arquivo não foram incorporados.

## Verificação

- `npm run typecheck`
- `npm run openplan:smoke` (13 testes)
- `npm run spaces:test` (14 testes)
- `npm run build`
- `npm run spaces:browser` (18 verificações: Home H7.65, ferramentas CAD reais, associação à Jornada, contexto sem remount, 3D, recarga, desvinculação, simulação, backup e navegação móvel)
- `python scripts/openplan3d-branding-browser.py` (4 viewports, biblioteca recolhível e botões de salvar/2D/3D dentro da tela)

A comparação local de pixels entre a Home da base e a Home integrada confirmou conteúdo central idêntico, usando o mesmo navegador, viewport e estado vazio.

`npm run release:verify` encontra uma falha já presente em H7.65: `v1205h3-workspace-ia-blueprint-migration-smoke.mjs` procura `data-sidebar-section` dentro de `App.tsx`; desde H7.64 esses atributos pertencem a `NativeAnimatedSidebarH764.tsx`. O teste isolado retorna os mesmos 67 OK / 1 FAIL na base e nesta integração. Esse bloqueio não foi contornado nem removido da suíte.

## Publicação

O PR deve ser revisado contra a linha H7.65, preservando as demais alterações dessa linha. Publicar a branch antiga do preview no lugar desta reintroduziria a Home e sidebar anteriores. Antes de promover um deployment, confirmar seu commit e a comparação visual com a primeira imagem aprovada pelo usuário.

# Salas e 3D com o layout H7.65

A base desta integração é `f88345c` (`fix/h765-layout-corrigido-20261105`), que contém a Home “Bem-vindo ao seu Workspace”, três modelos de início rápido e a sidebar nativa H7.65. O endereço de produção não foi consultado diretamente: a conexão Vercel desta sessão não concedeu acesso ao projeto.

A integração importa somente os motores CAD/3D, suas pontes de dados, schemas e controles. A Home, cabeçalho, cartões, estilos globais e dimensões da sidebar permanecem iguais à base. No celular, apenas a ordem das camadas do drawer foi corrigida: o menu precisa ficar acima do backdrop existente para receber cliques. A navegação ganha o item **Salas e 3D** em **Desenho do serviço**. O editor é carregado sob demanda.

O OpenPlan3D e a simulação mantêm dados independentes por serviço e mapa, incluídos nos backups existentes. Os vínculos entre sala e etapa não modificam a geometria nem o conteúdo da Jornada.

## Verificação

- `npm run typecheck`
- `npm run openplan:smoke` (13 testes)
- `npm run spaces:test` (14 testes)
- `npm run build`
- `npm run spaces:browser` (Home H7.65, CAD real, associação à Jornada, 3D, recarga, desvinculação, simulação, backup e navegação móvel)

A comparação local de pixels entre a Home da base e a Home integrada confirmou conteúdo central idêntico, usando o mesmo navegador, viewport e estado vazio.

`npm run release:verify` encontra uma falha já presente em H7.65: `v1205h3-workspace-ia-blueprint-migration-smoke.mjs` procura `data-sidebar-section` dentro de `App.tsx`; desde H7.64 esses atributos pertencem a `NativeAnimatedSidebarH764.tsx`. O teste isolado retorna os mesmos 67 OK / 1 FAIL na base e nesta integração. Esse bloqueio não foi contornado nem removido da suíte.

## Publicação

O PR deve ser revisado contra a linha H7.65, preservando as demais alterações dessa linha. Publicar a branch antiga do preview no lugar desta reintroduziria a Home e sidebar anteriores. Antes de promover um deployment, confirmar seu commit e a comparação visual com a primeira imagem aprovada pelo usuário.

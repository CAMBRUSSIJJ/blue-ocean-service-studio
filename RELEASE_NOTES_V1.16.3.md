# BLUE OCEAN Service Studio V1.16.3 — Shell & Page Consistency

## Adicionado
- Header global canônico de 48 px com breadcrumbs `Workspace › seção › página`.
- Seletor contextual de serviço no topo da sidebar, preparando a arquitetura para multi-serviço sem inventar serviços inexistentes.
- Indicador único de salvamento local no header (`Salvo`, `Salvando`, `Falha ao salvar`).
- Runtime `shellConsistency` para normalizar páginas legadas e módulos ainda renderizados fora do React.
- Gate `shell:consistency:smoke` com 14 contratos.

## Melhorado
- Sidebar nativa passa a usar `MELHORAR` no lugar de `EXECUTAR` para o Plano de Ação.
- Jornadas, Blueprints, Pesquisa, Inteligência, Benefícios, Revisão e Simulação recebem o mesmo padrão de cabeçalho visual.
- Breadcrumbs e título agora compartilham a mesma hierarquia em todas as páginas principais.
- Status de salvamento do Whiteboard é tratado como estado do projeto, e badges locais redundantes são ocultados.
- Service selector se adapta à sidebar expandida, recolhida e a telas menores.
- Runtimes históricos deixam de registrar `1.10.2` como versão visível e recebem `APP_VERSION` no pipeline de assets.

## Corrigido
- Cabeçalhos internos que ainda exibiam eyebrows como `EXECUTAR`, `MODELAR`, `GERENCIAR` ou `BLUEPRINT` são normalizados/ocultados quando redundantes.
- Estado ativo da navegação é normalizado para apenas um item por vez.
- Teste V1.16.2 deixou de exigir versão exatamente `1.16.2`, permitindo releases superiores sem falso negativo.
- Redundância entre `Salvo neste navegador`, badge do Whiteboard e indicadores locais foi reduzida.

## Removido
- `EXECUTAR` como agrupador nativo do Plano de Ação.
- Eyebrows legadas redundantes nos cabeçalhos normalizados.
- Exibição paralela de badges locais quando o status global de salvamento já está disponível.

## Preservado
- Service Graph Schema V3, IDs `rt*`, chaves legadas, backups, migrations e persistência.
- V1.16.1 Inspector/Readiness/toolbar contextual.
- V1.16.2 Design System v4 e limite de dívida visual do Whiteboard.

## Pendente
- Multi-serviço real ainda não existe; o seletor mostra somente o serviço atual e prepara o shell para a futura camada de workspace/portfolio.
- O build React/Vite completo não foi executado neste ambiente porque `npm ci` não conseguiu acessar o registry. `npm run source:verify` e todos os smoke tests passaram.
- Alguns módulos antigos ainda renderizam DOM próprio; a convergência completa para um único App Shell React depende de F0.4.

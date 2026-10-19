# Source Baseline V1.20.5-H6

Base: V1.20.5-H5.

Hotfix de ownership e navegação:
- React é dono das views core.
- Workspace runtime não cria superfície visual quando o shell React nativo existe.
- `rt-navigation` é o barramento canônico para mudança de core view.
- superfícies legacy em `document.body` são ocultadas ao retornar para core views.
- sidebar React nativa não recebe agrupamentos/injeções do shell legado.

Versão funcional permanece 1.20.5; H6 é rótulo de hotfix do pacote.

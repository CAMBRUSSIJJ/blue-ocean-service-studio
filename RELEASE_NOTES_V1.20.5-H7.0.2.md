# V1.20.5-H7.0.2 — Preflight Branding Hotfix

## Corrigido
- A onda frontal da sidebar deixou de usar o verde estrutural legado equivalente a `#1D9E75` após minificação.
- A onda usa agora azul + ciano, preservando a animação H7.0.1.
- O preflight Linux não despeja mais uma linha CSS minificada inteira ao encontrar cor proibida; reporta arquivo e token.

## Preservado
- Dashboard H7.0.
- Sidebar agrupada e animação de onda H7.0.1.
- Routing & Layer Recovery H6/H6.1.
- `prefers-reduced-motion`.

## QA executado neste ambiente
- H7.0.2 smoke: 6/6 PASS.
- `preflight-linux.sh`: PASS sem `dist/` gerado.
- `npm run qa`: PASS.

## Limitação
- O gate de branding sobre `dist/` precisa ser repetido após `npm run build` no ambiente com dependências instaladas. A causa que o acionava foi removida na fonte.

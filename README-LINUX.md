# BLUE OCEAN Service Studio — V1.19.5

Release: **Service Project Foundation**.

## Iniciar

```bash
chmod +x START.sh
./START.sh
```

## Gates

```bash
npm run ux-truth:smoke
npm run qa
./preflight-linux.sh
```

Para prova visual real, com a aplicação em execução e Playwright/Chromium instalados:

```bash
npm run ux-truth:browser
```

Esse gate não transforma ambiente indisponível em PASS: ele retorna código 2 quando o navegador não pode ser executado.

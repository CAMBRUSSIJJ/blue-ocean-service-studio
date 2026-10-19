# QA — V1.6.0 Whiteboard Core 1.0

## Release gate estático
`./qa-core.sh`

Resultado do pacote de desenvolvimento:
- preflight Linux: OK;
- `node --check dist/v160-whiteboard.js`: OK;
- assets V1.6.0 referenciados pelo `dist/index.html`: OK;
- 11/11 contratos estáticos encontrados.

Contratos estáticos verificados:
1. Core API;
2. auditoria integrada;
3. reparo seguro;
4. Entity × Instance;
5. Connections Engine;
6. Containers;
7. Structured Views;
8. Persistence;
9. Import / Export;
10. Performance;
11. Core CSS.

## Auditoria runtime incorporada
O painel `Core 1.0` verifica no projeto do usuário:
- raiz do Service Graph;
- quadro ativo;
- instanceIds;
- referências de Smart Objects;
- endpoints de conexões;
- hierarquia de containers;
- Visualizations Engine;
- Journey Primitives;
- Blueprint estruturado;
- revisão Graph/meta;
- estado da cópia durável;
- Import / Export;
- Performance Engine;
- erros runtime da sessão.

## Limitação do ambiente de QA
O Chromium headless disponível neste ambiente não concluiu sequer um screenshot de uma página HTML mínima e ficou bloqueado por limitações do runtime gráfico/DBus. Por isso, não é apresentado como E2E de navegador aprovado. O launcher HTTP, a sintaxe JavaScript e os contratos estáticos foram validados separadamente.

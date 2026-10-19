# Source Baseline V1.20.4

Baseline: `Blue-Ocean-Service-Studio-V1.20.3-Source.zip`.

## Mudanças canônicas
- novo `src/services/service-readiness.ts`;
- Service Home com painel de Readiness, três domínios, gaps e próxima ação;
- composição assistida condicionada ao `Ready to Design`;
- CSS V1.20.4 no `service-project-home.css`;
- smoke e Browser Truth V1.20.4;
- preflight Linux atualizado;
- versão sincronizada para 1.20.4.

## Arquitetura preservada
- Service Graph é a fonte única de verdade;
- Readiness é derivado e não persistido;
- Service Frame continua armazenando somente metadados de view (`serviceStageId` + `serviceLayer`).

# Apresentação histórica da V1.19.6

Este texto foi preservado do README anterior. Para o fluxo atual, consulte o [README principal](../../../README.md).

# BLUE OCEAN Service Studio — V1.19.6

## Service Project Foundation

Esta release inicia a transição do BLUE OCEAN de uma experiência que começava pelo canvas para uma arquitetura **Discovery-first**.

### Fluxo principal

1. Criar o projeto do serviço.
2. Entender Persona, necessidade, problema/hipótese e evidência.
3. Definir resultado e escopo (evolução seguinte).
4. Montar o serviço somente quando houver contexto mínimo.
5. Validar e melhorar sobre os mesmos dados canônicos.

### Mudanças da V1.19.6

- Service Project canônico persistido em `service.project`.
- Fases Discovery → Definition → Design → Validation → Improvement.
- Migração automática de projetos antigos sem duplicar entidades do Service Graph.
- Home usa relatório derivado do Service Project para progresso de fase.

- Service Project Home no Dashboard com fases Entender → Definir → Desenhar → Validar → Melhorar.
- Discovery inicial com Persona, necessidade, problema/hipótese e evidência.
- Problema pode existir como hipótese antes de uma Journey.
- Whiteboard livre continua disponível, mas montagem estruturada exige contexto mínimo.
- O modal legado “Preparar o Serviço” foi removido do fluxo e redireciona para a Service Project Home.
- Copy técnica antiga do dialog de exclusão foi removida.
- QA visual passa a seguir a regra L1 Código + L2 Contrato + L3 Runtime + L4 Visual.

### QA

- `npm run qa` — regressão estática/contratual completa.
- `npm run ux-truth:smoke` — contratos específicos V1.19.5.
- `npm run ux-truth:browser` — prova real em navegador; retorna `UNAVAILABLE` se Playwright/Chromium ou servidor não estiverem disponíveis.
- `./preflight-linux.sh` — integridade do pacote Linux.

Consulte `ROADMAP_SERVICE_PROJECT_V1.19.5_A_V1.21.0.md` para a sequência do Product Architecture Reset.

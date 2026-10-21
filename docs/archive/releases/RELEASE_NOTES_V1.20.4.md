# V1.20.4 — Service Readiness

## Objetivo
Responder de forma determinística se o serviço possui contexto, definição e estrutura suficientes para avançar no desenho, sem confundir Readiness com Health ou Coverage.

## Adicionado
- `src/services/service-readiness.ts` como engine derivada e não persistida.
- Três domínios de Readiness: **Contexto**, **Definição** e **Estrutura**.
- 17 critérios mínimos, todos explicáveis e ligados a uma ação concreta.
- Gate `Ready to Design` na Service Home.
- Próxima lacuna clicável: Context Library, Definition Studio ou Service Frame.
- Resumo lateral de Readiness e estado `blocked / building / ready`.
- Browser Truth específico `v1204-browser-service-readiness.py`.
- Gate `service-readiness:smoke` com fixtures completas, incompletas e sem Service Frame.

## Critérios — Contexto
1. Persona identificada.
2. Necessidade ou Job explícito.
3. Problema validado.
4. Evidência registrada.
5. Problema validado mantém evidência rastreável.

## Critérios — Definição
1. Promessa + outcome.
2. Escopo.
3. Início + fim.
4. Princípios de desenho.
5. Critérios de sucesso.
6. Rastreabilidade para Persona + Problema + Evidência canônicos.

## Critérios — Estrutura
1. Service Frame existente.
2. Pelo menos duas etapas.
3. Ações do cliente em >= 80% das etapas.
4. Frontstage + Backstage representados.
5. Processo + Sistema/Recurso representados.
6. Cobertura mínima de 60% em etapa × camada.

## Regra de arquitetura
`Service Readiness` é um relatório derivado. O score não é gravado em `service.project` e não vira uma segunda fonte de verdade. Mudanças no Service Graph ou no Service Frame recalculam o resultado imediatamente.

## UX
A Service Home mostra:
- score total;
- score por domínio;
- critérios completos e lacunas;
- próxima lacuna;
- CTA direto para o local onde o gap é resolvido.

A composição assistida passa a exigir `readyForDesign = true`. O Whiteboard livre continua disponível e não é bloqueado.

## Compatibilidade
- `schemaVersion` permanece 3.
- `ServiceProjectState.version` permanece 1.
- nenhum campo `readiness` é persistido no Service Project.
- V1.20.3 Structured Service Frame preservada.

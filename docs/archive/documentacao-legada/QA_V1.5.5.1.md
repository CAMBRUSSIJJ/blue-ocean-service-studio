# QA — V1.5.5.1 Semantic & Layout QA

## Harness Chromium

O ambiente bloqueia navegação automatizada direta para `127.0.0.1`; por isso o QA de interação foi executado em Chromium com exatamente os bytes distribuídos de `v1551-whiteboard.js` e `v1551-whiteboard.css`, injetados em um documento controlado. O launcher foi testado separadamente via HTTP local.

## Fluxo de serviço

- 6 objetos do template: OK;
- 6/6 Smart Objects do tipo Processo: OK;
- 5 conexões preservadas: OK;
- 5 labels `precede`: OK;
- overlaps: 0;
- 2 objetos isolados adicionados: OK;
- área `Sem conexões`: OK;
- overlaps com margem de 20 px: 0.

## Semantic Type × Visual Type

Exemplo validado:

```text
semantic = process
visual   = card
label    = PROCESSO
```

## Blueprint template

- 6 objetos estruturais materializados como entidades semânticas: OK;
- Evidence / Customer Action / Frontstage / Backstage / Process / System: OK;
- Jornada existente materializada na View: OK;
- todos os objetos da captura de QA como Smart Objects: OK;
- overlaps detectados: 0.

## UX

- branding `Service Whiteboard`: OK;
- botão textual `Views`: 0 ocorrências;
- botão inferior `Canvas`: OK;
- filtros do Service Graph: Todos / Serviço / Operação / Análise: OK;
- histórico não usa `Editar quadro` no fluxo testado: OK;
- semantic zoom a 17% remove detalhes secundários: OK.

## JavaScript

- `node --check`: OK;
- erros JavaScript no fluxo Chromium: 0.

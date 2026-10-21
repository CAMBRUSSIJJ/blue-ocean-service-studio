# QA — V1.5.9 Performance & UX Polish

## Stress test sintético em Chromium headless

| Objetos no modelo | Objetos DOM no Fit | Render médio (3 frames, ambiente de QA) | Erros JS |
|---:|---:|---:|---:|
| 100 | 100 | ~8.7 ms | 0 |
| 500 | 378 | ~13.9 ms | 0 |
| 1.000 | 360 | ~12.1 ms | 0 |
| 5.000 | 357 | ~17.7 ms | 0 |

Os tempos acima são somente referência do ambiente headless de QA e não representam benchmark de hardware do usuário.

## Culling em 5.000 objetos a 100%
- 1366×768: 64 objetos DOM para 5.000 objetos no modelo;
- 1920×1080: 100 objetos DOM para 5.000 objetos no modelo;
- runtime errors: 0.

## Responsividade
Em 1366×768:
- header permaneceu em 56 px;
- sem overflow horizontal da aplicação;
- ações e seletor de view permaneceram na mesma linha após refinamento.

## Acessibilidade
- modal de Filtros: `role="dialog"`;
- `aria-modal="true"`;
- nome acessível “Filtros e visibilidade”;
- no fluxo testado: 0 botões sem nome acessível.

## Integridade
- `node --check`: aprovado;
- assets V1.5.9 carregados pelo launcher: validar no pacote final;
- compatibilidade V1.5.8 preservada pela chave de metadata legada.

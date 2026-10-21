# QA — V1.5.2 Smart Layout

## Automação em Chromium

Harness isolado usando exatamente `dist/v152-whiteboard.js` e `dist/v152-whiteboard.css`.

### Aprovado

- modal Smart Layout abre sem erros JS;
- 8 cards de layout presentes;
- Grade;
- Linha;
- Coluna;
- Fluxo;
- Árvore;
- Journey;
- Swimlane;
- Radial;
- restauração exata das posições iniciais após cada algoritmo;
- Compacto vs Amplo altera efetivamente o espaçamento;
- metadata `smartLayoutSnapshots` persistida;
- metadata `smartLayoutPrefs` persistida;
- Command Palette encontra Smart Layout;
- template Fluxo com 6 objetos e 5 conexões permanece íntegro após Smart Layout;
- Flow manteve os 5 relacionamentos e ordenou 5/5 conexões na direção horizontal no cenário testado;
- Frame + 4 Post-its preserva parentId após Grade;
- Frame expande para conter filhos quando necessário;
- Restore devolve também o tamanho original do Frame;
- zero erros JavaScript nos fluxos automatizados.

## Validação estática

- `node --check dist/v152-whiteboard.js` aprovado.

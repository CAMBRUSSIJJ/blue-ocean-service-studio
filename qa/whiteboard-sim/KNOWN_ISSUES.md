# Known issues monitorados pelo Sim Kit 2.2

O Sim Kit mantém checkpoints históricos mesmo quando uma limitação é corrigida. Quando a condição deixa de existir, o resultado muda automaticamente de `KNOWN` para `RESOLVED`.

## Esperados como resolvidos na V1.19.1

- Post-its novos sobrepostos no mesmo ponto.
- Atalhos de uma letra disparando sobre botão/controle focado.
- Perda de foco causada por re-render da toolbar/Inspector.
- Objetos sem `tabindex`, `role` e rótulo acessível básico.
- Toast sem `aria-live`.
- Canvas positivo limitado fisicamente a 5200 × 3200.
- Conflito entre abas sem rascunho protegido.
- Saída do Whiteboard livre dependente de reload completo.

## Ainda monitorados como limitações

- Coordenadas negativas continuam limitadas em zero; a expansão dinâmica cobre direita/baixo, não um plano cartesiano infinito completo.
- Conexões visuais ainda não possuem `relationType` semântico.
- Imagens ainda podem usar data URL dentro do Service Graph/histórico.
- Histórico de Undo ainda utiliza snapshots amplos do grafo, embora digitação no Inspector deixe de gerar snapshot por tecla.
- Fluxo visual React `Home → Criar serviço` exige gate de navegador real.

Esses itens permanecem como `known_issue`, não como assertions bloqueantes, até entrarem no escopo de correção correspondente.

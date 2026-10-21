# Journey Studio 1.0

## Contrato
`Journey Studio = Whiteboard Core + Journey Schema + Journey View + Journey Controls`.

A Jornada não possui uma cópia própria dos dados. Etapas, Personas, Touchpoints, Canais, Emoções, Problemas, Oportunidades, Necessidades, Expectativas e Métricas são entidades do Service Graph.

## Estrutura
- Columns: Etapas
- Header: Ação do cliente
- Lanes: Necessidades/Expectativas, Touchpoints/Canais, Emoção, Evidências, Problemas, Oportunidades, Métricas e Outros
- Cell: `Etapa × Lane`

## Regras
1. Reordenar Etapas altera Journey e Blueprint.
2. Trocar Persona não duplica Journey.
3. Esconder uma lane altera somente a visualização.
4. Métricas aparecem na etapa em que o fenômeno acontece.
5. Todo Smart Object continua reutilizável em outros quadros/views.

# Precision Studio Shell — V1.15.2

## Princípio

O shell deixa de se comportar como um dashboard administrativo e passa a funcionar como uma moldura de **studio/workspace**. A interface deve desaparecer visualmente quando o usuário está trabalhando e reaparecer apenas quando uma ação precisa de contexto.

## Estrutura

```text
┌───────────────┬──────────────────────────────────────────────┬──────────────┐
│ BLUE OCEAN    │ Workspace                  Buscar  + Criar   │              │
├───────────────┼──────────────────────────────────────────────┤  Inspector   │
│ Workspace     │                                              │  contextual  │
│               │                                              │              │
│ DESIGN        │                WORKSPACE / CANVAS            │  aparece     │
│ Jornadas      │                                              │  sob demanda │
│ Blueprints    │                                              │              │
│               │                                              │              │
│ ENTENDER      │                                              │              │
│ Pesquisa      │                                              │              │
│               │                                              │              │
│ MELHORAR      │                                              │              │
│ Plano de ação │                                              │              │
└───────────────┴──────────────────────────────────────────────┴──────────────┘
```

## Medidas padrão

- Sidebar expandida: `216px`
- Sidebar recolhida: `60px`
- Header: `48px`
- Inspector: `320px`
- Canvas: `#F7F8FA`
- Surface: `#FFFFFF`
- Border: `#E3E7ED`
- Text: `#172033`
- Brand action: `#1E63F0`

## Regras

1. A ação principal deve ser visível; ações secundárias devem ser discretas.
2. O Inspector substitui modais para edição de propriedades simples.
3. Toolbars contextuais aparecem somente após seleção.
4. Cards não devem ser usados como contêiner padrão para toda informação.
5. Blue é cor de ação/foco, não fundo estrutural permanente.
6. O canvas central deve receber a maior parte da área útil.
7. Journey, Blueprint e Whiteboard devem herdar este shell sem criar shells próprios.

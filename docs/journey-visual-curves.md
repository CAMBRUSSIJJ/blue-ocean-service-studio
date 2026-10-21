# Journey visual: curvas de emoções e métricas por etapa

Esta evolução incorpora ao editor configurável do Blue Ocean duas capacidades inspiradas no fluxo **etapas → faixas → cartões** encontrado em ferramentas de jornada. O código, os componentes e o modelo de dados são próprios.

## Como utilizar

1. Abra uma Jornada no **Mapa livre**, ou crie uma nova Jornada em branco.
2. Adicione duas ou mais etapas.
3. Use **Adicionar faixa → Emoções**. Em cada etapa, selecione um dos cinco estados, de muito insatisfeito (-2) a muito satisfeito (+2). A curva muda imediatamente.
4. Use **Adicionar faixa → Métricas**. Insira um valor numérico em cada etapa. A curva usa uma escala automática baseada nos valores disponíveis; células sem dados ficam vazias e não são interpretadas como zero.
5. É possível criar quantas faixas numéricas forem necessárias, atribuindo nomes próprios (tempo de espera, NPS, taxa de sucesso). Cada faixa conserva seus valores separadamente.
6. Edite, oculte, duplique e reorganize as faixas usando as ferramentas anteriores. O histórico de desfazer/refazer usa as transações do grafo.

## Compatibilidade e verdade dos dados

- A faixa de emoções usa `Stage.emotionScore` opcional (-2 a 2) e mantém sincronizado `Stage.emotion` (negative, neutral, positive). Jornadas antigas continuam legíveis.
- Quando a emoção é alterada pela matriz anterior, o controlador ajusta também o nível detalhado para -1/0/+1. Não mantém uma curva que contradiga a emoção real.
- Métricas são valores de texto numérico persistidos em `JourneyLane.cards[stageId]`; as curvas são derivadas e não viram cópias ou registros de pesquisa falsos.
- Tudo segue o salvamento atual do navegador. **Não representa sincronização remota, colaboração simultânea, histórico permanente ou upload de evidências.**
- Alterar a apresentação para outro tipo de faixa não remove os cartões legados.

## QA

O script `node scripts/journey-visualization-test.mjs` verifica interpretação dos níveis, normalização numérica, tratamento de valores vazios, escala automática e continuidade matemática entre células. A CI executa o script e continua executando o build e os testes de navegador existentes.

## Próximas fases (não incluídas nesta entrega)

- Canvas de fluxos com setas, ramificações e linha de visibilidade integrada ao Blueprint.
- Portfólio canônico de problemas, oportunidades e soluções com indicadores de rastreabilidade.
- Colaboração autenticada em tempo real, presença, comentários e resolução de conflitos.
- Exportação PNG/PDF de toda a Jornada, versão histórica compartilhada e filtros de persona.
- Validação de usabilidade real em mapas complexos e acessibilidade de teclado do editor.

# BLUE OCEAN Service Studio — V1.17.2

## Wizard “Montar serviço” 2.0

Release focada no fluxo guiado de montagem do serviço. O Service Graph continua sendo a única fonte de verdade; não houve mudança de schema, IDs, storage ou formato de backup.

## Adicionado

- stepper horizontal com os 8 blocos do roteiro: Serviço, Cliente, Etapas, Experiência, Operação, Problemas, Melhorias e Métricas;
- stepper também nos modais abertos a partir do roteiro, para manter o contexto;
- prévia ao vivo derivada do Service Graph com etapas, ação do cliente, touchpoints e cobertura operacional;
- resumo final do roteiro com Readiness, número de etapas, continuidade e métricas;
- atalhos no resumo final para abrir Jornada ou Blueprint;
- registro de conclusão do roteiro em `guidedServiceBuilder.completedAt`;
- gate `wizard:smoke` com 18 contratos específicos da versão.

## Melhorado

- o overview do wizard passou a ter duas áreas: roteiro e prévia ao vivo;
- passo atual fica visualmente destacado;
- Stage Flow mantém o contexto do passo do wizard;
- continuidade entre etapas permanece visível sem competir com a prévia;
- textos e controles mantêm piso tipográfico de 11 px;
- comportamento responsivo específico para tablet e mobile.

## Corrigido

- depois de criar uma etapa pelo wizard, o usuário volta automaticamente ao roteiro;
- depois de adicionar Problema, Oportunidade ou Métrica, o roteiro recalcula o próximo passo automaticamente;
- Experiência e Operação avançam para a próxima lacuna relevante sem perder o contexto da montagem;
- Stage Flow passa a preservar o contexto ao alternar entre etapas;
- QA da V1.17.1 foi tornado compatível com releases posteriores.

## Removido

Nenhuma funcionalidade foi removida. O novo stepper e a prévia foram adicionados sem criar armazenamento paralelo ou uma segunda representação do serviço.

## Pendente / limitações

- a prévia é estrutural e atualizada a partir do Service Graph; ainda não é um screenshot SVG completo do canvas;
- o `npm ci`/build completo depende do acesso ao registry no ambiente de execução;
- o wizard ainda usa modais do runtime legado em alguns subfluxos; a convergência completa para componentes React será tratada na fundação técnica futura.

## QA

- V1.17.2 Wizard smoke: 18/18;
- regressão V1.12–V1.17.1: aprovada;
- Demo smoke: 79 objetos / 0 referências quebradas;
- package-lock: consistente;
- `node --check` do Whiteboard runtime: aprovado.

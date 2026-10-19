# Blue Ocean Service Studio V1.19.4 — Service Composition Framework

## Objetivo
Transformar o Whiteboard de um canvas com entidades em um ambiente para preparar e compor um serviço completo, mantendo o Service Graph como fonte canônica.

## Adicionado
- Service Recipe / Preparation Kit antes da composição estruturada.
- Templates de preparação para Serviço geral, Restaurante/Delivery, Clínica/Saúde, Consultoria, SaaS e Serviço técnico/campo.
- Ingredientes de serviço: Cliente, Promessa, Jornada, Canais, Pessoas, Processos, Sistemas, Regras, Recursos, Métricas, Capacidade e Evidências.
- Nova visualização **Serviço**, além de Livre, Jornada, Blueprint e Relações.
- Matriz de composição: Etapas × Ação do cliente × Ponto de contato × Emoção × Frontstage × Backstage × Processos × Sistemas × Pessoas × Evidências × Problemas × Métricas × Melhorias.
- Smart Cards V2 com superfícies brancas, acento semântico e hierarquia visual por tipo.
- Runtime `serviceComposition`.
- Sim Kit 2.4 com contratos de Service Composition.

## Corrigido
- “Continuar sozinho” agora fecha onboarding/painéis auxiliares e persiste o modo livre do quadro.
- Readiness não é usado como orientação inicial de um quadro que optou por trabalho livre.
- Relações deixam de ser tratadas como a visualização principal do serviço; a nova view Serviço assume a composição estrutural.

## Regra de produto
A preparação do serviço recomenda o que mapear, mas não cria conteúdo do negócio automaticamente. O usuário confirma o que pertence ao serviço.

## Limitações conhecidas
- A matriz Serviço ainda usa o mesmo núcleo de posicionamento DOM do Whiteboard; virtualização avançada continua futura.
- O Service Recipe é determinístico nesta versão; ainda não usa IA para adaptar recomendações.
- Build React/Vite completo não foi declarado como aprovado neste ambiente porque `npm ci` não concluiu dentro da janela disponível.

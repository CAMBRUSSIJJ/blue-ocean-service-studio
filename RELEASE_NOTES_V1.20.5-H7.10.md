# V1.20.5-H7.10 — Service Blueprints 2.0

Base: **V1.20.5-H7.9 — Journey Maps 2.0**.

## Objetivo
Transformar o Blueprint em uma matriz operacional por etapa conectada à Journey, mantendo rastreabilidade canônica e sem inventar Frontstage, Backstage, Processos ou Sistemas quando a operação ainda não foi definida.

## Adicionado
- `service-blueprint-studio.ts` com modelo determinístico de health, cobertura e gaps.
- matriz por etapa para o modo **Blueprint estruturado**.
- seis camadas explícitas: Evidências, Ações do cliente, Frontstage, Backstage, Processos e Sistemas / suporte.
- três linhas clássicas: Linha de interação, Linha de Visibilidade e Linha de interação interna.
- health strip com qualidade geral, cobertura operacional, cobertura de evidência, gaps e readiness.
- gaps operacionais por etapa/lane, com criticidade determinística.
- sincronização explícita Journey → Blueprint para Smart Objects de Stage e Evidência.
- edição por célula para conteúdo operacional sem duplicar as entidades canônicas do Discovery/Journey.
- CSS H7.10 dedicado e responsivo.

## Melhorado
- a antiga visão estruturada baseada em textareas globais foi substituída por uma matriz Etapas × Camadas.
- Processos e Sistemas deixaram de compartilhar a mesma faixa automática no Whiteboard React.
- o template de Blueprint agora separa Processo operacional de Sistema / recurso.
- o layout automático do Whiteboard reconhece `evidence`, `customer`, `frontstage`, `backstage`, `process` e `system` como linhas distintas.
- o preflight Linux passa a exigir os novos arquivos H7.10.

## Regra de produto
A ação do cliente pertence à Journey e é somente leitura no Blueprint. O Blueprint descreve como a organização entrega essa experiência. Sincronizar a Journey não cria operação fictícia: lacunas permanecem visíveis como gaps até serem definidas pela equipe.

## Compatibilidade
O contrato legado do Service Frame que exige a nomenclatura **Linha de Visibilidade** foi preservado durante a regressão.

## QA
- H7.10 Service Blueprints 2.0: **36/36 PASS**.
- H7.9 Journey Maps 2.0: **41/41 PASS**.
- H7.8 Context-to-Service Handoff: **37/37 PASS**.
- regressão acumulada: **1707 OK / 0 FAIL**.
- preflight Linux: PASS.
- lock verify: PASS.
- source authority: PASS.
- foundation smoke: 12/12 PASS.
- syntax check: PASS.

## Limitações
`npm ci` excedeu o limite do ambiente novamente. Por isso typecheck e build completos não são declarados como PASS nesta geração. A instalação parcial foi removida antes do empacotamento.

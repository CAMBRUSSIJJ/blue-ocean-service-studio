# SOURCE BASELINE — V1.18.4

Base: V1.18.3 Service Pulse / Health Engine.

Autoridade de fonte permanece em `src/`.

Mudanças desta baseline:
- `src/services/attention-engine.ts` passa a ser a fonte única dos alertas priorizados da Home.
- O motor é puro e deriva os sinais do Service Graph Schema V3 e do Health Engine existente.
- Cada alerta possui ruleId, severidade, prioridade, categoria, status, causa, impacto, owner/prazo quando disponíveis e ação recomendada.
- `WorkspaceHome.tsx` apenas apresenta o relatório e roteia a ação para o workspace responsável.
- Nenhum alerta é persistido como cópia paralela do Service Graph.
- Nenhuma alteração em schema, IDs ou contratos de persistência.

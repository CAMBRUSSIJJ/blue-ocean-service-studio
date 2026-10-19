# BLUE OCEAN Service Studio — V1.18.4
## Attention Engine

### Adicionado
- Motor determinístico em `src/services/attention-engine.ts`.
- Central de Atenção na Home com severidade, prioridade, causa, impacto, owner, prazo, status, regra e ação recomendada.
- Resumo operacional com críticos, altos, vencidos e itens sem owner.
- Priorização numérica `0–100` usada pela Próxima Melhor Ação.
- Regras para ações atrasadas, ausência de owner em ações/oportunidades/Jornadas, benefícios em risco, revisão vencida/próxima, gaps de Jornada, comentários abertos, baixa evidência, Blueprint crítico, métricas fracas e evidências antigas.
- Gate `attention:smoke` com 32 contratos.

### Melhorado
- `Precisa de atenção` deixa de ser uma lista local da Home e passa a consumir uma fonte única de diagnóstico.
- A Próxima Melhor Ação usa o item de maior prioridade do Attention Engine.
- Alertas exibem contexto operacional e CTA específico para a área responsável.
- A Home mostra somente os 5 principais itens; a Central de Atenção mantém a lista completa.

### Corrigido
- Gates históricos da Home foram atualizados para aceitar a evolução arquitetural sem exigir regras antigas embutidas em `WorkspaceHome.tsx`.
- Service Health permanece independente do Attention Engine: saúde mede condição; atenção mede necessidade de ação.

### Removido
- Regras de atenção hardcoded dentro de `WorkspaceHome.tsx`.
- Ordenação simplificada somente por `high/medium/low`.
- Nenhum dado ou função de produto foi removido.

### Compatibilidade
- Service Graph Schema V3 preservado.
- Nenhuma migration nova.
- IDs, IndexedDB, storage, backups e contratos antigos preservados.
- Attention Engine deriva estado; não cria uma segunda fonte de verdade.

### Limitações / pendente
- Nesta versão não existem snooze, dismiss ou atribuição diretamente na Central de Atenção; as ações navegam para o workspace responsável.
- Thresholds e pesos das regras ainda são fixos.
- Não há IA decidindo prioridade.
- `npm ci` do ambiente de empacotamento não concluiu por `EAI_AGAIN`; o typecheck integral React/Vite precisa ser confirmado no Linux/CI.

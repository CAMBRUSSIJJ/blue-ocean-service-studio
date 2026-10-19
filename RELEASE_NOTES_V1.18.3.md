# BLUE OCEAN Service Studio — V1.18.3
## Service Pulse / Health Engine

### Adicionado
- Health Engine determinístico em `src/services/service-health.ts`.
- Service Health com 7 dimensões: Estrutura, Evidências, Governança, Experiência, Operação, Execução e Métricas.
- Pesos explícitos que somam 100%: 20/15/15/15/15/10/10.
- Estados `Saudável`, `Atenção` e `Crítico` com thresholds transparentes.
- Diagnóstico detalhado da Home com fórmula, pontos fortes, gaps prioritários e ação por dimensão.
- Journey Health por Jornada e Blueprint Health como diagnósticos específicos, sem misturar os conceitos.
- Gate `health:smoke` com 26 contratos.

### Melhorado
- O Service Pulse deixa de ser um score de quatro sinais e passa a explicar por que a nota existe.
- A Home mostra 7 dimensões e destaca o principal gap diretamente no card lateral.
- O usuário pode abrir o diagnóstico e navegar diretamente para a área responsável por cada dimensão.
- Health Engine deriva dados do Service Graph existente; nenhuma cópia paralela de dados foi criada.

### Corrigido
- Gates antigos de Home foram tornados forward-compatible com a evolução da Home 3.0, sem exigir a antiga faixa de KPIs/Readiness visual.
- A semântica de saúde foi separada de Readiness, Journey Completeness e Blueprint Health para evitar números que pareçam equivalentes quando medem coisas diferentes.

### Removido
- A fórmula simplificada da Home `Readiness 35% + Evidências 25% + Governança 20% + Execução 20%` deixa de ser a fonte do Service Pulse.
- Nenhuma funcionalidade ou dado do produto foi removido.

### Compatibilidade
- Service Graph Schema V3 preservado.
- IDs, storage, IndexedDB, backups e migrations preservados.
- Nenhuma migração de dados obrigatória.
- React continua proprietário estrutural exclusivo da sidebar/header nativos.

### Limitações / pendente
- Os pesos são fixos nesta versão; ainda não são configuráveis por workspace.
- O score é diagnóstico determinístico e não substitui julgamento profissional.
- Freshness/qualidade semântica de evidências ainda é básica; a V1.18.4 será focada no Attention Engine, não em IA.
- Typecheck/build completo depende de dependências instaladas. O ambiente de empacotamento não concluiu `npm ci` por timeout do registry.

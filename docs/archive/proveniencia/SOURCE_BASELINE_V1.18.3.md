# SOURCE BASELINE — V1.18.3

Base: V1.18.2 Home Information Architecture & DOM Ownership Recovery.

Autoridade de fonte permanece em `src/`.

Mudanças desta baseline:
- `src/services/service-health.ts` passa a ser a fonte única do Service Health da Home.
- Health Engine é puro e deriva seu resultado do Service Graph Schema V3.
- Service Health possui 7 dimensões com pesos explícitos e soma 100%.
- Journey Health e Blueprint Health permanecem diagnósticos específicos e não são tratados como sinônimos de Service Health.
- A Home React apenas apresenta o relatório e navega para ações; não persiste scores duplicados.
- Nenhuma alteração em schema, IDs ou contratos de persistência.

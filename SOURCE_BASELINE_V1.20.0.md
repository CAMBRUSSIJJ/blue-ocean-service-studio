# Source baseline — V1.20.0

- Baseline funcional: `Blue-Ocean-Service-Studio-V1.19.9-Source.zip`.
- A V1.20.0 preserva `schemaVersion: 3` e o `Service Project version: 1`.
- Nenhuma coleção de problemas/evidências é duplicada dentro de `service.project`.
- Hipóteses permanecem em `entities.problemHypothesis`.
- Evidências permanecem em `entities.evidence`.
- Problemas promovidos ficam em `entities.problem`, com `sourceHypothesisId`, contexto e IDs das evidências usadas na validação.
- O relacionamento Evidence × Hypothesis usa `evidenceLinks` na hipótese para registrar `supports`, `contradicts` ou `neutral`, além dos `relatedIds` canônicos.
- Persona Studio V1.19.9, Discovery Workspace V1.19.8 e Service Home V1.19.7 permanecem compatíveis.

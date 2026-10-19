# Source Baseline — V1.19.9

- Baseline direta e recuperável: `Blue-Ocean-Service-Studio-V1.19.8-Linux-Source-Launcher.zip`.
- V1.19.8 já contém a Service Home reconstruída, Discovery Workspace e os gates V1.19.7/V1.19.8.
- V1.19.9 adiciona `src/services/persona-studio.ts`, aprofunda a Persona dentro da fase **Entender** e não cria nova página/sidebar para Persona.
- O perfil permanece no `GraphEntity persona`; relações continuam no Service Graph canônico.
- `schemaVersion` permanece `3`; o enriquecimento de Persona usa `profileVersion: 1` dentro da entidade, compatível com o schema `.passthrough()`.
- Nenhum `node_modules`, `dist`, `.generated`, `artifacts` ou `__pycache__` é autoridade de fonte.

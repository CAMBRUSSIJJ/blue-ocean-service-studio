# QA V1.10.0

O QA de hardening verifica contratos de arquitetura e integridade além da presença de recursos.

Cobertura principal:

- Schema V3 e migração V2 → V3;
- chave de persistência V3 com fallback de leitura V2;
- Integrity Engine e exclusão centralizada;
- validação profunda de import;
- referências de boards e Service Graph;
- persistência IndexedDB-preferred;
- sanitização de imagens;
- semântica de indicadores;
- deduplicação da Operating Review;
- governança sensível à cadência;
- medição/dependências na Service Intelligence;
- regressão de Research, Layers, Presentation, Intelligence, Benefits e Operating Review;
- ausência de `window.__rt`, `MutationObserver`, `prompt()` e `confirm()`.

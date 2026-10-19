# RealTalent Service Studio V1.10.0 — Product Hardening & Data Integrity

Esta versão interrompe temporariamente a expansão de módulos e endurece a base criada até a V1.9.7.

## Principais mudanças

- Service Graph Schema V3, com migração compatível do Schema V2.
- Integrity Engine central para validar, reparar e excluir entidades com relações conhecidas.
- Exclusão de Jornada passa pelo plano de integridade (`cascade / detach / block`).
- Importação de projeto executa migração, reparo seguro e validação profunda antes de substituir o workspace.
- IndexedDB passa a ser a cópia durável preferencial; localStorage funciona como cache/fallback compacto para projetos grandes.
- URLs de imagem importadas são validadas como `data:image/...;base64` antes de renderizar.
- Journey: "Saúde" estrutural passa a se chamar **Completude da Jornada**; Journey Management usa **Prontidão de Gestão**.
- Revisão Operacional agrupa múltiplos sinais da mesma entidade em um único item de agenda.
- Governança da revisão passa a avaliar recência conforme a cadência.
- Service Intelligence separa cobertura de métricas de medição realmente pronta e cobertura de dependências de readiness.
- Nomes históricos de arquivos fonte (`v1815-*`) foram substituídos por nomes estáveis dentro de `src/runtime/`.

## Compatibilidade

A aplicação lê a chave V2 do navegador, migra o grafo para V3 e passa a persistir na chave V3 sem apagar automaticamente os dados V2 originais.

# Source Baseline — V1.19.5

Fonte canônica: `src/` + `scripts/` + `qa/` + `package.json` + `package-lock.json`.

## Escopo da versão
- UX Truth & Runtime QA foundation
- Service Project Home entry
- Discovery-first: Persona, Necessidade, Problema/Hipótese, Evidência
- Discovery gate antes de composição estruturada
- remoção do Recipe modal como runtime path
- roadmap Service Project até V1.21.0

## Invariantes preservados
- Service Graph continua sendo a fonte canônica.
- Workspace novo continua sem Journey, Stage, Touchpoint, Blueprint ou Whiteboard automáticos.
- Whiteboard livre continua permitido sem Discovery mínimo.
- Montagem estruturada não cria Persona/Problema automaticamente.
- Demo continua explícito e separado da inicialização de produção.
- Nenhum `node_modules/`, `dist/` antigo, `.generated/` ou resultado temporário de QA faz parte da baseline.

## UX Truth
Uma mudança visual só pode ser considerada plenamente verificada quando passa L1 Código + L2 Contrato + L3 Runtime + L4 Visual. Nesta baseline, L1/L2 estão automatizados; L3/L4 possuem runner próprio e permanecem UNKNOWN quando o navegador não pode ser executado.

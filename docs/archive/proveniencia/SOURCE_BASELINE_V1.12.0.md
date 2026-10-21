# BLUE OCEAN Service Studio — Source Baseline V1.12.0

Esta é a baseline editável da V1.12.0 Runtime & Architecture Stabilization.

## Regra de compatibilidade

Identificadores internos históricos (`RealTalentRuntime`, chaves `realtalent-*`, seletores `rt*` e nomes de assets `v1102-*`) permanecem intencionalmente preservados. Eles são contratos de compatibilidade e não representam branding visível.

## Gate antes da V1.13.0

- `npm ci`
- `npm run stability:smoke`
- `npm run typecheck`
- `npm run build`
- `npm run demo:smoke`
- validação manual no navegador de navegação, CRUD, import/export, recovery, concorrência entre abas e publicação Vercel.

Não iniciar Design System V1.13.0 antes de este gate estar aprovado.

# BLUE OCEAN Service Studio V1.20.5-H7.40-H2

## Navigation + First Service UX

- Corrige o bloqueio da sidebar quando ainda não existe um serviço.
- Remove o `disabled={!hasService}` funcional dos itens de navegação e substitui o bloqueio por uma tela explicativa com CTA de criação.
- Move o evento `bo-create-service` para o shell React atual; o modal de criação não depende mais do Workspace Home legado estar montado.
- Adiciona CTA `Criar primeiro serviço` ao seletor de serviço.
- Adiciona onboarding de primeiro uso: Serviço → Contexto → Journey → Blueprint → Testar → Medir.
- Mantém Journey, Blueprint e Whiteboard como perspectivas do Service Workspace unificado da H7.22.
- Simplifica Configurações para linguagem comercial: Geral, Aparência, Dados e backup, Avançado.
- Preserva os contratos legados necessários para regressão sem expor jargão técnico na superfície principal.

## QA

- `npm run qa`: PASS após as correções.
- H7.40-H2 Navigation + First Service UX: 15/15 PASS.
- H7.40 Professional Product Hardening: 115/115 PASS.
- H7.22 Unified Service Blueprint Workspace: 47/47 PASS.
- `npm run syntax:check`: PASS.
- `npm run lock:verify`: PASS.
- `npm run source:authority`: PASS.
- `preflight-linux.sh`: PASS.
- Chromium 144 browser hardening: 13/13 PASS.
- `npm ci` neste ambiente não concluiu dentro da janela e foi interrompido; `node_modules` parcial foi removido. Por isso typecheck React completo/build Vite não são declarados como PASS neste ambiente.

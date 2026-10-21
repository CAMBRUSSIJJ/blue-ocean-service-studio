# V1.20.5-H7.40-H14 — Interaction & Accessibility Polish

## Objetivo
Fechar o refinamento de interação e acessibilidade sem reorganizar novamente a arquitetura do Blue Ocean.

## Mudanças principais
- `Serviço` continua como entrada global para projetos; dentro do projeto a área passa a se chamar **Design do serviço**.
- Sidebar global persistente preservada.
- Seções **Desenho do serviço**, **Contexto** e **Gestão** podem ser recolhidas e a preferência fica salva no navegador.
- Header do app fica compacto quando uma ferramenta do Design do serviço está aberta.
- Status de salvamento passa a comunicar claramente `Salvando…`, `Salvo neste dispositivo` e `Não foi possível salvar`.
- `aria-current` foi reforçado em navegação primária/contextual.
- Foco visível e hit targets foram ampliados; em dispositivos touch, ações relevantes chegam a 44 px.
- Capability rows receberam tipografia e espaçamento maiores.
- Copy do caminho foi alterada de uma sequência rígida para **Evolua o serviço, fase por fase**.

## QA
- H7.40-H14 smoke: **35/35 PASS**.
- Chromium real H14: **8/8 PASS**.
- H7.40-H13: **25/25 PASS**.
- H7.40-H12: **31/31 PASS** via preflight.
- H7.40-H11: **20/20 PASS**.
- H7.40-H10: **28/28 PASS**.
- H7.40-H7 Guided Workspace: **36/36 PASS**.
- H7.40 Professional Hardening: **115/115 PASS**.
- `syntax:check`, `lock:verify`, `source:authority`, Foundation **12/12**, Project Foundation **46/46** e `preflight-linux.sh`: PASS.

## Limitação declarada
O encadeamento completo `npm run qa` não foi concluído nesta execução por lentidão/timeout do próprio npm; os gates H14, preflight e regressões críticas foram executados diretamente. React typecheck completo e Vite build também não são declarados como PASS porque o pacote final permanece source-clean, sem `node_modules`.

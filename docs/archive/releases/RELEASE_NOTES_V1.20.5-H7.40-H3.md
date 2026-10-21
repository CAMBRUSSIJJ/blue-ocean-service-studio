# BLUE OCEAN Service Studio V1.20.5-H7.40-H3

## Product Coherence & Navigation

- Substitui a linha de 18 tabs por uma navegação progressiva em seis grupos: **Visão geral, Entender, Projetar, Validar, Melhorar e Operar**.
- Mantém todas as 18 perspectivas canônicas, agora em uma subnavegação contextual que não força overflow global.
- Renomeia a entrada principal da sidebar de **Blueprints** para **Serviço**.
- Diferencia os conceitos duplicados: **Oportunidades** (catálogo) → **Iniciativas** (execução) e **Catálogo de métricas** (definição) → **Resultados** (monitoramento).
- Adiciona cross-links entre os catálogos legados e as perspectivas H7 correspondentes.
- Corrige os CTAs do Cockpit que enviavam `{id: tab}` em vez do ID direto da perspectiva.
- Adiciona watchdog de 5 s ao autosave para evitar status visual preso em “Salvando”.
- Remove o rótulo comercial `Whiteboard 2.0`, melhora a orientação da tela Hierarquias e renomeia o CTA de Problemas para **Validar novo problema**.
- Preserva os contratos históricos H7.22–H7.40 apenas como marcadores de regressão, sem reintroduzir a navegação antiga.

## QA

- Suíte acumulada: **4574 OK / 0 FAIL**.
- H7.40-H3 Product Coherence & Navigation: **26/26 PASS**.
- H7.40 Professional Product Hardening: **115/115 PASS**.
- H7.39 Executive Service Cockpit: **138/138 PASS**.
- H7.22 Unified Service Blueprint Workspace: **47/47 PASS**.
- `syntax:check`: PASS.
- `lock:verify`: PASS.
- `source:authority`: PASS.
- Foundation: **12/12 PASS**.
- Project Foundation: **46/46 PASS**.
- `preflight-linux.sh`: PASS.
- Chromium 144 — H7.40 browser hardening: **13/13 PASS**.
- Chromium 144 — H7.40-H3 browser coherence: **10/10 PASS**.

## Limitação honesta

- `npm ci` voltou a não concluir neste ambiente e foi encerrado; `node_modules` parcial foi removido.
- Por isso, o **typecheck React completo** e o **build Vite de produção** não são declarados como PASS neste ambiente. O `syntax:check` e os gates de domínio/source passaram.

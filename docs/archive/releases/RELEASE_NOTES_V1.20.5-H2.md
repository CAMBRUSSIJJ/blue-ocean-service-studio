# V1.20.5-H2 — Visual Architecture Recovery

## Motivo
A captura real em navegador mostrou duas regressões visuais importantes apesar da arquitetura React já ter sido atualizada:

1. `src/runtime/blue-ocean-shell.js` removia os grupos de navegação React e reconstruía a IA antiga (`ENTENDER / DESIGN / MELHORAR / OPERAR`). Isso deixava Whiteboards fora de DESENHO e fazia a sidebar parecer a versão antiga.
2. Os runtimes legados de busca global e `+ Criar` eram injetados no header específico da Home. O CSS compacto desse header forçava os controles injetados para 30px, causando textos/atalhos sobrepostos aos ícones.

## Corrigido
- Runtime shell agora respeita: CONTEXTO / DESENHO / VALIDAÇÃO / MELHORIA / WORKSPACE.
- DESENHO é ancorado antes de Whiteboards, não antes de Journey.
- Header da Home declara ownership nativo de Search/Create para impedir injeção duplicada.
- Guard CSS neutraliza controles legados se algum asset antigo ainda tentar injetá-los.
- Launcher local envia `Cache-Control: no-store` para não reutilizar JS/CSS público antigo após trocar de hotfix.
- Service Home remove `EM CONSTRUÇÃO`, Project ID visual, score duplicado no hero e resumo lateral redundante.
- Fases da Service Home foram compactadas.
- Service Readiness foi compactado sem perder critérios e ações.
- Contexto na Home virou faixa compacta de sete objetos, mantendo a Context Library como superfície de trabalho.

## Preservado
- `serviceProjectReport.overallScore` continua exposto semanticamente via data attribute.
- `serviceReadinessReport.blockingGaps` continua exposto semanticamente via data attribute.
- Context Library, Service Frame, Readiness e Frontstage/Backstage não mudam regra de negócio.
- Versão funcional permanece `1.20.5`; H2 identifica o hotfix visual.

# V1.20.0 — Problem & Evidence Studio

## Objetivo
Fechar a fase de Discovery no ponto em que uma suposição precisa ser confrontada com evidências antes de virar um problema tratado como validado.

## Fluxo
`Dor / Contexto -> Hipótese -> Evidência -> Problema validado`

## Adicionado
- Problem & Evidence Studio dentro de `Service Home -> Entender`.
- Duas superfícies no mesmo Studio: `Hipóteses e problemas` e `Evidências`.
- Conexão de hipótese com Persona, Necessidade, Job e Dor.
- Relação específica Evidence × Hypothesis: `Sustenta`, `Contradiz`, `Contextual` ou `Não ligada`.
- Evidence Desk para editar título, observação, confiança e tipo de fonte.
- Critérios determinísticos e explicáveis de prontidão para validação.
- Bloqueio de validação quando existe evidência contraditória de alta confiança não resolvida.
- Ação explícita `Validar como problema`.
- Problema canônico em `entities.problem`, preservando `sourceHypothesisId`, contexto e evidências.
- `validationNeedsReview` quando uma hipótese já validada é alterada.
- Revalidação atualiza o problema existente sem duplicá-lo.

## Critérios de prontidão
1. Hipótese formulada claramente.
2. Dor/fricção conectada.
3. Persona, Necessidade ou Job conectado.
4. Pelo menos uma evidência relacionada.
5. Pelo menos uma evidência favorável de confiança média ou alta.
6. Nenhuma evidência contraditória de alta confiança aberta.

O score é apenas a proporção desses critérios atendidos. Ele não é um diagnóstico de IA e não substitui julgamento de pesquisa.

## Arquitetura
- `schemaVersion` continua `3`.
- `ServiceProjectState` continua `version: 1`.
- `service.project` não duplica hipóteses, evidências ou problemas.
- `entities.problemHypothesis` mantém a hipótese e metadados de relação.
- `entities.evidence` mantém a evidência e confiança da fonte.
- `entities.problem` recebe apenas problemas explicitamente promovidos/validados.
- `Service Project -> Improvement` passa a considerar problema validado/estruturado, não mera hipótese, como sinal de problema para melhoria.

## QA
- `problem-evidence:smoke`: 107 OK / 0 FAIL.
- TypeScript parser: PASS.
- Typecheck isolado `model + Discovery + Persona + Problem/Evidence + Service Project`: PASS.
- Regressão completa: 1449 OK / 0 FAIL em 43 gates com contagem.
- `lock:verify`: PASS.
- `source:authority`: PASS.
- `foundation:smoke`: PASS.
- Browser Truth: UNAVAILABLE por ausência do Chromium do Playwright.
- `npm ci` completo: tentativa excedeu o limite do ambiente e instalação parcial foi removida.
- Typecheck React/Vite completo e build Vite: NÃO DECLARADOS sem dependências completas.

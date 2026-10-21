# V1.20.1 — Service Definition Studio

## Objetivo
Transformar a fase **Definir** em um workspace operacional entre Discovery e Design. A definição deixa de ser um formulário isolado e passa a registrar o contrato de intenção do serviço com rastreabilidade para Personas, problemas e evidências canônicas.

## Adicionado
- **Service Definition Studio** em `Service Home -> Definir`.
- Readiness determinístico de definição com 9 critérios explicáveis.
- Critérios de sucesso do serviço.
- Itens explicitamente fora do escopo.
- Premissas ainda não validadas.
- Referências canônicas por ID para Personas, problemas validados/estruturados e evidências.
- Painel lateral de rastreabilidade do Discovery.
- Gate de entrada no desenho: `Ir para desenho` permanece bloqueado enquanto a definição não estiver pronta.
- Normalização transparente de projetos antigos para os novos campos da definição.
- Validação no schema e no runtime para referências quebradas de Persona, Problem e Evidence.

## Readiness de definição
A fase está pronta para orientar o desenho quando todos os critérios abaixo estão completos:
1. Promessa explícita.
2. Outcome definido.
3. Escopo delimitado.
4. Início e fim definidos.
5. Ao menos um princípio de desenho.
6. Ao menos uma Persona-alvo conectada.
7. Ao menos um problema validado/estruturado conectado.
8. Ao menos uma evidência rastreável conectada.
9. Ao menos um critério de sucesso.

O score é a proporção direta desses critérios. Não há IA nem score arbitrário.

## Arquitetura
- `schemaVersion` permanece `3`.
- `ServiceProjectState.version` permanece `1`.
- Personas, Problems e Evidence continuam no Service Graph; `service.project.definition` armazena apenas referências por ID.
- Campos adicionados à definição: `successCriteria`, `outOfScope`, `assumptions`, `personaIds`, `problemIds`, `evidenceIds`.
- `schema.ts` valida os novos campos.
- `data-integrity.js` normaliza os novos campos e detecta referências inválidas.
- O gate legado da V1.19.6 foi corrigido para distinguir **referência por ID** de **duplicação de coleção**.

## QA
- `service-definition:smoke`: **87 OK / 0 FAIL**.
- Regressão completa: **1538 verificações / 0 FAIL em 44 gates**.
- Service Home: 19/19.
- Discovery Workspace: 51/51.
- Persona Studio: 89/89.
- Problem & Evidence Studio: 107/107.
- TypeScript parser: PASS.
- Typecheck isolado `model + Service Project + Discovery + Persona + Problem/Evidence + Service Definition`: PASS.
- `lock:verify`: PASS.
- `source:authority`: PASS.
- `foundation:smoke`: 12/12.
- Linux preflight: PASS.
- ZIP Linux final reextraído: **1538/1538, 0 FAIL**, `START.sh` 755 e sem diretórios de build/cache.
- Browser Truth: **UNAVAILABLE** — Chromium do Playwright ausente.
- `npm ci`: tentativa excedeu o limite do ambiente e deixou instalação parcial (~804 KB); o diretório parcial foi removido.
- Typecheck React/Vite completo e build Vite: **NÃO DECLARADOS** sem instalação completa das dependências.

# Blue Ocean H17.0.8 — Auditoria A1 (19/10/2026)

## Escopo
Código-fonte do editor de Jornada, seu controlador de etapas, estrutura de faixas e rotina de exclusão do grafo. A Visão geral do projeto não foi alterada.

## Achados
1. **Alto — exclusão fragmentada:** a UI limpava `lane.cards` por uma chamada ao histórico e excluía a etapa em outra chamada. **Corrigido:** a limpeza agora faz parte de `deleteStageFromGraph`, na mesma transformação do grafo.
2. **Médio — ação de vínculo incoerente:** a faixa `touchpoints` abria a captura de Necessidade. **Corrigido:** abre o inspetor da etapa com a edição de pontos de contato disponível.
3. **Médio — arquitetura ainda limitada:** `JourneyLane.cards` é `Record<stageId, string>`; não suporta múltiplos cartões por célula, rich text ou metadados. **Pendente:** migração versionada para layout v2, após testes.
4. **Alto — sem validação E2E:** os testes H17.0.8 anteriores apenas procuram padrões no código; não demonstram persistência ou comportamento no navegador. **Pendente:** testes automatizados de UI e persistência.
5. **Alto — efeitos destrutivos na exclusão:** `deleteStageFromGraph` também remove problemas, oportunidades e tarefas ligados à etapa. Necessário revisar políticas de retenção e preservar elementos compartilhados antes de homologar exclusão. **Pendente; não alterado sem definição de regra de negócio.**
6. **Médio — tipagem e composição:** as operações de layout e o JSX estão concentrados no editor. Recomenda-se extrair funções puras de edição de faixas/cartões e testes unitários antes da H17.0.9.

## Verificações executadas
- `node scripts/h1708-editor-regression.mjs`: 10 verificações estáticas aprovadas **na base original** (a verificação de limpeza separada precisa ser atualizada conforme correção).
- `node scripts/h1708-audit-integrity.mjs`: 7 verificações estruturais.
- `tsc --noEmit --noCheck`: passou — **verificação sintática**, não typecheck semântico.
- `npm ci --offline`: bloqueado por pacote npm `zod@4.6.5` ausente do cache.
- `npm run typecheck`, `npm run build`, testes no navegador: **não executados com êxito; NÃO homologado**.

## Aceite da próxima fase
1. Rodar `npm ci`, `npm run typecheck`, `npm run build` em ambiente com dependências disponíveis.
2. Validar criação, renomeação, reordenação, exclusão e recuperação de etapas e faixas após reload.
3. Definir regra de retenção de problemas/oportunidades/tarefas ao excluir uma etapa.
4. Implementar suíte de testes reais e migração versionada antes de múltiplos cartões.

## Instalação
Extraia o ZIP e execute `npm ci`, `npm run typecheck`, `npm run build`, `npm run dev` na pasta com `package.json`.

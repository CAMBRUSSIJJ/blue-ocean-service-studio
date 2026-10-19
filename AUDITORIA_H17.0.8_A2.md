# Blue Ocean H17.0.8 — Auditoria A2 (19/10/2026)

## Base e escopo
Continuação da auditoria A1, limitada ao comportamento de exclusão de etapas no domínio da Jornada e testes de regressão. Não houve alteração visual na Visão geral, nem migração do formato das faixas.

## Política de retenção adotada
- Excluir uma etapa elimina a etapa da Jornada e remove seu conteúdo nas células de faixas (`mapLayout.lanes[].cards[stageId]`) na mesma transformação.
- Problemas, oportunidades, tarefas, pontos de contato e demais entidades do serviço NÃO são apagados automaticamente. Referências diretas `stageId` à etapa excluída são desvinculadas usando string vazia, mantendo IDs e demais relações entre entidades.
- Informações que pertenciam exclusivamente à etapa (título, ação do cliente, pensamentos, associações locais) deixam de existir com a etapa. Usar Desfazer no aplicativo para recuperação enquanto o histórico estiver disponível.
- Ainda não existe um registro de auditoria permanente para exclusão; operações de exclusão de Jornada e de outras entidades não foram revisadas nesta fase.

## Testes realmente executados
- `node scripts/h1708-audit-a2-behavior.mjs`: PASSOU, 12 asserções sobre a função REAL de exclusão (via transpilação isolada): remoção, não mutação do grafo de entrada, retenção de entidades, desvinculação, manutenção de etapa e células vizinhas, idempotência.
- `node scripts/h1708-audit-integrity.mjs`: PASSOU, 7 verificações estruturais (não equivalem a E2E).
- `tsc --noEmit --noCheck`: PASSOU, verificação sintática somente.
- `npm ci --offline`: BLOQUEADO, pacote `zod@4.6.5` indisponível no cache.
- `npm run typecheck`, `npm run build`, navegador, persistência após reload: NÃO VALIDADOS.

## Comandos para homologação no Linux com internet
```bash
npm ci
npm run typecheck
npm run build
node scripts/h1708-audit-a2-behavior.mjs
npm run dev
```
No navegador, criar etapa, inserir conteúdo e vínculos, excluir, verificar preservação das entidades e conteúdo de outras etapas, desfazer, recarregar e confirmar persistência.

## Pendências H17.0.9
- Testes automatizados reais do repositório de persistência e do navegador (Playwright ou equivalente).
- Desenhar migração versionada de `JourneyLane.cards: Record<stageId,string>` para cartões independentes com ID.
- Revisar efeitos de exclusão em outros módulos e referências externas ao grafo.

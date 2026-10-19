# H17.0.8 — Fundação e estabilidade do mapa

Base: Blue Ocean V1.20.5 H17.0.7.

## Mudanças
- Canvas ocupa a altura útil, superfície branca e sem decoração interna; mapa mantém rolagem horizontal e vertical.
- Campos de etapa começam vazios, sem inserir automaticamente o título “Descoberta”.
- Cabeçalhos permitem editar título diretamente, mover etapa para esquerda/direita, abrir detalhes e excluir.
- Exclusão informa presença de conteúdo livre e quantidade de vínculos antes de confirmar; não exclui entidades canônicas do serviço.
- Ao excluir etapa, limpa o conteúdo das faixas livres associado à etapa; as demais faixas e etapas permanecem.
- Botão de faixa adota terminologia em português.
- Persistência de faixas permanece no mapLayout da Jornada; dados existentes mantidos sem migração de formato.
- Adicionado script de regressão estática `node scripts/h1708-editor-regression.mjs`.

## Verificação e limitações
- `tsc --noEmit --noCheck` passou (checagem sintática sem checagem semântica).
- Script de regressão estática: passou.
- `npm ci --offline` não concluiu por falta do pacote zod no cache local; por isso não foi possível validar typecheck completo, build ou navegador.
- Múltiplos cartões independentes por célula e melhorias avançadas de UX não estão nesta versão: etapa prevista para H17.0.9.
- Não reivindicar homologação até testes reais de persistência e navegação em navegador.

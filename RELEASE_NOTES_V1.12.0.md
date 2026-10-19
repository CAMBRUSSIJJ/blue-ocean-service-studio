# V1.12.0 — Runtime & Architecture Stabilization

## Escopo
Versão de estabilização sobre a V1.11.2. Nenhuma nova capacidade de produto foi adicionada.

## Correções principais
- Recovery durável executado antes da montagem da interface.
- Estado local inválido preservado em quarentena antes de fallback seguro.
- Importação completa desacoplada do overlay do Whiteboard.
- Rollback da importação quando a persistência falha.
- Cancelamento/arquivo inválido deixam de ser reportados como importação bem-sucedida.
- Session heartbeat não derruba o editor quando `localStorage` está indisponível.
- Branding/sidebar deixam de usar `MutationObserver`; atualização passa a ser dirigida por eventos.
- Estado visual de boot, offline e falha fatal para evitar tela branca silenciosa.
- Error Boundary React na baseline de source.

## Compatibilidade
Chaves `realtalent-*`, seletores `rt*` e APIs internas históricas foram preservados por compatibilidade.

## Gate
Executar `npm run stability:smoke`, `npm run typecheck`, `npm run build` e regressão no navegador antes de avançar para V1.13.0.

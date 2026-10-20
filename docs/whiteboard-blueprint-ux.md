# Whiteboard e Blueprint: melhorias de UX

O canvas volta a ocupar a área útil do editor. Whiteboard e Blueprint compartilham um cabeçalho com documento, serviço, retorno à biblioteca, desfazer/refazer e estado de salvamento local.

## Fluxo de trabalho

1. Abra um Whiteboard e adicione um post-it. A digitação começa no próprio objeto; duplo clique permite editar novamente.
2. Use **Enter** para concluir, **Shift+Enter** para nova linha e **Esc** para cancelar. As propriedades de texto e cor ficam disponíveis em **Editar**, com opções adicionais recolhidas.
3. Selecione ideias e escolha **Organizar em Blueprint**. Revise nome, Jornada, etapas, camada de cada ideia e quais objetos devem permanecer somente no Whiteboard.
4. Escolha entre manter os conteúdos vinculados ou criar cópias independentes. O diálogo explica o efeito de cada opção.
5. Confirme a criação. Os objetos mantêm suas posições no Whiteboard, as conexões entre os itens incluídos são preservadas e a operação pode ser desfeita em uma ação.
6. No Blueprint, use **Quadro de origem** para retornar ao Whiteboard. O conteúdo vinculado é compartilhado; cada documento mantém seu layout.

No Blueprint vazio, o próximo passo é adicionar uma etapa ou usar uma Jornada existente. As células recebem atividades por edição direta, sem abrir um formulário de configuração. Os nomes das etapas e camadas permanecem visíveis durante a navegação. O seletor oferece **Vista operacional** e **Matriz detalhada**.

As bibliotecas exibem miniaturas reais dos Whiteboards. Referências ausentes são apresentadas como problemas concretos, sem selo de qualidade de 100% para um quadro vazio. Diagnósticos e versão do editor ficam em **Mais**.

No celular, o editor mantém o modo de leitura e o acesso a comentários. A edição foi validada em desktop e tablet.

## Correções de base

- Regras visuais do aplicativo e do cabeçalho antigo deixam de alterar o viewport do editor.
- Consultar permissões não inicializa colaboração por outra transação, evitando recursão.
- Eventos de atualização do runtime não provocam uma nova gravação pelo efeito de autosave do React.
- Cliques simples preservam os elementos dos cartões, permitindo duplo clique e seleção previsíveis.
- O enquadramento é guardado por documento e restaurado ao reabrir.
- O inspector não abre automaticamente depois de arrastar um objeto nas preferências padrão.
- Cartões agrupam seus controles com semântica acessível; atalhos respeitam controles internos. Foco, nomes acessíveis e contraste foram revisados nos fluxos principais.

## Verificação

Use Node 22 e as dependências do lockfile:

```sh
npm ci
npm run build
npm run editor:selection:test
npm run editor:browser
```

O teste de navegador requer Python, Playwright e Chromium. Ele serve o `dist` local em uma porta temporária e usa contextos descartáveis. `CHROMIUM_PATH` permite indicar um executável; `BLUE_OCEAN_URL` permite testar um servidor já iniciado.

As evidências ficam em `artifacts/editor-ux/`: resultados em JSON e capturas dos editores em desktop, tablet e celular. O job independente `editor-ux` no GitHub Actions instala o navegador, valida o build e publica essas evidências.

O teste do planejador cobre vínculos, cópias independentes, reutilização de Jornada e entidades, preservação da origem, conexões, objetos bloqueados e rejeição de planos inválidos. O teste de navegador cobre criação, edição, manipulação espacial, conexão por teclado, preview e cancelamento, undo/redo, retorno à origem e às bibliotecas, salvamento e recarga.

Na validação desta entrega, o build completo, a verificação do lockfile, a autoridade do código-fonte, a suíte de fundação, o planejador da seleção e os quatro testes comportamentais da Jornada passaram. Os testes de navegador passaram em 50 de 50 verificações. Das 147 suítes de `qa`, 143 passaram.

A auditoria com axe-core, usando os critérios automáticos WCAG 2 A/AA e 2.1 AA, não encontrou violações nas cinco telas examinadas: Whiteboard, inspector, revisão da seleção, Blueprint e seletor de vistas. O resultado local está em `artifacts/editor-ux/accessibility.json`; isso não constitui uma certificação completa de acessibilidade.

Quatro suítes antigas continuam falhando, com as mesmas falhas reproduzidas no commit de origem `6c5f4cec53fa80f2ffffc337c44c32a79a303df4`:

- `v1205h740h10:project-shell-smoke`: áreas amplas do Project Home.
- `v1205h168:design-start-choice-smoke`: evidência ligada à etapa atual.
- `v1205h1704:reference-workflow-smoke`: modelo escolhido chegando ao runtime.
- `v1205h1705:free-canvas-smoke`: contratos antigos do Journey Free Canvas.

Essas falhas impedem declarar a suíte geral completamente verde. A validação automatizada dos editores não substitui sessões de usabilidade com equipes reais nem comprova o desempenho em quadros muito grandes.

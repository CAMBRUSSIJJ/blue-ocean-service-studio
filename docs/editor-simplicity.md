# Edição mais simples de Jornada e Blueprint

Esta atualização reduz os controles permanentes e aproxima a edição do conteúdo. As operações e os vínculos existentes continuam disponíveis.

## Sidebar recolhível

O botão fica ao lado do seletor de serviço e projetos, uma região que permanece visível. Antes, ele estava dentro do cabeçalho de marca ocultado pelo tema.

- Recolher reduz a navegação de 216 para 64 pixels e libera espaço para o mapa.
- O mesmo botão expande a navegação. Os ícones mantêm nomes acessíveis e tooltips.
- `Ctrl/Cmd+\` usa a mesma preferência do botão.
- A preferência é salva no navegador e permanece após edições, navegação e recarga.
- O tema e o controlador legado deixam o estado da sidebar nativa sob responsabilidade do React.
- No celular, a navegação inferior existente é preservada.

## Jornada

Cada etapa mostra seu nome, número e um menu `•••`. Detalhes, movimentação e exclusão ficam nesse menu. O arraste continua disponível ao passar o mouse ou usar foco de teclado.

Cada faixa possui um único menu de ações. **Propriedades** abre o painel de nome, cor, altura e tipo. As ações de duplicar, mover, ocultar e excluir permanecem nesse mesmo menu.

Os botões de adicionar cartões ficaram mais discretos; ações de duplicação, exclusão e arraste aparecem ao interagir com o cartão. Os controles continuam acessíveis por teclado e toque. A mudança de foco não desloca os controles durante o clique.

O retorno à biblioteca de Jornadas agora fica no próprio cabeçalho do mapa, eliminando a barra de retorno duplicada. A página do serviço continua disponível em **Visualizações → Voltar ao serviço**.

## Blueprint

O modo guiado abre com duas ferramentas: **Selecionar** e **Mão**. A criação de atividades acontece diretamente nas células; não exige escolher um objeto na biblioteca.

1. Use **Adicionar etapa** e descreva o momento da experiência.
2. Clique em uma célula, escreva a atividade e pressione **Enter**.
3. Use **Shift+Enter** para uma nova linha ou **Escape** para cancelar.
4. Complete o atendimento, os bastidores, os processos e os sistemas conforme necessário.

Uma célula vazia indica a próxima inclusão; as demais apresentam o controle ao passar o mouse ou receber foco. As camadas usam nomes compreensíveis, como **Atendimento ao cliente** e **Bastidores**. A estrutura de dados do Blueprint não muda.

O menu **Opções** reúne um guia de três passos, as visualizações e a importação/exportação. As ferramentas avançadas começam recolhidas. O modo profissional permanece disponível ali e restaura a barra completa de ferramentas.

O cabeçalho mantém a etapa, o histórico e o estado de salvamento. Apresentação, comandos e ações do documento ficam sob demanda. O minimapa não ocupa espaço no modo guiado de Blueprints com menos de quatro etapas. O painel de propriedades continua disponível pela edição contextual.

## Ações do projeto

Importar, exportar e salvar manualmente ficam no menu `•••` do cabeçalho da aplicação. O indicador de salvamento automático permanece visível. O menu fecha ao escolher uma ação, clicar fora ou pressionar Escape; nesse último caso o foco volta ao acionador.

## Verificação

```sh
npm run release:verify
npm run journey:browser
npm run editor:browser
```

Os testes cobrem o recolhimento, o atalho, a persistência da preferência, os menus contextuais, os backups, o guia inicial, a edição por clique na célula, a abertura das ferramentas avançadas e o retorno ao modo guiado. As regressões de cartões, histórico, vínculos, Blueprint e tamanhos de tela permanecem ativas. Defina `AXE_PATH` para incluir auditoria automatizada WCAG A/AA com o axe-core instalado.

Nesta entrega, passaram 64 verificações da Jornada e da navegação e 57 verificações de Whiteboard/Blueprint, além da verificação visual geral com dez capturas. O `release:verify` e o build final foram concluídos. A auditoria automatizada não encontrou violações WCAG A/AA nos cenários de editor avaliados; isso não substitui testes de uso com pessoas.

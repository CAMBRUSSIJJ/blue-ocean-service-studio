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

Os botões de adicionar cartões ficaram mais discretos; ações de duplicação, exclusão e arraste aparecem ao interagir com o cartão. Os controles continuam acessíveis por teclado e toque. A formatação de texto aparece apenas enquanto o cartão tem foco, sem manter uma barra de botões no mapa em repouso. A mudança de foco não desloca os controles durante o clique.

A Jornada abre diretamente em tela inteira, em uma superfície própria. Sidebar, cabeçalho do projeto, abas e breadcrumbs da aplicação ficam ocultos e fora da navegação por teclado. Uma barra de 56 pixels reúne retorno, título editável, salvamento e os comandos essenciais; no celular, ela usa 52 pixels. A matriz detalhada permanece disponível dentro dessa mesma superfície.

O menu **Visualizações** reúne o mapa livre, a matriz detalhada, a abertura do Blueprint e o retorno ao serviço. A seta no canto superior esquerdo retorna à biblioteca de Jornadas. Ao sair, a aplicação e o foco de teclado são restaurados; a preferência de sidebar recolhida permanece salva.

O grupo flutuante no canto inferior esquerdo reúne mão, desfazer/refazer e zoom. **H** ativa a mão, **V** retorna à edição e segurar **Espaço** permite mover o mapa temporariamente. Arrastar com a mão altera apenas a navegação. Clicar no percentual restaura 100%. O mapa continua utilizável por rolagem e toque; os formulários preservam seus atalhos de texto.

## Blueprint

O modo guiado abre com duas ferramentas: **Selecionar** e **Mão**. A criação de atividades acontece diretamente nas células; não exige escolher um objeto na biblioteca.

1. Use **Adicionar etapa** e descreva o momento da experiência.
2. Clique em uma célula, escreva a atividade e pressione **Enter**.
3. Use **Shift+Enter** para uma nova linha ou **Escape** para cancelar.
4. Complete o atendimento, os bastidores, os processos e os sistemas conforme necessário.

Uma célula vazia indica a próxima inclusão; as demais apresentam o controle ao passar o mouse ou receber foco. As camadas usam nomes compreensíveis, como **Atendimento ao cliente** e **Bastidores**. A estrutura de dados do Blueprint não muda.

O menu **Opções** reúne um guia de três passos, as visualizações e a importação/exportação. As ferramentas avançadas começam recolhidas. O modo profissional permanece disponível ali e restaura a barra completa de ferramentas.

O cabeçalho compacto mantém retorno, nome, criação de etapa, estado de salvamento e Opções. Seleção, mão, histórico e zoom ficam juntos em um grupo flutuante no canto inferior esquerdo, liberando a lateral do mapa. Apresentação, comandos e ações do documento ficam sob demanda. O minimapa não ocupa espaço no modo guiado de Blueprints com menos de quatro etapas. O painel de propriedades continua disponível pela edição contextual.

## Ações do projeto

Fora dos editores, importar, exportar e salvar manualmente ficam no menu `•••` do cabeçalho da aplicação. No Blueprint, a cópia do documento pode ser exportada pelo menu **Opções → Importar / Exportar**. Na Jornada, retorne ao serviço para exportar o backup completo do projeto. O indicador de salvamento automático permanece visível. O menu fecha ao escolher uma ação, clicar fora ou pressionar Escape; nesse último caso o foco volta ao acionador.

## Verificação

```sh
npm run release:verify
npm run journey:browser
npm run editor:browser
```

Os testes cobrem o recolhimento, o atalho, a persistência da preferência, os menus contextuais, os backups, o guia inicial, a edição por clique na célula, a abertura das ferramentas avançadas e o retorno ao modo guiado. As regressões de cartões, histórico, vínculos, Blueprint e tamanhos de tela permanecem ativas. Defina `AXE_PATH` para incluir auditoria automatizada WCAG A/AA com o axe-core instalado.

Os cenários também verificam a abertura em tela inteira por padrão, a ausência de navegação global, a contenção e restauração de foco, a matriz detalhada, o retorno ao serviço, a passagem para o Blueprint, a navegação com mão/Espaço, o zoom e a preservação dos dados. Os relatórios ficam em `artifacts/journey-editor` e `artifacts/editor-ux`. A auditoria automatizada WCAG A/AA pode ser habilitada com `AXE_PATH`; ela complementa a avaliação de usabilidade com pessoas.

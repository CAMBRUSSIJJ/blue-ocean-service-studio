# Jornada configurável 2.0

A Jornada mantém o grafo do serviço, a matriz detalhada e os recursos anteriores. Esta evolução melhora a construção visual e cobre os critérios do documento de análise enviado pelo usuário.

## Auditoria funcional

O fluxo foi reproduzido no Chromium com um projeto local novo, criado pela interface.

| Verificação | Constatação e tratamento |
| --- | --- |
| Alternância espontânea para a página inicial | Não reproduzida durante as edições testadas. O texto recebido também descreve duas faixas estáveis na sua cronologia; não foi assumida uma causa sem reprodução. |
| Persistência de faixas e cartões | Os dados sobreviveram à recarga. Foram acrescentadas verificações de conteúdo, ordem, tipos e dimensões. |
| Primeira etapa por mouse | O formulário excedia a altura da primeira linha e podia ficar encoberto. A linha agora acompanha a altura do conteúdo. |
| Desfazer e refazer | A interface consultava o histórico React, reiniciado após atualizações da ponte. Agora consulta o histórico que efetivamente executa as transações. |
| Clique e arraste após editar um cartão | A remoção da barra de formatação no evento de saída de foco deslocava os controles antes do clique. A seleção do cartão mantém as ferramentas estáveis. |
| Coluna fixa em telas estreitas | Seu tamanho mínimo podia ultrapassar a coluna do grid e encobrir o formulário. A largura agora acompanha a identificação das faixas. |
| Rodapé e zoom | O editor usa a área disponível da janela e considera a navegação inferior no celular. |

## Recursos entregues

- Jornada em branco sem etapas ou faixas obrigatórias; modelos continuam opcionais e editáveis.
- Título editável com confirmação por Enter ou saída do campo; Escape cancela.
- Nomes automáticos distintos: `Nova Jornada`, `Nova Jornada (2)` e assim por diante. Nomes escolhidos pelo usuário são preservados.
- Etapas principais editáveis, reorganizáveis e removíveis. A exclusão de uma etapa e suas células compõe uma única operação de histórico.
- Faixas com nome livre, duplicação, reordenação, ocultação, restauração e exclusão com confirmação.
- Painel de propriedades com seis cores, seis alturas mínimas e troca de tipo. Faixas vinculadas mantêm o tipo que corresponde ao dado compartilhado.
- Larguras de etapa compacta, normal, ampla e extra ampla, persistidas no mapa.
- Miniaturas da biblioteca construídas a partir das etapas e faixas salvas; capas personalizadas existentes têm prioridade.
- Identificação das faixas fixa na rolagem horizontal e cabeçalhos de etapa fixos na rolagem vertical.
- Menus com ações escritas, foco visível, nomes acessíveis e painel contextual adaptado a telas menores.

| Tipo | Comportamento |
| --- | --- |
| Texto | Vários cartões editáveis por célula, duplicação, remoção, formatação e movimentação. |
| Subetapas | Cartões numerados dentro de cada etapa principal. |
| Lista de verificação | Cartões com conclusão persistida individualmente. |
| Ícones | Escolha persistida de ícone por cartão. |
| Imagem | Referência HTTP/HTTPS com prévia da imagem. |
| Link de referência | URL externa com ação para abrir o conteúdo. |
| Divisor | Separação visual horizontal. |
| Emoções | Atualiza a emoção da etapa do serviço. |

Cartões podem ser arrastados entre células de faixas livres. `Alt+↑/↓` reorganiza cartões na célula. `Ctrl/Cmd+Z` e `Ctrl/Cmd+Shift+Z` controlam o histórico quando o foco está fora de campos de texto. Dentro de um campo, o histórico de texto do navegador continua disponível.

## Integração com o serviço e Blueprint

As faixas de ações do cliente, pensamentos, necessidades, dores e pontos de contato usam os registros compartilhados. A duplicação dessas faixas mantém seus vínculos; a duplicação de faixas livres cria identidades independentes para os cartões.

O painel da etapa permite registrar pessoa, necessidade, dor ou evidência durante a construção; necessidades, dores e evidências podem ser vinculadas à etapa selecionada. Também permite relacionar necessidades, problemas validados e evidências já presentes no contexto da Jornada, além de administrar pontos de contato. Desvincular ou excluir uma faixa não apaga os registros do serviço.

O botão **Blueprint** abre ou reutiliza um rascunho ligado à mesma Jornada. As etapas e ações do cliente são compartilhadas. Faixas e cartões livres permanecem na Jornada. O rascunho não inventa pesquisa, ações visíveis, bastidores ou sistemas e não declara prontidão operacional. A preparação formal do Blueprint na matriz detalhada mantém suas regras de completude.

## Salvamento e limites

Neste fluxo, **Salvo neste dispositivo** significa armazenamento no navegador. Não representa sincronização na nuvem. A recarga retorna à navegação inicial da aplicação; o projeto pode ser retomado sem perder o mapa salvo. Use a exportação de backup existente para guardar outra cópia.

As transações de faixas usam o documento mais recente, preservando ajustes de layout e edições anteriores. O histórico tem o limite de sessão já existente de 80 estados; não se apresenta como histórico permanente entre dispositivos. Imagens e links dependem da disponibilidade do endereço informado. O tipo de link oferece referência externa, sem prometer incorporação interativa de serviços de terceiros.

Sincronização autenticada entre dispositivos, edição simultânea com resolução de conflitos e histórico compartilhado permanente continuam como trabalho de produto e infraestrutura. Não foram simulados com um indicador visual de salvamento.

## Verificação reproduzível

Use Node 22 e as dependências do lockfile:

```sh
npm ci
npm run journey:layout:test
npm run journey:a2:test
npm run journey:h1709:move:test
npm run journey:h1709:test
npm run journey:h1709:p3:test
npm run release:verify
python3 -m pip install playwright
python3 -m playwright install chromium
npm run journey:browser
npm run editor:browser
```

O teste de navegador usa `dist` por padrão. Para uma instância em execução, defina `BLUE_OCEAN_URL`. `CHROMIUM_PATH` permite escolher um navegador instalado. A variável opcional `AXE_PATH` habilita a auditoria automatizada WCAG A/AA com uma instalação local do axe-core.

Os resultados e capturas ficam em `artifacts/journey-editor`. O teste cobre operações pela interface, dados efetivamente salvos, múltiplas ações de histórico, recarga, navegação, Blueprint, modelos e telas de 1440, 820 e 390 pixels. As verificações automatizadas não substituem avaliação de uso com pessoas.

## Resultado desta entrega

- `release:verify` concluído com sucesso, incluindo os contratos acumulados, TypeScript, build e integridade da distribuição.
- 56 verificações da Jornada aprovadas no build de produção, incluindo auditoria automatizada WCAG A/AA sem violações nos três cenários de editor avaliados.
- 50 verificações de regressão de Whiteboard e Blueprint aprovadas.
- Testes comportamentais anteriores da Jornada, testes das novas operações e seleção para Blueprint aprovados.
- Verificação visual geral aprovada, com dez capturas.

Próximas prioridades para o produto comercial: sincronização autenticada e recuperação entre dispositivos; colaboração simultânea e tratamento de conflitos; exportação visual da Jornada; agrupamento de faixas e validação com usuários de diferentes equipes. Essas evoluções precisam preservar as transações e os vínculos canônicos já testados nesta versão.

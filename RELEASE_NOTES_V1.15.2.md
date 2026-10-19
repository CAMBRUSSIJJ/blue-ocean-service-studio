# BLUE OCEAN Service Studio — V1.15.2 Precision Studio Shell

## Objetivo

Consolidar uma moldura visual mais próxima de software profissional de criação e trabalho antes da reconstrução do Journey Workspace 3.0. Esta versão é deliberadamente de **layout e infraestrutura visual**: não altera schemas, dados, relações ou persistência do Service Graph.

## Mudanças principais

### App Shell
- Sidebar reduzida de 244 px para 216 px.
- Modo recolhido de 60 px com preferência persistente no navegador.
- Atalho `Ctrl/Cmd + \\` para alternar a sidebar.
- Header reduzido para 48 px.
- Descrições permanentes removidas do header para devolver espaço ao trabalho.
- Ações secundárias passam a ter tratamento de ícone discreto.
- Busca global e `+ Criar` permanecem como comandos principais.

### Precision UI
- Canvas neutro `#F7F8FA`.
- Superfícies brancas, bordas `#E3E7ED` e texto principal `#172033`.
- Menos sombras, gradientes, pills e cardificação.
- Radius reduzido e densidade ajustada para ambiente de trabalho.
- Estados ativos na sidebar passam a ser mais discretos, com indicador azul de 2 px.

### Workspace Home
- Hero transformado em cabeçalho editorial plano.
- KPIs agrupados numa única faixa, em vez de quatro cards independentes.
- Painéis e listas com menos elevação e menor espaçamento.
- Coluna secundária mais estreita para priorizar o conteúdo central.

### Global Navigation
- Command palette mais compacta e neutra.
- Resultados com menor altura e seleção menos chamativa.
- Mantidos `Ctrl/Cmd + K`, `/`, teclado e deep-links da V1.15.0.

### Universal Inspector Foundation
Nova API visual, inicialmente sem forçar nenhum módulo a usá-la:

```js
window.RealTalentRuntime.api('precisionStudio').openInspector({
  type: 'Touchpoint',
  title: 'WhatsApp',
  sections: [
    { title: 'Propriedades', fields: [
      { label: 'Canal', value: 'Mensagem' },
      { label: 'Etapa', value: 'Avaliação' }
    ] }
  ]
})
```

O Inspector usa 320 px e só aparece quando solicitado. Assim, Journey, Blueprint, Whiteboard, Pesquisa e Improvement podem convergir para o mesmo padrão de edição contextual.

### Context Toolbar Foundation
Nova API para ferramentas flutuantes de seleção:

```js
window.RealTalentRuntime.api('precisionStudio').showToolbar([
  { label: 'Duplicar', onClick() {} },
  { separator: true },
  { label: 'Converter', onClick() {} }
])
```

A toolbar fica oculta por padrão e foi criada para seleção múltipla, Whiteboard, Journey e objetos visuais futuros.

## Compatibilidade

Preservados:
- Service Graph e IDs existentes;
- chaves de persistência;
- Runtime Registry;
- Workspace Home V1.14;
- Global Navigation V1.15;
- Build Pipeline Recovery V1.15.1;
- módulos legados `rt*`.

## Próximo ciclo

**V1.16.0 — Journey Workspace 3.0**, já construído sobre o Precision Studio Shell, usando Inspector Universal e toolbar contextual.

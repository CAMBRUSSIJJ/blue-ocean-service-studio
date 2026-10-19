# Design System + Global Shell — V1.8.1

## Tokens base

- Primary: `#04342C`
- Accent: `#1D9E75`
- Surface: `#F1EFE8`
- Text: `#2C2C2A`
- Header: `56px`
- Sidebar: `240px`
- Inspector: `344px`
- Radius pequeno: `6px`
- Radius médio: `10px`
- Radius grande: `14px`

## Arquitetura de interface

1. **Global Shell** — marca, sidebar, navegação e topbar.
2. **Module Home** — lista, busca, filtros, recentes, favoritos e ação de criar.
3. **Editor Shell** — contexto, Views, canvas, toolbar, Inspector e controles de canvas.

A V1.8.1 implementa o Global Shell e padroniza o Editor Shell. A Module Home entra no ciclo seguinte.

## Editor Shell

O header do Whiteboard deixa de apresentar todas as capacidades simultaneamente. Ações frequentes permanecem visíveis; capacidades de administração ficam no menu `•••` ou Command Palette.

Toolbar principal:

- Selecionar
- Mão
- Adicionar
- Texto
- Post-it
- Card
- Conexão
- Frame
- Buscar
- Camadas

## Regra de produto

Nenhum módulo novo deve introduzir cores, espaçamentos, tipos de botão, drawers ou modais próprios sem passar pelos tokens do Design System.
